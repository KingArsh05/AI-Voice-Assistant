from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class InitiateCallRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    from_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    to_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    persona: str = Field(default="support")
    prompt: Optional[str] = Field(default="")
    hotel_id: Optional[str] = Field(default=None, description="Selected Hotel ID for dynamic AI prompt injection")


class CallRecord(BaseModel):
    request_uuid: Optional[str] = None
    trigger_id: Optional[str] = None
    call_uuid: Optional[str] = None
    flow_name: Optional[str] = None
    flow_run_uuid: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_url: Optional[str] = None
    node_name: Optional[str] = None

    username: str
    from_number: str
    to_number: str
    from_country: Optional[str] = None
    to_country: Optional[str] = None
    direction: Optional[str] = None
    bill_rate: Optional[str] = None
    hangup_source: Optional[str] = None

    persona: str
    context: Optional[str] = None
    status: str = "initiated"
    duration: Optional[int] = 0

    recording_url: Optional[str] = None
    recording_uuid: Optional[str] = None
    recording_duration: Optional[int] = 0
    transcript: Optional[str] = None
    summary: Optional[str] = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        """Helper to convert Pydantic object to clean Mongo dict."""
        return self.model_dump()