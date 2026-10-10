import json
import logging
import base64
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Optional, Tuple
from groq import Groq

from src.config import Config
from src.db.connection import mongodb

logger = logging.getLogger(__name__)
groq_client = Groq(api_key=Config.GROQ_API_KEY)


class MediaService:
    def __init__(self):
        self.db = mongodb.voice_calling_app_db

    def fetch_recording_audio(self, recording_id: str) -> Optional[bytes]:
        """
        Securely fetches raw audio bytes from Plivo using internal Basic Auth.
        Protects Plivo credentials from being exposed to the client.
        """
        if not recording_id:
            return None
        clean_id = recording_id.replace(".mp3", "").replace(".wav", "").strip()
        url = f"https://api.plivo.com/v1/Account/{Config.PLIVO_AUTH_ID}/Recording/{clean_id}/"
        credentials = base64.b64encode(
            f"{Config.PLIVO_AUTH_ID}:{Config.PLIVO_AUTH_TOKEN}".encode("utf-8")
        ).decode("utf-8")

        try:
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8")) if resp else {}

            raw_url = data.get("recording_url")
            if not raw_url:
                raw_url = f"https://aps1.media.plivo.com/v1/Account/{Config.PLIVO_AUTH_ID}/Recording/{clean_id}.mp3"

            media_req = urllib.request.Request(
                raw_url,
                headers={"Authorization": f"Basic {credentials}"},
            )
            with urllib.request.urlopen(media_req, timeout=20) as media_resp:
                return media_resp.read()
        except Exception as e:
            logger.error("Failed to fetch recording audio for %s: %s", recording_id, e)
            return None

    def transcribe_and_analyze_audio(
        self, audio_bytes: Optional[bytes]
    ) -> Tuple[str, list[dict], str, str]:
        """
        Transcribes call audio using Groq Whisper Large Turbo,
        then parses structured dialogue turns and real executive summary using Groq LLM.
        Returns: (transcript_text, conversation_turns, summary, guest_sentiment)
        """
        if not audio_bytes:
            return "", [], "", "neutral"

        try:
            audio_file = ("call.mp3", audio_bytes)
            transcription = groq_client.audio.transcriptions.create(
                file=audio_file,
                model="whisper-large-v3-turbo",
                response_format="verbose_json",
            )
            transcript_text = getattr(transcription, "text", "") or ""
        except Exception as e:
            logger.error("Groq Whisper transcription failed: %s", e)
            return "", [], "", "neutral"

        if not transcript_text.strip():
            return "", [], "", "neutral"

        prompt = f"""You are an expert AI call analyst for hotel voice reservations.
Analyze this call recording transcript between an AI hotel reservations agent and a guest:

\"\"\"{transcript_text}\"\"\"

Provide your analysis in JSON format with exactly these keys:
1. "conversation_turns": Array of objects [{{"turn_index": 1, "speaker": "agent"|"user", "text": "..."}}].
2. "summary": A concise 2-sentence executive summary explaining the exact conversation outcome, room type/pricing discussed, and customer decision.
3. "guest_sentiment": "positive" | "neutral" | "negative".

Output ONLY valid JSON."""

        conversation_turns = []
        summary = ""
        sentiment = "neutral"

        try:
            analysis_resp = groq_client.chat.completions.create(
                model="qwen/qwen3.8-27b",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                max_tokens=1500,
            )
            raw_json = analysis_resp.choices[0].message.content or "{}"
            parsed = json.loads(raw_json)
            raw_turns = parsed.get("conversation_turns", [])
            summary = parsed.get("summary", "")
            sentiment = parsed.get("guest_sentiment", "neutral")

            for idx, item in enumerate(raw_turns, start=1):
                if isinstance(item, dict):
                    conversation_turns.append(
                        {
                            "turn_index": item.get("turn_index", idx),
                            "speaker": item.get("speaker", "agent"),
                            "text": item.get("text", "").strip(),
                        }
                    )
                elif isinstance(item, list) and len(item) >= 3:
                    conversation_turns.append(
                        {
                            "turn_index": item[0],
                            "speaker": item[1],
                            "text": str(item[2]).strip(),
                        }
                    )
        except Exception as e:
            logger.warning(
                "LLM turn analysis failed: %s; falling back to basic transcript", e
            )
            summary = "Call completed with audio recorded and transcribed."

        return transcript_text, conversation_turns, summary, sentiment

    def sync_call_media_from_plivo(
        self, call_uuid: str, trigger_id: Optional[str] = None
    ) -> bool:
        """
        Direct sync from Plivo REST API:
        1. Queries GET /v1/Account/{auth_id}/Recording/?call_uuid={call_uuid}
        2. Downloads audio bytes securely
        3. Transcribes with Groq Whisper & generates summary with Groq LLM
        4. Updates MongoDB voice_call_logs
        """
        if not call_uuid:
            return False

        try:
            credentials = base64.b64encode(
                f"{Config.PLIVO_AUTH_ID}:{Config.PLIVO_AUTH_TOKEN}".encode("utf-8")
            ).decode("utf-8")
            url = f"https://api.plivo.com/v1/Account/{Config.PLIVO_AUTH_ID}/Recording/?call_uuid={call_uuid}"
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Accept": "application/json",
                },
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8")) if resp else {}

            objects = data.get("objects", [])
            if not objects:
                logger.info(
                    "No recordings found yet in Plivo API for call_uuid: %s", call_uuid
                )
                return False

            mp3_rec = next(
                (
                    r
                    for r in objects
                    if str(r.get("recording_format", "")).lower() == "mp3"
                ),
                objects[0],
            )
            recording_id = mp3_rec.get("recording_id", "")
            raw_dur = mp3_rec.get("recording_duration_ms") or 0
            try:
                dur_seconds = int(float(raw_dur) / 1000.0)
            except (ValueError, TypeError):
                dur_seconds = 0

            query_or = [
                {"identifiers.call_uuid": call_uuid},
                {"call_uuid": call_uuid},
            ]
            if trigger_id:
                query_or.extend(
                    [
                        {"identifiers.trigger_id": trigger_id},
                        {"trigger_id": trigger_id},
                    ]
                )

            audio_bytes = self.fetch_recording_audio(recording_id)
            transcript_text, conversation_turns, summary, sentiment = (
                self.transcribe_and_analyze_audio(audio_bytes)
            )

            update_set = {
                "call_status": "answered",
                "disposition": "completed",
                "media.recording_id": recording_id,
                "media.audio_format": "mp3",
                "ai_insights.conversation_turns": conversation_turns,
                "ai_insights.summary": summary,
                "ai_insights.guest_sentiment": sentiment,
                "updated_at": datetime.now(timezone.utc),
            }

            if dur_seconds > 0:
                update_set["metrics.duration_seconds"] = dur_seconds

            self.db["voice_call_logs"].update_one(
                {"$or": query_or},
                {
                    "$set": update_set,
                    "$unset": {
                        "media.recording_url": "",
                        "recording_url": "",
                        "transcript": "",
                        "ai_insights.transcript": "",
                        "summary": "",
                        "conversation_turns": "",
                        "duration": "",
                        "status": "",
                        "total_cost": "",
                        "hangup_by": "",
                        "hangup_source": "",
                        "call_uuid": "",
                        "trigger_id": "",
                        "hotel_id": "",
                        "hotel_name": "",
                        "guest_name": "",
                        "to_number": "",
                        "dispatched_knowledge_brief": "",
                    },
                },
            )
            logger.info(
                "⚡ Successfully synced & transcribed call %s -> %d turns",
                call_uuid,
                len(conversation_turns),
            )
            return True

        except Exception as e:
            logger.warning(
                "Failed self-healing media sync for call %s: %s", call_uuid, e
            )
            return False

    def delayed_sync_worker(
        self, call_uuid: str, trigger_id: str, delay_seconds: int = 12
    ) -> None:
        """Background thread worker that sleeps for delay_seconds and triggers transcription & summary sync."""
        import time

        try:
            time.sleep(delay_seconds)

            query_or = [
                {"identifiers.call_uuid": call_uuid},
                {"call_uuid": call_uuid},
            ]
            if trigger_id:
                query_or.extend(
                    [
                        {"identifiers.trigger_id": trigger_id},
                        {"trigger_id": trigger_id},
                    ]
                )

            doc = None
            try:
                doc = self.db["voice_call_logs"].find_one({"$or": query_or})
            except Exception as db_err:
                logger.warning(
                    "Retrying voice_call_logs read for %s: %s", call_uuid, db_err
                )
                time.sleep(2)
                doc = self.db["voice_call_logs"].find_one({"$or": query_or})

            if doc and doc.get("ai_insights", {}).get("conversation_turns"):
                logger.info(
                    "Transcripts already present for call %s; skipping worker.",
                    call_uuid,
                )
                return

            synced = self.sync_call_media_from_plivo(call_uuid, trigger_id)
            if not synced:
                time.sleep(8)
                self.sync_call_media_from_plivo(call_uuid, trigger_id)
        except Exception as e:
            logger.error("Error in delayed_sync_worker for call %s: %s", call_uuid, e)
