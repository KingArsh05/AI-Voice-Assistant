import json
import logging
import math
import re
import threading
from datetime import datetime, timezone
from typing import Optional

from src.config import Config
from src.db.connection import mongodb
from src.services.voice.media_service import MediaService

logger = logging.getLogger(__name__)


class WebhookService:
    def __init__(
        self, media_service: Optional[MediaService] = None, call_queue_service=None
    ):
        self.db = mongodb.voice_calling_app_db
        self.media_service = media_service or MediaService()
        self.call_queue_service = call_queue_service

    def handle_hangup_event(self, event_data: dict) -> None:
        """
        Processes Plivo Call Disconnect Webhook:
        - Extracts hangup cause (user hung up, bot hung up, line busy, no answer)
        - Computes exact duration and billing breakdown (₹3.38/min)
        - Updates status and metrics in MongoDB
        """
        print("\n" + "═" * 70)
        print("  📴 PLIVO HANGUP EVENT RECEIVED")
        print("═" * 70)
        print(json.dumps(event_data, indent=2, default=str))
        print("═" * 70 + "\n")

        obj = (
            event_data.get("data", {}).get("object", {})
            if isinstance(event_data.get("data"), dict)
            else {}
        )
        sub = (
            obj.get("event_data", {}) if isinstance(obj.get("event_data"), dict) else {}
        )

        trigger_id = (
            event_data.get("trigger_id")
            or event_data.get("conversation_id")
            or obj.get("flow_run_uuid")
            or sub.get("Start.flow_run_id")
            or obj.get("conversation_id")
            or event_data.get("flow_run_uuid")
        )
        call_uuid = (
            event_data.get("call_uuid")
            or event_data.get("CallUUID")
            or obj.get("call_uuid")
            or sub.get("Place Guest Call.uuid")
            or sub.get("Outbound Call.uuid")
        )

        raw_dur = (
            sub.get("call_duration")
            or event_data.get("duration")
            or obj.get("duration")
            or sub.get("duration")
            or 0
        )
        try:
            duration = int(float(raw_dur))
        except (ValueError, TypeError):
            duration = 0

        hangup_source = str(
            sub.get("hangup_source")
            or event_data.get("hangup_source")
            or obj.get("hangup_source")
            or "unknown"
        ).lower()

        raw_status = str(
            sub.get("Place Guest Call.call_status")
            or event_data.get("hangup_cause")
            or obj.get("hangup_cause")
            or sub.get("hangup_cause")
            or ""
        ).lower()

        query_or = []
        if trigger_id:
            query_or.extend(
                [
                    {"identifiers.trigger_id": str(trigger_id)},
                    {"identifiers.flow_run_uuid": str(trigger_id)},
                    {"trigger_id": str(trigger_id)},
                ]
            )
        if call_uuid:
            query_or.extend(
                [
                    {"identifiers.call_uuid": str(call_uuid)},
                    {"call_uuid": str(call_uuid)},
                ]
            )

        if not query_or:
            logger.warning("Hangup event received without identifier: %s", event_data)
            return

        query = {"$or": query_or}

        # Check if call failed or was answered
        if (
            "failed" in raw_status
            or "credit" in raw_status
            or raw_status == "failed_out_of_credits"
        ):
            call_status = "failed"
            disposition = "failed"
        elif duration > 0 or "completed" in raw_status:
            call_status = "answered"
            disposition = "completed"
        elif "busy" in raw_status:
            call_status = "busy"
            disposition = "busy"
        elif "no_answer" in raw_status or "timeout" in raw_status:
            call_status = "no_answer"
            disposition = "unanswered"
        else:
            call_status = "rejected"
            disposition = "failed"

        if "customer" in hangup_source or "user" in hangup_source:
            hangup_by = "guest"
        elif "agent" in hangup_source or "bot" in hangup_source:
            hangup_by = "agent"
        else:
            hangup_by = "system"

        session_dur_raw = (
            sub.get("session_duration")
            or sub.get("agent_duration")
            or sub.get("call_duration")
            or duration
        )
        try:
            session_duration = int(float(session_dur_raw))
        except (ValueError, TypeError):
            session_duration = duration

        effective_duration = max(duration, session_duration)
        billed_minutes = (
            math.ceil(effective_duration / 60.0) if effective_duration > 0 else 0
        )
        telecom_cost = round(billed_minutes * 1.80, 2)
        ai_engine_cost = round(billed_minutes * 1.48, 2)
        regulatory_overhead = round(billed_minutes * 0.10, 2)
        total_cost = round(billed_minutes * 3.38, 2)

        if event_data.get("cost") is not None:
            try:
                total_cost = float(
                    str(event_data.get("cost"))
                    .replace("₹", "")
                    .replace(",", "")
                    .strip()
                )
            except (ValueError, TypeError):
                pass
        elif sub.get("total_cost") is not None or sub.get("cost") is not None:
            try:
                raw_c = sub.get("total_cost") or sub.get("cost")
                total_cost = float(str(raw_c).replace("₹", "").replace(",", "").strip())
            except (ValueError, TypeError):
                pass

        conversation_id = (
            obj.get("conversation_id")
            or event_data.get("conversation_id")
            or sub.get("conversation_id")
        )
        conversation_url = (
            obj.get("conversation_url")
            or event_data.get("conversation_url")
            or sub.get("conversation_url")
        )
        bill_rate = (
            sub.get("Place Guest Call.bill_rate") or sub.get("bill_rate") or 0.00475
        )
        try:
            bill_rate_float = float(bill_rate)
        except (ValueError, TypeError):
            bill_rate_float = 0.00475

        from_number = (
            sub.get("Place Guest Call.from")
            or sub.get("from")
            or obj.get("from")
            or Config.PLIVO_PHONE_NUMBER
        )
        to_number = sub.get("Place Guest Call.to") or sub.get("to") or obj.get("to")

        update_set = {
            "call_status": call_status,
            "disposition": disposition,
            "hangup": {
                "source": hangup_source,
                "by": hangup_by,
                "cause": raw_status or "completed",
            },
            "metrics": {
                "duration_seconds": effective_duration,
                "billed_minutes": billed_minutes,
                "bill_rate_usd": bill_rate_float,
            },
            "pricing": {
                "currency": "INR",
                "telecom_cost": telecom_cost,
                "ai_engine_cost": ai_engine_cost,
                "regulatory_overhead": regulatory_overhead,
                "total_cost": total_cost,
                "breakdown_explanation": f"{billed_minutes} billed mins @ ₹3.38/min (₹1.80 telecom + ₹1.48 AI engine + ₹0.10 noise cancel/carrier)",
            },
            "updated_at": datetime.now(timezone.utc),
        }

        if call_uuid:
            update_set["identifiers.call_uuid"] = str(call_uuid)
        if conversation_id:
            update_set["identifiers.conversation_id"] = str(conversation_id)
        if conversation_url:
            update_set["identifiers.conversation_url"] = str(conversation_url)
        if from_number:
            update_set["telephony.from_number"] = str(from_number)
        if to_number:
            update_set["telephony.to_number"] = str(to_number)

        self.db["voice_call_logs"].update_one(query, {"$set": update_set})
        logger.info(
            "Call updated via hangup webhook: %s (%ss | ₹%s)",
            query_or[0] if query_or else {},
            effective_duration,
            total_cost,
        )

        if call_status != "answered" and self.call_queue_service:
            print(f"🔔 [QUEUE NOTIFY] Call {call_status}! Releasing next call...")
            self.call_queue_service.call_completed_event.set()

        if call_uuid:
            threading.Thread(
                target=self.media_service.delayed_sync_worker,
                args=(str(call_uuid), str(trigger_id or ""), 12),
                daemon=True,
            ).start()

    def handle_recording_event(self, event_data: dict) -> None:
        """
        Processes Plivo Recording, Transcript, and Summary Webhook.
        """
        print("\n" + "═" * 70)
        print("  🎙️ PLIVO RECORDING / TRANSCRIPT EVENT RECEIVED")
        print("═" * 70)
        print(json.dumps(event_data, indent=2, default=str))
        print("═" * 70 + "\n")

        obj = (
            event_data.get("data", {}).get("object", {})
            if isinstance(event_data.get("data"), dict)
            else {}
        )
        sub = (
            obj.get("event_data", {}) if isinstance(obj.get("event_data"), dict) else {}
        )

        trigger_id = (
            event_data.get("trigger_id")
            or event_data.get("conversation_id")
            or obj.get("flow_run_uuid")
            or sub.get("Start.flow_run_id")
        )
        call_uuid = (
            event_data.get("call_uuid")
            or event_data.get("CallUUID")
            or obj.get("call_uuid")
            or sub.get("Outbound Call.uuid")
        )
        recording_url = (
            event_data.get("recording_url")
            or event_data.get("RecordingURL")
            or sub.get("recording_url")
        )
        transcript = (
            event_data.get("transcription")
            or event_data.get("transcript")
            or sub.get("transcript")
            or sub.get("transcription")
        )
        summary = (
            event_data.get("summary") or sub.get("summary") or sub.get("call_summary")
        )

        query_or = []
        if trigger_id:
            query_or.extend(
                [
                    {"identifiers.trigger_id": str(trigger_id)},
                    {"identifiers.flow_run_uuid": str(trigger_id)},
                    {"trigger_id": str(trigger_id)},
                ]
            )
        if call_uuid:
            query_or.extend(
                [
                    {"identifiers.call_uuid": str(call_uuid)},
                    {"call_uuid": str(call_uuid)},
                ]
            )

        if not query_or:
            logger.warning(
                "Recording event received without identifier: %s", event_data
            )
            return

        query = {"$or": query_or}

        conversation_turns = []
        if isinstance(transcript, str) and transcript.strip():
            matches = re.findall(
                r"\[(Customer|Ai_Agent|User|Agent|Guest|Bot)\]\s*([^\[]+)",
                transcript,
                re.IGNORECASE,
            )
            for idx, (role_tag, turn_text) in enumerate(matches, start=1):
                role_lower = role_tag.lower()
                speaker = (
                    "user"
                    if any(u in role_lower for u in ["customer", "user", "guest"])
                    else "agent"
                )
                clean_text = turn_text.strip()
                if clean_text:
                    conversation_turns.append(
                        {"turn_index": idx, "speaker": speaker, "text": clean_text}
                    )

        rec_id = event_data.get("recording_id") or sub.get("recording_id")
        if not rec_id and recording_url:
            rec_id = (
                recording_url.rstrip("/")
                .split("/")[-1]
                .replace(".mp3", "")
                .replace(".wav", "")
            )

        update_set = {
            "media.recording_id": rec_id,
            "media.audio_format": "mp3",
            "ai_insights.summary": summary or "",
            "ai_insights.conversation_turns": conversation_turns,
            "updated_at": datetime.now(timezone.utc),
        }

        if event_data.get("cost") is not None:
            try:
                final_cost = float(
                    str(event_data.get("cost"))
                    .replace("₹", "")
                    .replace(",", "")
                    .strip()
                )
                update_set["pricing.total_cost"] = final_cost
            except (ValueError, TypeError):
                pass

        self.db["voice_call_logs"].update_one(
            query,
            {
                "$set": update_set,
                "$unset": {
                    "media.recording_url": "",
                    "recording_url": "",
                    "transcript": "",
                    "ai_insights.transcript": "",
                    "summary": "",
                    "conversation_turns": "",
                },
            },
        )

        if self.call_queue_service:
            print(
                "🔔 [QUEUE NOTIFY] Recording & DB update complete! Releasing next call..."
            )
            self.call_queue_service.call_completed_event.set()

        logger.info(
            "Call recording, turns (%d) & summary synced for %s",
            len(conversation_turns),
            query_or[0] if query_or else {},
        )
