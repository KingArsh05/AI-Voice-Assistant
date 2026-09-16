import json
import logging
import base64
import urllib.request
import urllib.error
import plivo
from src.config import Config
from src.db.connection import get_db
from src.models.call_model import CallRecord, InitiateCallRequest

logger = logging.getLogger(__name__)


class CallService:
    def __init__(self):
        self.client = plivo.RestClient(
            auth_id=Config.PLIVO_AUTH_ID, auth_token=Config.PLIVO_AUTH_TOKEN
        )
        self.db = get_db()

    def make_call(self, data: InitiateCallRequest):
        """
        Trigger Plivo CX Agent Flow via API request.
        Expected CX Trigger payload:
        {
            "to_number": "+91XXXXXXXXXX",
            "context": "Clean, comprehensive dynamic prompt / context"
        }
        """
        # Construct clean dynamic context string for the AI Conversation node
        context_parts = []
        if data.username:
            context_parts.append(f"Guest/Client Name: {data.username}")
        if data.persona:
            context_parts.append(f"Persona/Role: {data.persona}")
        if data.prompt:
            context_parts.append(f"Instructions & Goals: {data.prompt}")

        dynamic_context = (
            "\n".join(context_parts)
            if context_parts
            else "You are an AI voice assistant for StayChat."
        )

        payload = {
            "to_number": data.to_number,
            "context": dynamic_context,
        }

        logger.info(
            "Triggering Plivo CX Flow at %s with payload: %s",
            Config.PLIVO_OUTBOUND_API_URL,
            payload,
        )

        json_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            Config.PLIVO_OUTBOUND_API_URL,
            data=json_bytes,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        # HTTP Basic Auth using Plivo Auth ID and Token
        credentials = f"{Config.PLIVO_AUTH_ID}:{Config.PLIVO_AUTH_TOKEN}"
        encoded_credentials = base64.b64encode(credentials.encode("utf-8")).decode(
            "utf-8"
        )
        req.add_header("Authorization", f"Basic {encoded_credentials}")

        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                response_status = response.status
                response_body = response.read().decode("utf-8")
                resp_json = json.loads(response_body) if response_body else {}

            logger.info("Plivo CX API response [%s]: %s", response_status, resp_json)

            # Plivo PHLO/CX flow trigger returns: {"api_id": "...", "phlo_id": "...", "message": "Phlo run queued"}
            trigger_id = (
                resp_json.get("api_id")
                or resp_json.get("execution_id")
                or resp_json.get("trigger_id")
                or resp_json.get("request_uuid")
                or resp_json.get("call_uuid")
                or resp_json.get("id")
            )
            message = resp_json.get("message", "CX Flow triggered successfully")

            # Persist call record in MongoDB
            call_record = CallRecord(
                request_uuid=trigger_id,
                trigger_id=trigger_id,
                username=data.username,
                from_number=data.from_number,
                to_number=data.to_number,
                persona=data.persona,
                context=dynamic_context,
                status="initiated",
            )

            insert_result = self.db.calls.insert_one(call_record.to_mongo())
            logger.info(
                "Inserted call record ID: %s (trigger_id / api_id: %s)",
                insert_result.inserted_id,
                trigger_id,
            )

            return {
                "success": True,
                "trigger_id": trigger_id,
                "message": message,
                "data": resp_json,
            }

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            logger.error("Plivo CX API HTTP Error %s: %s", e.code, err_body)
            raise RuntimeError(f"Plivo CX Flow API returned {e.code}: {err_body}")
        except Exception as e:
            logger.error("Failed to trigger Plivo CX Flow: %s", e)
            raise e

    def _extract_identifiers_and_data(self, event_data: dict) -> dict:
        """
        Extract all rich Plivo CX telemetry:
        - Countries (from_country, to_country, iso2)
        - Phone numbers (from, to)
        - Financials (bill_rate)
        - Routing (direction, leg, hangup_source)
        - Flow & node metadata (flow_name, node_name, flow_run_uuid, conversation_id, conversation_url)
        - Audio & AI (recording_url, recording_uuid, recording_duration, call_duration, context, transcript, summary)
        """
        obj = (
            event_data.get("data", {}).get("object", {})
            if isinstance(event_data.get("data"), dict)
            else {}
        )
        sub = (
            obj.get("event_data", {}) if isinstance(obj.get("event_data"), dict) else {}
        )

        # 1. Identifiers
        call_uuid = (
            obj.get("call_uuid")
            or event_data.get("CallUUID")
            or event_data.get("call_uuid")
            or event_data.get("request_uuid")
            or sub.get("Outbound Call.uuid")
        )

        flow_run_id = (
            obj.get("flow_run_uuid")
            or sub.get("Start.flow_run_id")
            or event_data.get("flow_run_uuid")
            or event_data.get("api_id")
        )

        flow_name = obj.get("flow_name") or event_data.get("flow_name")
        node_name = obj.get("node_name") or event_data.get("node_name")
        conversation_id = obj.get("conversation_id") or sub.get("Outbound Call.conversation_id")
        conversation_url = obj.get("conversation_url")

        # 2. Telephony routing & numbers
        from_number = (
            sub.get("Outbound Call.from")
            or sub.get("Hotel Voice Assistant.outgoing_message.from")
            or event_data.get("From")
        )
        to_number = (
            sub.get("Outbound Call.to")
            or sub.get("Start.http.params.to_number")
            or sub.get("Hotel Voice Assistant.outgoing_message.to")
            or event_data.get("To")
            or event_data.get("to_number")
        )

        from_country = (
            sub.get("Hotel Voice Assistant.outgoing_message.from_country")
            or sub.get("Outbound Call.from_country")
            or event_data.get("FromCountry")
        )
        from_iso2 = (
            sub.get("Hotel Voice Assistant.outgoing_message.from_iso2")
            or sub.get("Outbound Call.from_iso2")
        )

        to_country = (
            sub.get("Hotel Voice Assistant.outgoing_message.to_country")
            or sub.get("Outbound Call.to_country")
            or event_data.get("ToCountry")
        )
        to_iso2 = (
            sub.get("Hotel Voice Assistant.outgoing_message.to_iso2")
            or sub.get("Outbound Call.to_iso2")
        )

        direction = sub.get("Outbound Call.direction") or event_data.get("Direction", "outbound")
        bill_rate = sub.get("Outbound Call.bill_rate") or event_data.get("BillRate")

        # 3. Durations & Status
        duration_raw = (
            sub.get("call_duration")
            or event_data.get("Duration")
            or event_data.get("CallDuration")
            or 0
        )
        try:
            duration = int(duration_raw)
        except (ValueError, TypeError):
            duration = 0

        hangup_source = (
            sub.get("hangup_source")
            or event_data.get("HangupCause")
            or event_data.get("hangup_cause")
            or "customer"
        )
        call_status = sub.get("Outbound Call.call_status") or "completed"

        # 4. Context
        context = sub.get("Start.http.params.context")

        # 5. Recording & AI Output
        recording_url = (
            sub.get("recording_url")
            or event_data.get("RecordingURL")
            or event_data.get("recording_url")
        )
        recording_uuid = sub.get("recording_uuid") or event_data.get("RecordingUUID")
        rec_dur_raw = sub.get("recording_duration") or 0
        try:
            recording_duration = int(rec_dur_raw)
        except (ValueError, TypeError):
            recording_duration = 0

        transcription = (
            sub.get("transcription")
            or sub.get("transcript")
            or sub.get("Transcription")
            or event_data.get("transcription")
            or event_data.get("Transcription")
            or ""
        )
        summary = (
            sub.get("summary")
            or sub.get("Summary")
            or event_data.get("summary")
            or event_data.get("Summary")
            or ""
        )

        return {
            "call_uuid": call_uuid,
            "flow_run_id": flow_run_id,
            "flow_name": flow_name,
            "node_name": node_name,
            "conversation_id": conversation_id,
            "conversation_url": conversation_url,
            "from_number": from_number,
            "to_number": to_number,
            "from_country": from_country,
            "from_iso2": from_iso2,
            "to_country": to_country,
            "to_iso2": to_iso2,
            "direction": direction,
            "bill_rate": bill_rate,
            "duration": duration,
            "hangup_source": hangup_source,
            "call_status": call_status,
            "context": context,
            "recording_url": recording_url,
            "recording_uuid": recording_uuid,
            "recording_duration": recording_duration,
            "transcription": transcription,
            "summary": summary,
        }

    def _find_call(self, extracted: dict) -> dict:
        """Find matching call document in MongoDB by exact IDs or by recipient number sorted by recent."""
        # 1. Try exact UUID / trigger matching first
        query_ids = []
        if extracted.get("flow_run_id"):
            query_ids.extend([
                {"trigger_id": extracted["flow_run_id"]},
                {"request_uuid": extracted["flow_run_id"]},
                {"flow_run_uuid": extracted["flow_run_id"]},
            ])
        if extracted.get("call_uuid"):
            query_ids.extend([
                {"call_uuid": extracted["call_uuid"]},
                {"request_uuid": extracted["call_uuid"]},
            ])

        if query_ids:
            doc = self.db.calls.find_one({"$or": query_ids})
            if doc:
                return doc

        # 2. Fallback: match by to_number for the most recent uncompleted or initiated call
        if extracted.get("to_number"):
            doc = self.db.calls.find_one(
                {"to_number": extracted["to_number"]},
                sort=[("created_at", -1)]
            )
            if doc:
                return doc

        return None

    def handle_hangup_event(self, event_data: dict):
        extracted = self._extract_identifiers_and_data(event_data)
        call = self._find_call(extracted)

        logger.info("[Hangup Event Extracted]: %s", extracted)

        if call:
            update_fields = {
                "status": "completed",
                "duration": extracted["duration"],
                "hangup_cause": extracted["hangup_source"],
                "hangup_source": extracted["hangup_source"],
                "raw_hangup_data": event_data,
            }
            # Add telemetry fields if present
            for field in [
                "call_uuid",
                "flow_name",
                "node_name",
                "flow_run_id",
                "flow_run_uuid",
                "conversation_id",
                "conversation_url",
                "from_country",
                "from_iso2",
                "to_country",
                "to_iso2",
                "direction",
                "bill_rate",
            ]:
                if extracted.get(field):
                    update_fields[field] = extracted[field]

            if extracted.get("context"):
                update_fields["context"] = extracted["context"]

            result = self.db.calls.update_one({"_id": call["_id"]}, {"$set": update_fields})
            logger.info(
                "MongoDB hangup update matched: %s, modified: %s",
                result.matched_count,
                result.modified_count,
            )

    def handle_recording_event(self, event_data: dict):
        extracted = self._extract_identifiers_and_data(event_data)
        call = self._find_call(extracted)

        logger.info("[Recording Event Extracted]: %s", extracted)

        if call:
            update_fields = {
                "status": "completed",
                "recording_url": extracted["recording_url"],
                "raw_recording_data": event_data,
            }
            if extracted.get("recording_duration") and extracted["recording_duration"] > 0:
                update_fields["recording_duration"] = extracted["recording_duration"]
            if extracted.get("recording_uuid"):
                update_fields["recording_uuid"] = extracted["recording_uuid"]
            if extracted.get("duration") and extracted["duration"] > 0:
                update_fields["duration"] = extracted["duration"]
            if extracted.get("transcription"):
                update_fields["transcript"] = extracted["transcription"]
            if extracted.get("summary"):
                update_fields["summary"] = extracted["summary"]
            if extracted.get("call_uuid"):
                update_fields["call_uuid"] = extracted["call_uuid"]
            if extracted.get("flow_name"):
                update_fields["flow_name"] = extracted["flow_name"]

            result = self.db.calls.update_one({"_id": call["_id"]}, {"$set": update_fields})
            logger.info(
                "MongoDB recording update matched: %s, modified: %s",
                result.matched_count,
                result.modified_count,
            )

    def backfill_existing_calls(self):
        """Extract and populate fields from raw_hangup_data or raw_recording_data for existing records."""
        try:
            calls = self.db.calls.find(
                {
                    "$or": [
                        {"raw_hangup_data": {"$exists": True}},
                        {"raw_recording_data": {"$exists": True}},
                    ]
                }
            )
            for c in calls:
                updates = {"status": "completed"}
                if "raw_hangup_data" in c and c["raw_hangup_data"]:
                    h_data = self._extract_identifiers_and_data(c["raw_hangup_data"])
                    for k, v in h_data.items():
                        if v is not None and v != "":
                            updates[k] = v
                if "raw_recording_data" in c and c["raw_recording_data"]:
                    r_data = self._extract_identifiers_and_data(c["raw_recording_data"])
                    for k, v in r_data.items():
                        if v is not None and v != "":
                            updates[k] = v

                self.db.calls.update_one({"_id": c["_id"]}, {"$set": updates})
        except Exception as e:
            logger.error("Error backfilling existing calls: %s", e)

