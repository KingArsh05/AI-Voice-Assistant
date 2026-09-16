import logging
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

    def make_call(self, data: InitiateCallRequest, answer_url: str):
        try:
            # 1. Trigger call using Plivo SDK (to_ and from_ have trailing underscores)
            response = self.client.calls.create(
                from_=data.from_number,
                to_=data.to_number,
                answer_url=answer_url,
                answer_method="POST",
            )

            # Plivo SDK returns an object with attributes: response.request_uuid, response.message
            request_uuid = getattr(response, "request_uuid", None) or (
                response.get("request_uuid")
                if isinstance(response, dict)
                else str(response)
            )
            message = getattr(response, "message", "call initiated")

            # 2. Instantiate and persist CallRecord via Pydantic model
            call_record = CallRecord(
                request_uuid=str(request_uuid),
                username=data.username,
                from_number=data.from_number,
                to_number=data.to_number,
                persona=data.persona,
                status="initiated",
            )

            self.db.calls.insert_one(call_record.to_mongo())
            logger.info("Call successfully placed with UUID: %s", request_uuid)

            return {"request_uuid": request_uuid, "message": message}

        except plivo.exceptions.PlivoRestError as e:
            logger.error("Plivo REST API error: %s", e)
            raise e

    def handle_hangup_event(self, event_data: dict):
        # Plivo may send CallUUID or request_uuid
        call_uuid = event_data.get("CallUUID") or event_data.get("request_uuid")
        duration = event_data.get("Duration") or event_data.get("CallDuration", 0)
        hangup_cause = event_data.get("HangupCause") or event_data.get(
            "hangup_cause", "normal"
        )

        logger.info(
            f"[Hangup Event] Call: {call_uuid}, Duration: {duration}s, Cause: {hangup_cause}"
        )

        if call_uuid:
            self.db.calls.update_one(
                {"request_uuid": call_uuid},
                {
                    "$set": {
                        "status": "completed",
                        "duration": (
                            int(duration) if str(duration).isdigit() else duration
                        ),
                        "hangup_cause": hangup_cause,
                        "raw_hangup_data": event_data,
                    }
                },
            )

    def handle_recording_event(self, event_data: dict):
        call_uuid = event_data.get("CallUUID") or event_data.get("request_uuid")
        recording_url = event_data.get("RecordingURL") or event_data.get(
            "recording_url"
        )
        transcription = event_data.get("transcription") or event_data.get(
            "Transcription", ""
        )
        summary = event_data.get("summary") or event_data.get("Summary", "")

        logger.info(f"[Recording Event] Call: {call_uuid}, URL: {recording_url}")

        if call_uuid:
            self.db.calls.update_one(
                {"request_uuid": call_uuid},
                {
                    "$set": {
                        "recording_url": recording_url,
                        "transcript": transcription,
                        "summary": summary,
                        "raw_recording_data": event_data,
                    }
                },
            )
