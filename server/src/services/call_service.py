import json
import logging
import base64
import urllib.request
import urllib.error
from datetime import datetime, timezone
import plivo
from src.config import Config
from src.db.connection import get_db
from src.models.call_model import CallRecord, InitiateCallRequest
from src.models.call_session_model import CallSessionModel, CallStatus

logger = logging.getLogger(__name__)


class CallService:
    def __init__(self):
        self.client = plivo.RestClient(
            auth_id=Config.PLIVO_AUTH_ID, auth_token=Config.PLIVO_AUTH_TOKEN
        )
        self.db = get_db()

    def _build_dynamic_context(self, data: InitiateCallRequest, hotel_context: Optional[str] = None) -> str:
        """Assembles hotel knowledge base, prompt, and metadata into the conversation context."""
        parts = []
        if hotel_context:
            parts.append(hotel_context)
            parts.append("----------------------------------------")
        if data.username:
            parts.append(f"Guest/Client Name: {data.username}")
        if data.persona:
            parts.append(f"Persona/Role: {data.persona}")
        if data.prompt:
            parts.append(f"Instructions & Goals: {data.prompt}")
        return "\n\n".join(parts) if parts else "You are an AI voice assistant for StayChat."

    def _trigger_plivo_cx(self, to_number: str, context: str) -> dict:
        """Dispatches HTTP POST to Plivo CX Flow endpoint with Basic Auth."""
        payload = json.dumps({"to_number": to_number, "context": context}).encode("utf-8")
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

    def make_call(self, data: InitiateCallRequest) -> dict:
        """Triggers Plivo CX Flow and saves the initiated session in MongoDB."""
        hotel_snapshot = None
        hotel_context_str = None

        if data.hotel_id:
            from src.services.hotel_service import HotelService
            hotel_svc = HotelService()
            hotel_doc = hotel_svc.get_hotel(data.hotel_id)
            if hotel_doc:
                hotel_context_str = hotel_svc.get_compiled_context(data.hotel_id)
                hotel_snapshot = {
                    "hotel_id": data.hotel_id,
                    "name": hotel_doc.get("name"),
                    "star_rating": hotel_doc.get("star_rating"),
                    "property_type": hotel_doc.get("property_type"),
                    "compiled_context_snapshot": hotel_context_str,
                }

        context = self._build_dynamic_context(data, hotel_context=hotel_context_str)

        # 1. Trigger CX Flow
        resp_json = self._trigger_plivo_cx(to_number=data.to_number, context=context)
        trigger_id = str(resp_json.get("api_id") or resp_json.get("trigger_id") or "")

        # 2. Persist call session
        session = CallSessionModel(
            trigger_id=trigger_id,
            username=data.username,
            from_number=data.from_number,
            to_number=data.to_number,
            persona=data.persona,
            prompt=data.prompt or "",
            context=context,
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