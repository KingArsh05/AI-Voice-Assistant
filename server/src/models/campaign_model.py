from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum


class CampaignStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class LeadStatus(str, Enum):
    QUEUED = "queued"
    CALLING = "calling"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    NO_ANSWER = "no-answer"
    BUSY = "busy"
    REJECTED = "rejected"


class LeadEntry(BaseModel):
    serial: Optional[int] = None
    guest_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    lead_details: Optional[str] = Field(default="", max_length=1000)
    status: LeadStatus = LeadStatus.QUEUED
    call_trigger_id: Optional[str] = None
    call_status: Optional[str] = None
    duration: Optional[int] = 0
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    attempt_count: int = 0


class CreateCampaignRequest(BaseModel):
    name: Optional[str] = Field(default="Bulk Lead Campaign", max_length=150)
    hotel_id: Optional[str] = None
    from_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    persona: str = Field(default="lead_followup")
    cooldown_seconds: int = Field(default=15, ge=0, description="Rest period between calls (e.g. 10-30 seconds)")
    max_call_duration_seconds: int = Field(default=240, ge=30, le=3600, description="Max allowed duration for one call (e.g. 180-240s / 3-4 mins)")
    max_retries: int = Field(default=0, ge=0, le=10)
    leads: List[LeadEntry] = Field(..., min_length=1)
