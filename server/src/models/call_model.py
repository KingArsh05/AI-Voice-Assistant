from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone


class InitiateCallRequest(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    from_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    to_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    persona: str = Field(default="support")
    prompt: Optional[str] = Field(default="")


class CallRecord(BaseModel):
    request_uuid: str
    username: str
    from_number: str
    to_number: str
    persona: str
    status: str = "initiated"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        """Helper to convert Pydantic object to clean Mongo dict."""
        return self.model_dump()
