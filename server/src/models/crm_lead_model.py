from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum


class LeadStatusCRM(str, Enum):
    NEW = "new"
    FOLLOW_UP = "follow_up"
    IN_PROGRESS = "in_progress"
    BOOKED = "booked"
    COLD = "cold"
    LOST = "lost"


class CRMLeadSource(str, Enum):
    MANUAL = "manual"
    IMPORT = "import"
    WHATSAPP = "whatsapp"
    WEBSITE = "website"
    REFERRAL = "referral"
    OTHER = "other"


class CreateCRMLeadRequest(BaseModel):
    guest_name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., description="Phone number (with or without country code)")
    email: Optional[str] = Field(default=None)
    hotel_id: Optional[str] = Field(default=None)
    lead_details: Optional[str] = Field(default="")
    check_in_date: Optional[str] = Field(default=None)
    check_out_date: Optional[str] = Field(default=None)
    num_guests: Optional[int] = Field(default=None)
    room_preference: Optional[str] = Field(default=None)
    budget: Optional[str] = Field(default=None)
    source: Optional[str] = Field(default=CRMLeadSource.MANUAL.value)
    status: Optional[str] = Field(default=LeadStatusCRM.NEW.value)
    tags: Optional[List[str]] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None)


class UpdateCRMLeadRequest(BaseModel):
    guest_name: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[str] = None
    hotel_id: Optional[str] = None
    lead_details: Optional[str] = None
    check_in_date: Optional[str] = None
    check_out_date: Optional[str] = None
    num_guests: Optional[int] = None
    room_preference: Optional[str] = None
    budget: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
