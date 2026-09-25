import json
import logging
import base64
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import Optional
import plivo
from src.config import Config
from src.db.connection import get_db
from src.models.call_model import CallRecord, InitiateCallRequest
from src.models.call_session_model import CallSessionModel, CallStatus
from src.services.lead_guardrails import (
    sanitize_guest_name,
    validate_lead_content,
    clean_lead_for_ai,
)

logger = logging.getLogger(__name__)


class CallService:
    def __init__(self):
        self.client = plivo.RestClient(
            auth_id=Config.PLIVO_AUTH_ID, auth_token=Config.PLIVO_AUTH_TOKEN
        )
        self.db = get_db()

    def build_hotel_knowledge_brief(self, hotel_id: str) -> Optional[str]:
        """
        Queries ai_voice_assistant.hotels collection by hotel_id and compiles
        the full property data into the `hotel_knowledge_brief` context string.

        Pipeline:
          1. DB query  : ai_voice_assistant.hotels.find_one({ hotel_id: hotel_id })
          2. Pydantic  : HotelModel(**doc) — validates & structures the document
          3. Compile   : HotelModel.compile_ai_context() — renders natural-language brief
          4. Return    : structured string labelled [hotel_knowledge_brief]

        Returns None if no active hotel is found for the given hotel_id.
        """
        from src.services.hotel_service import HotelService
        hotel_svc = HotelService()
        return hotel_svc.get_compiled_context(hotel_id)

    def _build_dynamic_context(self, data: InitiateCallRequest, hotel_knowledge_brief: Optional[str] = None, hotel_name: str = "Hotel Reservations") -> str:
        """Assembles the structured dynamic context payload injected into the Plivo CX AI Agent.

        Structure (three clearly labelled sections):
          1. [hotel_knowledge_brief]  — full property data from ai_voice_assistant.hotels
          2. [guest_profile]          — guest name + their specific query / issue
          3. [call_boundaries]        — hard guardrails that override all other instructions

        Keeping the sections distinct lets the AI:
          • Know WHO it is calling (guest name, so it greets correctly)
          • Know WHY it is calling (the guest's query, so it stays on-topic)
          • Know WHAT to answer from (hotel_knowledge_brief only, not hallucinated data)
          • Know WHAT it must never do (no fake transfers, no off-topic promises)
        """
        parts = []

        # ── Section 1: hotel_knowledge_brief ─────────────────────────────────────
        # Compiled from ai_voice_assistant.hotels collection via hotel_id lookup.
        # Goes first so the AI has full property context before reading the guest query.
        if hotel_knowledge_brief:
            parts.append(
                "Use the following verified property information to answer any guest questions "
                "about rooms, rates, amenities, check-in/check-out, dining, or policies. "
                "Do NOT invent details not listed here.\n\n"
                + hotel_knowledge_brief.strip()
            )

        # ── Section 2: lead_profile ──────────────────────────────────────────────
        # Clearly identifies the potential guest (lead) and their booking inquiry/interest.
        lead_info = (data.guest_lead or "").strip()
        lead_lines = []
        if data.guest_name:
            lead_lines.append(f"Prospective Guest / Lead Name : {data.guest_name}")
        if lead_info:
            lead_lines.append(f"Booking Inquiry / Lead Details: {lead_info}")

        if lead_lines:
            parts.append(
                "=== [lead_profile] ===\n"
                + "\n".join(lead_lines) + "\n\n"
                "OBJECTIVE: This is a proactive hotel booking follow-up call to a prospective guest (lead).\n"
                "1. Greet the guest warmly by their name and mention you are following up on their booking inquiry.\n"
                "2. Understand their travel dates, number of guests, and room type preferences.\n"
                "3. Use the [hotel_knowledge_brief] to share accurate room details, rates, amenities, and policies.\n"
                "4. Answer any questions or doubts they have, highlight relevant perks or experiences, and assist them in finalizing their room reservation."
            )

        # ── Section 3: call_boundaries (hard guardrails) ─────────────────────────
        # Always appended last so they override everything above.
        boundaries = []

        if data.guest_name:
            boundaries.append(
                f"RULE — GREETING: Always begin the call by greeting {data.guest_name} by name "
                f"and introducing yourself from {hotel_name} "
                f"(e.g. 'Namaste {data.guest_name} ji, main {hotel_name} se bol rahi hoon.'). "
                "Never start with a generic 'Hello' or 'Hi there'. Default language is Hindi/Hinglish."
            )

        boundaries.append(
            "RULE — NO TRANSFERS: You CANNOT transfer, forward, or connect this call to any "
            "person, department, or team. Do not promise or imply a call transfer. "
            "Instead, acknowledge the guest's concern, assist where you can from the "
            "hotel_knowledge_brief, and assure them our reservations team will confirm all details."
        )

        boundaries.append(
            "RULE — STAY ON-TOPIC: Only answer questions using information from the "
            "hotel_knowledge_brief and Lead Details above. If you genuinely do not know, say: "
            "'I don't have that specific detail right now, but our reservation desk will follow up with you.'"
        )

        parts.append("=== [call_boundaries] ===\n" + "\n\n".join(boundaries))

        return "\n\n".join(parts) if parts else "You are a professional hotel reservation and lead follow-up specialist for StayChat."

    def _trigger_plivo_cx(self, to_number: str, plivo_params: dict) -> dict:
        """
        Dispatches HTTP POST to Plivo CX Flow endpoint with Basic Auth.

        Sends named variables as separate keys so Plivo instructions can reference
        each one individually via {{Start.http.params.<key>}}:

          to_number             → the destination phone number
          hotel_name            → the exact property name (e.g. Hotel Sahu)
          hotel_knowledge_brief → compiled hotel data from ai_voice_assistant.hotels
          guest_name            → the prospective guest being called (sanitized)
          guest_lead            → cleaned booking enquiry details (operator meta-instructions stripped)
        """
        payload_dict = {"to_number": to_number, **plivo_params}
        payload = json.dumps(payload_dict).encode("utf-8")
        credentials = base64.b64encode(
            f"{Config.PLIVO_AUTH_ID}:{Config.PLIVO_AUTH_TOKEN}".encode("utf-8")
        ).decode("utf-8")

        req = urllib.request.Request(
            Config.PLIVO_OUTBOUND_API_URL,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {credentials}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                body = res.read().decode("utf-8")
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as e:
            err_msg = e.read().decode("utf-8") if e.fp else str(e)
            logger.error("Plivo CX API HTTP Error %s: %s", e.code, err_msg)
            raise RuntimeError(f"Plivo API returned {e.code}: {err_msg}")


    def check_recent_calls(self, to_number: str, cooldown_minutes: int = 15) -> bool:
        """
        Checks if the destination phone was called recently within cooldown_minutes
        (ignoring failed connection attempts) to prevent duplicate harassment.
        """
        if not to_number:
            return False
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=cooldown_minutes)
        existing = self.db.calls.find_one({
            "to_number": to_number,
            "created_at": {"$gte": cutoff},
            "status": {"$nin": ["failed", CallStatus.FAILED.value]},
        })
        return existing is not None

    def make_call(self, data: InitiateCallRequest, bypass_dedup: bool = False) -> dict:
        """
        Triggers Plivo CX Flow and saves the initiated session in MongoDB.

        Sends named variables to Plivo CX (accessible as {{Start.http.params.<key>}}):
          • hotel_name             — exact property name (e.g. Hotel Sahu)
          • hotel_knowledge_brief  — full hotel data compiled from ai_voice_assistant.hotels
          • guest_name             — the person being called (sanitized)
          • guest_lead             — sanitized, structured booking enquiry details
        """
        # ── Step 0: Lead Content Validation & Name Sanitization ───────────────────
        is_valid, rejection_reason = validate_lead_content(data.guest_lead or "")
        if not is_valid:
            logger.error("Rejecting call to %s due to prohibited lead content: %s", data.to_number, rejection_reason)
            raise ValueError(f"Prohibited lead content: {rejection_reason}")

        cleaned_guest_name, name_warnings = sanitize_guest_name(data.guest_name or "")
        if name_warnings:
            logger.warning("Sanitized guest name '%s' -> '%s': %s", data.guest_name, cleaned_guest_name, name_warnings)

        # ── Step 0.5: Deduplication Check ─────────────────────────────────────────
        if not bypass_dedup and self.check_recent_calls(data.to_number, cooldown_minutes=15):
            msg = f"Duplicate call blocked: {data.to_number} was already called within the last 15 minutes."
            logger.warning(msg)
            raise ValueError(msg)

        hotel_snapshot = None
        hotel_knowledge_brief = None
        hotel_name = "Hotel Reservations"

        # ── Step 1: Compile hotel_knowledge_brief from DB (Fail-Safe) ─────────────
        if data.hotel_id:
            from src.services.hotel_service import HotelService
            hotel_svc = HotelService()
            hotel_doc = hotel_svc.get_hotel(data.hotel_id)
            if not hotel_doc:
                raise ValueError(f"Hotel with ID '{data.hotel_id}' not found or inactive. Cannot initiate call without property context.")

            hotel_name = hotel_doc.get("name", "Hotel Reservations")
            hotel_knowledge_brief = self.build_hotel_knowledge_brief(data.hotel_id)
            if not hotel_knowledge_brief:
                raise ValueError(f"Failed to compile AI knowledge brief for hotel '{hotel_name}' ({data.hotel_id}).")

            hotel_snapshot = {
                "hotel_id": data.hotel_id,
                "name": hotel_name,
                "star_rating": hotel_doc.get("star_rating"),
                "property_type": hotel_doc.get("property_type"),
                "compiled_context_snapshot": hotel_knowledge_brief,
            }
            logger.info(
                "hotel_knowledge_brief compiled for hotel_id=%s (%s)",
                data.hotel_id,
                hotel_name,
            )

        # ── Step 2: Build AI-clean lead content & named Plivo params ──────────────
        lead_content = clean_lead_for_ai(data.guest_lead, hotel_name=hotel_name)

        plivo_params = {
            "hotel_name": hotel_name,
            "hotel_knowledge_brief": hotel_knowledge_brief or f"{hotel_name} reservation specialist. Answer questions politely.",
            "guest_name": cleaned_guest_name,
            "guest_lead": lead_content,
        }

        # ── Step 3: Build flat context string for DB audit log ────────────────────
        # Update request object with cleaned values for context building
        clean_request_data = data.model_copy(update={"guest_name": cleaned_guest_name, "guest_lead": lead_content})
        context_for_db = self._build_dynamic_context(
            clean_request_data, hotel_knowledge_brief=hotel_knowledge_brief, hotel_name=hotel_name
        )

        logger.info(
            "Triggering Plivo CX | guest=%s | hotel=%s | params_keys=%s",
            cleaned_guest_name,
            hotel_name,
            list(plivo_params.keys()),
        )

        # ── Step 4: Trigger CX Flow with named params ─────────────────────────────
        resp_json = self._trigger_plivo_cx(to_number=data.to_number, plivo_params=plivo_params)
        trigger_id = str(resp_json.get("api_id") or resp_json.get("trigger_id") or "")

        # ── Step 5: Persist call session ──────────────────────────────────────────
        session = CallSessionModel(
            trigger_id=trigger_id,
            guest_name=cleaned_guest_name,
            from_number=data.from_number,
            to_number=data.to_number,
            persona=data.persona or "lead_followup",
            guest_lead=lead_content,
            context=context_for_db,
            status=CallStatus.INITIATED,
            hotel=hotel_snapshot,
        )
        self.db.calls.insert_one(session.to_mongo())

        return {
            "success": True,
            "trigger_id": trigger_id,
            "message": resp_json.get("message", "CX Flow triggered successfully"),
            "data": resp_json,
        }



    def handle_hangup_event(self, event_data: dict):
        """
        Comprehensive Hangup Handler (State Machine):
        Accurately evaluates and transitions call documents for all possible scenarios:
          1. Call answered, spoke, user hung up -> status: "completed", source: "customer"
          2. Call answered, spoke, AI agent hung up -> status: "completed", source: "agent"
          3. Phone rang and user pressed decline/cut within seconds -> status: "rejected", reason: "user-rejected"
          4. Phone rang until timeout / not picked up -> status: "no-answer", reason: "no-answer"
          5. Destination line was busy -> status: "busy", reason: "busy"
          6. Telephony / network carrier error -> status: "failed", reason: "error"
        """
        obj = event_data.get("data", {}).get("object", {}) if isinstance(event_data.get("data"), dict) else {}
        sub = obj.get("event_data", {}) if isinstance(obj.get("event_data"), dict) else {}

        # 1. Correlation Identifiers
        flow_run_id = obj.get("flow_run_uuid") or sub.get("Start.flow_run_id") or event_data.get("flow_run_uuid")
        call_uuid = obj.get("call_uuid") or sub.get("Outbound Call.uuid") or event_data.get("CallUUID")

        # 2. Raw Signal Extraction
        raw_call_status = str(sub.get("Outbound Call.call_status") or "").strip().lower()
        raw_hangup_source = str(sub.get("hangup_source") or event_data.get("HangupSource") or "").strip().lower()
        raw_hangup_cause = str(event_data.get("HangupCause") or sub.get("hangup_cause") or "").strip().upper()

        duration_raw = sub.get("call_duration", 0)
        try:
            duration = int(duration_raw)
        except (ValueError, TypeError):
            duration = 0

        # 3. State Machine Resolution
        # Case A: User answered and conversation occurred
        if duration > 0:
            status = "completed"
            term_source = "agent" if raw_hangup_source == "agent" else "customer"
            term_reason = "normal-clearing"

        # Case B: Call was declined / cut while ringing
        # Plivo signals: HangupCause = CALL_REJECTED or USER_BUSY, or customer/user-initiated hangup
        # with no-answer call_status (some carriers)
        elif (
            raw_hangup_cause in ["CALL_REJECTED", "USER_BUSY"]
            or raw_call_status in ["rejected"]
            or (raw_call_status == "no-answer" and raw_hangup_source in ["customer", "user"])
        ):
            status = "rejected"
            term_source = "customer"
            term_reason = "user-rejected"

        # Case C: Destination was Busy
        elif raw_call_status == "busy" or raw_hangup_cause in ["BUSY"]:
            status = "busy"
            term_source = "system"
            term_reason = "busy"

        # Case D: Rang to completion without pickup (No Answer / Timeout)
        # hangup_source == "agent" here means Plivo's own flow timed out waiting — not the user declining
        elif raw_call_status == "no-answer" or raw_hangup_cause in ["NO_ANSWER", "TIMEOUT"]:
            status = "no-answer"
            term_source = "agent" if raw_hangup_source == "agent" else "system"
            term_reason = "no-answer"

        # Case E: Carrier or Telecom Failure
        elif raw_call_status == "failed" or "ERROR" in raw_hangup_cause or "FAILED" in raw_hangup_cause:
            status = "failed"
            term_source = "system"
            term_reason = raw_hangup_cause.lower() or "error"

        # Fallback default
        else:
            status = "no-answer"
            term_source = raw_hangup_source or "system"
            term_reason = raw_call_status or "unknown"

        # 4. Atomic document updates
        update_fields = {
            "status": status,
            "termination.source": term_source,
            "termination.reason": term_reason,
            "termination.duration_seconds": duration,
            "updated_at": datetime.now(timezone.utc),
            # Flat backward-compatibility aliases for UI
            "duration": duration,
            "hangup_source": term_source,
            "hangup_cause": term_reason,
            # Raw Plivo signals — persisted so the UI can discriminate
            # declined (CALL_REJECTED) vs rang-out (NO_ANSWER) definitively
            "raw_plivo_hangup_cause": raw_hangup_cause,    # e.g. "CALL_REJECTED", "NO_ANSWER", "NORMAL_CLEARING"
            "raw_plivo_call_status": raw_call_status,      # e.g. "no-answer", "answered", "busy"
            "raw_plivo_hangup_source": raw_hangup_source,  # e.g. "customer", "agent", "user"
        }

        if call_uuid:
            update_fields["call_uuid"] = call_uuid
        if obj.get("conversation_id"):
            update_fields["conversation_id"] = obj["conversation_id"]
        if obj.get("conversation_url"):
            update_fields["conversation_url"] = obj["conversation_url"]
        if obj.get("flow_name"):
            update_fields["flow_name"] = obj["flow_name"]
        if sub.get("Outbound Call.bill_rate"):
            update_fields["cost.rate_per_min"] = float(sub["Outbound Call.bill_rate"])
            update_fields["bill_rate"] = str(sub["Outbound Call.bill_rate"])

        # 5. Execute targeted MongoDB update
        query = {"$or": []}
        if flow_run_id:
            query["$or"].extend([{"trigger_id": flow_run_id}, {"request_uuid": flow_run_id}])
        if call_uuid:
            query["$or"].append({"call_uuid": call_uuid})

        if query["$or"]:
            res = self.db.calls.update_one(query, {"$set": update_fields})
            logger.info(
                "Call %s updated: status='%s', source='%s', reason='%s', matched=%s",
                flow_run_id or call_uuid,
                status,
                term_source,
                term_reason,
                res.matched_count,
            )

    def _parse_plivo_transcript(self, raw_text: str) -> list:
        """
        Parses Plivo flat transcript format:
        '[Customer] Hello?\n[Ai_Agent] Yes, how can I help you?'
        into structured turns: [{'speaker': 'user'|'agent', 'text': '...'}]
        """
        if not raw_text or not isinstance(raw_text, str):
            return []

        import re
        turns = []
        pattern = re.compile(r'\[(Customer|Ai_Agent)\]\s*(.*?)(?=\[(?:Customer|Ai_Agent)\]|$)', re.DOTALL)
        for match in pattern.finditer(raw_text):
            role_raw = match.group(1)
            turn_text = match.group(2).strip()
            if turn_text:
                turns.append({
                    "speaker": "user" if role_raw == "Customer" else "agent",
                    "text": turn_text,
                    "timestamp": None,
                })
        return turns

    def handle_recording_event(self, event_data: dict):
        """
        Processes Plivo Recording & Transcription webhook:
        - Extracts recording URL and duration
        - Extracts AI transcript and conversation dialogue turns
        - Extracts post-call summary
        - Updates MongoDB atomically with only needed fields
        """
        obj = event_data.get("data", {}).get("object", {}) if isinstance(event_data.get("data"), dict) else {}
        sub = obj.get("event_data", {}) if isinstance(obj.get("event_data"), dict) else {}

        # 1. Identifiers
        call_uuid = (
            obj.get("call_uuid")
            or event_data.get("CallUUID")
            or event_data.get("call_uuid")
            or sub.get("Outbound Call.uuid")
        )
        flow_run_id = obj.get("flow_run_uuid") or sub.get("Start.flow_run_id") or event_data.get("flow_run_uuid")

        # 2. Recording Telemetry
        recording_url = (
            sub.get("recording_url")
            or event_data.get("RecordingURL")
            or event_data.get("recording_url")
        )
        recording_uuid = sub.get("recording_uuid") or event_data.get("RecordingUUID")
        try:
            rec_duration = int(sub.get("recording_duration") or event_data.get("RecordingDuration") or 0)
        except (ValueError, TypeError):
            rec_duration = 0

        # 3. AI Artifacts: Transcript & Summary
        raw_transcript = (
            sub.get("transcription")
            or sub.get("transcript")
            or event_data.get("transcription")
            or event_data.get("transcript")
            or ""
        )
        # Plivo sends conversation_summary in recording event_data
        raw_summary = (
            sub.get("conversation_summary")
            or event_data.get("conversation_summary")
            or sub.get("summary")
            or event_data.get("summary")
            or sub.get("Summary")
            or ""
        )

        # Parse turn-by-turn dialogue from Plivo flat transcript or structured list
        parsed_conversation = []
        raw_conversation = sub.get("conversation") or event_data.get("conversation")
        if isinstance(raw_conversation, list):
            for turn in raw_conversation:
                speaker = "agent" if "agent" in str(turn.get("role") or turn.get("speaker") or "").lower() else "user"
                text = str(turn.get("content") or turn.get("text") or "").strip()
                if text:
                    parsed_conversation.append({"speaker": speaker, "text": text})
        elif raw_transcript:
            parsed_conversation = self._parse_plivo_transcript(raw_transcript)

        # 4. Atomic MongoDB Update
        update_fields = {
            "recording.url": recording_url,
            "recording.uuid": recording_uuid,
            "recording.duration_seconds": rec_duration,
            "updated_at": datetime.now(timezone.utc),
            # Flat aliases for UI compatibility
            "recording_url": recording_url,
            "recording_uuid": recording_uuid,
            "recording_duration": rec_duration,
        }

        # If call duration was not set or was 0, sync duration with recording length
        if rec_duration > 0:
            update_fields["duration"] = rec_duration
            update_fields["termination.duration_seconds"] = rec_duration

        if raw_transcript:
            update_fields["ai.transcript_text"] = raw_transcript
            update_fields["transcript"] = raw_transcript
        if raw_summary:
            update_fields["ai.summary"] = raw_summary
            update_fields["summary"] = raw_summary
        if parsed_conversation:
            update_fields["ai.conversation"] = parsed_conversation

        query = {"$or": []}
        if call_uuid:
            query["$or"].append({"call_uuid": call_uuid})
        if flow_run_id:
            query["$or"].extend([{"trigger_id": flow_run_id}, {"request_uuid": flow_run_id}])

        if query["$or"]:
            res = self.db.calls.update_one(query, {"$set": update_fields})
            logger.info("Recording saved for call %s: matched=%s", call_uuid or flow_run_id, res.matched_count)

    def handle_transcript_event(self, event_data: dict):
        """
        Processes conversation transcripts & summaries pushed by Plivo CX AgentFlow:
        - Matches by call_uuid, conversation_id, or trigger_id/flow_run_id
        - Normalizes raw text vs turn-by-turn lists
        - Updates nested ai.* artifacts and flat UI aliases atomically
        """
        if not isinstance(event_data, dict):
            return

        # 1. Identifiers
        call_uuid = event_data.get("call_uuid") or event_data.get("CallUUID")
        conversation_id = event_data.get("conversation_id") or event_data.get("ConversationID")
        flow_run_id = event_data.get("flow_run_id") or event_data.get("trigger_id")

        # 2. Extract transcript & summary
        raw_transcript = event_data.get("transcript") or event_data.get("transcription") or ""
        raw_summary = event_data.get("summary") or ""
        raw_conversation = event_data.get("conversation")

        parsed_conversation = []
        transcript_text = ""

        # Handle list of turns or serialized JSON
        if isinstance(raw_conversation, str) and raw_conversation.strip().startswith("["):
            try:
                import json
                raw_conversation = json.loads(raw_conversation)
            except Exception:
                pass

        if isinstance(raw_conversation, list):
            turn_lines = []
            for turn in raw_conversation:
                if isinstance(turn, dict):
                    role = str(turn.get("role") or turn.get("speaker") or "user").lower()
                    speaker = "agent" if "agent" in role or "bot" in role else "user"
                    text = str(turn.get("content") or turn.get("text") or "").strip()
                    if text:
                        parsed_conversation.append({"speaker": speaker, "text": text})
                        turn_lines.append(f"{'StayChat AI' if speaker == 'agent' else 'User'}: {text}")
            if turn_lines and not raw_transcript:
                transcript_text = "\n".join(turn_lines)

        if not transcript_text:
            transcript_text = str(raw_transcript).strip()

        if not parsed_conversation and transcript_text:
            parsed_conversation = self._parse_plivo_transcript(transcript_text)

        # 3. Build atomic update dictionary
        update_fields = {
            "updated_at": datetime.now(timezone.utc),
        }

        if transcript_text:
            update_fields["ai.transcript_text"] = transcript_text
            update_fields["transcript"] = transcript_text
        if raw_summary:
            update_fields["ai.summary"] = str(raw_summary).strip()
            update_fields["summary"] = str(raw_summary).strip()
        if parsed_conversation:
            update_fields["ai.conversation"] = parsed_conversation
        if conversation_id:
            update_fields["conversation_id"] = str(conversation_id).strip()

        # 4. Execute atomic update
        query = {"$or": []}
        if call_uuid:
            query["$or"].append({"call_uuid": call_uuid})
        if conversation_id:
            query["$or"].append({"conversation_id": conversation_id})
        if flow_run_id:
            query["$or"].extend([{"trigger_id": flow_run_id}, {"request_uuid": flow_run_id}])

        if query["$or"]:
            res = self.db.calls.update_one(query, {"$set": update_fields})
            logger.info(
                "Transcript event processed for call (call_uuid=%s, conv_id=%s): matched=%s",
                call_uuid,
                conversation_id,
                res.matched_count,
            )