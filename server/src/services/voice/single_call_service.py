import json
import logging
import base64
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Tuple, Optional

from src.config import Config
from src.db.connection import mongodb
from src.models.plivo_call_model import OutboundCallRequest
from src.services.voice.knowledge_base_service import KnowledgeBaseService

logger = logging.getLogger(__name__)


class SingleCallService:
    def __init__(self, kb_service: Optional[KnowledgeBaseService] = None):
        self.db = mongodb.voice_calling_app_db
        self.kb_service = kb_service or KnowledgeBaseService()

    def build_payload(self, data: OutboundCallRequest) -> Tuple[dict, dict, Any]:
        usage_info = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        kb_id = None

        if data.hotel_id:
            hotel_obj = self.kb_service.build_full_hotel_object(data.hotel_id)
            hotel_name = self.kb_service.get_hotel_name_from_hotel_id(data.hotel_id)
            hotel_kb, usage_info, kb_id = self.kb_service.get_hotel_brief(
                data.hotel_id, hotel_obj
            )
        else:
            hotel_name = "Hotel Reservations"
            hotel_kb = "Property: Hotel Reservations. Assists prospective guests with booking inquiries."

        guest_name = (data.guest_name or "Guest").strip()
        lead_context = (
            data.guest_lead or "Guest expressed interest in room reservation."
        ).strip()

        guest_lead_directive = (
            f"Context: {lead_context}. "
            f"Goal: Greet {guest_name}, address this specific inquiry directly, provide room pricing from knowledge base, and confirm booking or offer to send WhatsApp details."
        )

        payload = {
            "to_number": data.to_number,
            "hotel_name": hotel_name,
            "guest_name": guest_name,
            "guest_lead": guest_lead_directive,
            "hotel_knowledge_brief": hotel_kb,
        }
        return payload, usage_info, kb_id

    def trigger_plivo_http(self, payload: dict) -> dict:
        body_bytes = json.dumps(payload).encode("utf-8")
        credentials = base64.b64encode(
            f"{Config.PLIVO_AUTH_ID}:{Config.PLIVO_AUTH_TOKEN}".encode("utf-8")
        ).decode("utf-8")

        req = urllib.request.Request(
            Config.PLIVO_OUTBOUND_API_URL,
            data=body_bytes,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Basic {credentials}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as res:
                raw_response = res.read().decode("utf-8")
                return json.loads(raw_response) if raw_response else {}
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8") if e.fp else str(e)
            logger.error("Plivo API Error %s: %s", e.code, err_body)
            raise RuntimeError(f"Plivo returned {e.code}: {err_body}")

    def make_single_call(self, data: OutboundCallRequest) -> dict:
        payload, usage, kb_id = self.build_payload(data)

        brief = payload.get("hotel_knowledge_brief", "")
        word_count = len(brief.split())
        char_count = len(brief)
        total_tokens = usage.get("total_tokens", 0)
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)

        token_summary = (
            f"Tokens: Total={total_tokens} (Prompt={prompt_tokens}, Completion={completion_tokens})"
            if total_tokens > 0
            else "Tokens: Fallback / Cached (₹0 / 0 tokens)"
        )

        indented_brief = "\n".join(
            f"   {line}" if line.strip() else "" for line in brief.splitlines()
        )

        print("\n" + "═" * 70)
        print("  📞 OUTBOUND VOICE CALL DISPATCH")
        print("═" * 70)
        print(
            f"  • Mode         : {'🧪 DRY RUN (₹0 Cost)' if data.dry_run else '🔴 LIVE PLIVO CALL'}"
        )
        print(f"  • Destination  : {payload.get('to_number')}")
        print(f"  • Guest Name   : {payload.get('guest_name')}")
        print(f"  • Hotel        : {payload.get('hotel_name')} (ID: {data.hotel_id})")
        print(f"  • Lead Context : {payload.get('guest_lead')}")
        print("\n" + "─" * 70)
        print(
            f"  📋 HOTEL KNOWLEDGE BRIEF ({word_count} words | {char_count} chars | {token_summary}):"
        )
        print("─" * 70 + "\n")
        print(indented_brief)
        print("\n" + "═" * 70 + "\n")

        # Strict Output Validation Gate
        if not brief or word_count < 30:
            logger.error(
                "Knowledge brief compilation is incomplete (%d words). Aborting call.",
                word_count,
            )
            raise ValueError(
                f"Knowledge brief incomplete ({word_count} words). Plivo call blocked to prevent sending broken prompt."
            )

        now = datetime.now(timezone.utc)
        if data.dry_run:
            mock_id = f"dry_run_{now.strftime('%Y%m%d_%H%M%S')}"
            logger.info(
                "Executed dry run call for %s | Mock ID: %s", data.to_number, mock_id
            )

            call_doc = {
                "identifiers": {
                    "trigger_id": mock_id,
                    "flow_run_uuid": mock_id,
                    "phlo_id": "dry_run_phlo",
                    "api_id": mock_id,
                    "call_uuid": None,
                    "conversation_id": None,
                    "conversation_url": None,
                },
                "telephony": {
                    "direction": "outbound",
                    "from_number": Config.PLIVO_PHONE_NUMBER,
                    "to_number": payload["to_number"],
                    "country": "India",
                    "iso2": "IN",
                },
                "party_details": {
                    "hotel_id": data.hotel_id if data.hotel_id else None,
                    "hotel_name": payload.get("hotel_name", "Hotel"),
                    "guest_name": payload.get("guest_name", "Guest"),
                    "guest_lead": payload.get("guest_lead", ""),
                },
                "call_status": "dry_run",
                "disposition": "simulated",
                "hangup": {
                    "source": "simulation",
                    "by": "system",
                    "cause": "dry_run_completed",
                },
                "metrics": {
                    "duration_seconds": 0,
                    "billed_minutes": 0,
                    "bill_rate_usd": 0.0,
                },
                "pricing": {
                    "currency": "INR",
                    "telecom_cost": 0.0,
                    "ai_engine_cost": 0.0,
                    "total_cost": 0.0,
                    "breakdown_explanation": "Dry run test - No charge",
                },
                "media": {
                    "recording_id": None,
                    "audio_format": "mp3",
                },
                "ai_insights": {
                    "summary": "Dry run simulated call. No actual telephony triggered.",
                    "guest_sentiment": "neutral",
                    "conversation_turns": [],
                },
                "knowledge_base_id": kb_id,
                "is_dry_run": True,
                "created_at": now,
                "updated_at": now,
            }
            self.db["voice_call_logs"].insert_one(call_doc)

            return {
                "success": True,
                "dry_run": True,
                "trigger_id": mock_id,
                "message": "Dry run successful. No Plivo call placed.",
                "dispatched_payload": payload,
            }

        resp = self.trigger_plivo_http(payload)

        trigger_id = str(resp.get("api_id") or resp.get("trigger_id") or "")
        message = resp.get("message", "Triggered")
        phlo_id = resp.get("phlo_id") or resp.get("data", {}).get("phlo_id", "N/A")

        call_doc = {
            "identifiers": {
                "trigger_id": trigger_id,
                "flow_run_uuid": trigger_id,
                "phlo_id": phlo_id,
                "api_id": trigger_id,
                "call_uuid": None,
                "conversation_id": None,
                "conversation_url": None,
            },
            "telephony": {
                "direction": "outbound",
                "from_number": Config.PLIVO_PHONE_NUMBER,
                "to_number": payload["to_number"],
                "country": "India",
                "iso2": "IN",
            },
            "party_details": {
                "hotel_id": data.hotel_id if data.hotel_id else None,
                "hotel_name": payload.get("hotel_name", "Hotel"),
                "guest_name": payload.get("guest_name", "Guest"),
                "guest_lead": payload.get("guest_lead", ""),
            },
            "call_status": "initiated",
            "disposition": "pending",
            "hangup": {
                "source": None,
                "by": None,
                "cause": None,
            },
            "metrics": {
                "duration_seconds": 0,
                "billed_minutes": 0,
                "bill_rate_usd": 0.0,
            },
            "pricing": {
                "currency": "INR",
                "telecom_cost": 0.0,
                "ai_engine_cost": 0.0,
                "total_cost": 0.0,
                "breakdown_explanation": "Call initiated. Costs calculated upon hangup webhook.",
            },
            "media": {
                "recording_id": None,
                "audio_format": "mp3",
            },
            "ai_insights": {
                "summary": None,
                "guest_sentiment": None,
                "conversation_turns": [],
            },
            "knowledge_base_id": kb_id,
            "is_dry_run": False,
            "created_at": now,
            "updated_at": now,
        }
        self.db["voice_call_logs"].insert_one(call_doc)

        return {
            "success": True,
            "trigger_id": trigger_id,
            "message": message,
            "data": resp,
        }
