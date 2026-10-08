from pydantic import BaseModel, Field
from typing import Optional, List


class OutboundCallRequest(BaseModel):
    to_number: str = Field(
        ..., description="Recipient phone number with country code e.g. +919876543210"
    )
    guest_name: str = Field(default="Guest", description="Name of the guest")
    hotel_id: Optional[str] = Field(
        default=None, description="Hotel identifier for knowledge base"
    )
    guest_lead: Optional[str] = Field(
        default="", description="Drop-off reason or pending inquiry"
    )
    dry_run: bool = Field(
        default=False, description="Set True for ₹0 testing in Postman or Development"
    )


class BulkCallItem(BaseModel):
    to_number: str
    guest_name: Optional[str] = "Guest"
    guest_lead: Optional[str] = None


class BulkCallRequest(BaseModel):
    hotel_id: Optional[str] = None
    dry_run: bool = False
    rate_limit_second: float = Field(default=2.0, ge=1.0, le=5.0)
    contacts: List[BulkCallItem]
