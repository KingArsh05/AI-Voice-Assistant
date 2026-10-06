from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, timezone
import re


class InitiateCallRequest(BaseModel):
    guest_name: str = Field(default="Guest", max_length=100, description="The prospective guest / lead being called — used for greeting")
    from_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    to_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    persona: str = Field(default="lead_followup", description="Persona for lead follow-up & booking conversion")
    guest_lead: Optional[str] = Field(default="", description="Guest lead enquiry / booking interest details")
    hotel_id: Optional[str] = Field(default=None, description="Selected Hotel ID for dynamic AI prompt injection")

    @field_validator("guest_name", mode="before")
    @classmethod
    def clean_and_validate_guest_name(cls, v: Optional[str]) -> str:
        if not v or not isinstance(v, str):
            return "Guest"
        s = v.strip()
        # Strip leading/trailing non-letters (like emojis, hearts, symbols)
        s_clean = re.sub(r"^[^\w\s\u0900-\u097F]+|[^\w\s\u0900-\u097F]+$", "", s).strip()
        # If it was purely emojis (e.g. 💖, 😊) or less than 2 chars, fallback safely
        if len(s_clean) < 2:
            return "Guest"
        return s_clean[:100]


class CallRecord(BaseModel):
    request_uuid: Optional[str] = None
    trigger_id: Optional[str] = None
    call_uuid: Optional[str] = None
    flow_name: Optional[str] = None
    flow_run_uuid: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_url: Optional[str] = None
    node_name: Optional[str] = None

    guest_name: Optional[str] = None
    from_number: str
    to_number: str
    from_country: Optional[str] = None
    to_country: Optional[str] = None
    direction: Optional[str] = None
    bill_rate: Optional[str] = None
    hangup_source: Optional[str] = None

    persona: str = "lead_followup"
    guest_lead: Optional[str] = None
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