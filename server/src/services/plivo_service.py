"""
PlivoVoiceService Facade:
Preserves full backward compatibility for existing controllers and external callers
while delegating all logic to domain services under `src.services.voice`.
"""

import logging
from typing import Optional, Dict, Any

from src.models.plivo_call_model import OutboundCallRequest, BulkCallRequest
from src.services.voice.knowledge_base_service import KnowledgeBaseService
from src.services.voice.single_call_service import SingleCallService
from src.services.voice.call_queue_service import CallQueueService
from src.services.voice.webhook_service import WebhookService
from src.services.voice.media_service import MediaService
from src.services.voice.call_query_service import CallQueryService

logger = logging.getLogger(__name__)


class PlivoVoiceService:
    def __init__(self):
        self.kb_service = KnowledgeBaseService()
        self.single_call_service = SingleCallService(self.kb_service)
        self.queue_service = CallQueueService(self.single_call_service)
        self.media_service = MediaService()
        self.webhook_service = WebhookService(self.media_service, call_queue_service=self.queue_service)
        self.query_service = CallQueryService()
    

    # --- Knowledge Base Delegation ---
    def list_all_available_hotels(self) -> list[dict]:
        return self.kb_service.list_all_available_hotels()

    def get_hotel_name_from_hotel_id(self, hotel_id: Optional[str]) -> str:
        return self.kb_service.get_hotel_name_from_hotel_id(hotel_id)

    def build_full_hotel_object(self, hotel_id: str) -> dict:
        return self.kb_service.build_full_hotel_object(hotel_id)

    def render_concise_brief(self, hotel_obj: dict) -> str:
        return self.kb_service.render_concise_brief(hotel_obj)

    def compile_brief_with_ai(self, hotel_obj: dict) -> tuple[str, dict]:
        return self.kb_service.compile_brief_with_ai(hotel_obj)

    def get_hotel_brief(self, hotel_id: str, hotel_obj: dict) -> tuple[str, dict, Any]:
        return self.kb_service.get_hotel_brief(hotel_id, hotel_obj)

    # --- Single Outbound Call Delegation ---
    def build_payload(self, data: OutboundCallRequest) -> tuple[dict, dict, Any]:
        return self.single_call_service.build_payload(data)

    def trigger_plivo_http(self, payload: dict) -> dict:
        return self.single_call_service.trigger_plivo_http(payload)

    def make_single_call(self, data: OutboundCallRequest) -> dict:
        return self.single_call_service.make_single_call(data)

    # --- Bulk / Queue Calls Delegation ---
    def enqueue_bulk_calls(self, batch_data: BulkCallRequest) -> dict:
        return self.queue_service.enqueue_bulk_calls(batch_data)

    def get_batch_status(self, batch_id: str) -> Optional[dict]:
        return self.queue_service.get_batch_status(batch_id)

    # --- Webhooks Delegation ---
    def handle_hangup_event(self, event_data: dict) -> None:
        self.webhook_service.handle_hangup_event(event_data)

    def handle_recording_event(self, event_data: dict) -> None:
        self.webhook_service.handle_recording_event(event_data)

    # --- Media Delegation ---
    def fetch_recording_audio(self, recording_id: str) -> Optional[bytes]:
        return self.media_service.fetch_recording_audio(recording_id)

    def transcribe_and_analyze_audio(
        self, audio_bytes: Optional[bytes]
    ) -> tuple[str, list[dict], str, str]:
        return self.media_service.transcribe_and_analyze_audio(audio_bytes)

    def sync_call_media_from_plivo(
        self, call_uuid: str, trigger_id: Optional[str] = None
    ) -> bool:
        return self.media_service.sync_call_media_from_plivo(call_uuid, trigger_id)

    # --- Call History / Queries Delegation ---
    def get_calls(
        self,
        limit: int = 50,
        skip: int = 0,
        status: Optional[str] = None,
        hotel_id: Optional[str] = None,
    ) -> dict:
        return self.query_service.get_calls(
            limit=limit, skip=skip, status=status, hotel_id=hotel_id
        )

    def get_call_by_id(self, call_identifier: str) -> Optional[dict]:
        return self.query_service.get_call_by_id(call_identifier)

    # --- CRM Delegation ---
    def get_crm_data(self,
        limit: int = 50,
        skip: int = 0,
        primary_intent: Optional[str] = None,
        hotel_id: Optional[str] = None,)-> dict:
        return self.query_service.get_crm_data(
            limit=limit, skip=skip, primary_intent=primary_intent, hotel_id=hotel_id
        )