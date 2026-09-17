from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class CallStatus(str, Enum):
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    NO_ANSWER = "no-answer"
    BUSY = "busy"
    REJECTED = "rejected"
    FAILED = "failed"
    CANCELED = "canceled"


class TerminationSource(str, Enum):
    AGENT = "agent"        # StayChat AI disconnected
    CUSTOMER = "customer"  # User hung up on their device
    SYSTEM = "system"      # Telecom network / timeout / error
    UNKNOWN = "unknown"


class TerminationReason(str, Enum):
    NORMAL_CLEARING = "normal-clearing"
    NO_ANSWER = "no-answer"
    USER_REJECTED = "user-rejected"
    BUSY = "busy"
    CALL_REJECTED = "call-rejected"
    TIMEOUT = "timeout"
    ERROR = "error"
    UNKNOWN = "unknown"


class SpeakerRole(str, Enum):
    AGENT = "agent"
    USER = "user"
    SYSTEM = "system"


class TranscriptMessage(BaseModel):
    """Structured individual speech turn in conversation."""
    speaker: SpeakerRole = Field(..., description="Role of the speaker: agent, user, or system")
    text: str = Field(..., min_length=1, description="Speech utterance or message content")
    timestamp: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of when the utterance occurred"
    )
    duration_seconds: Optional[float] = Field(default=None, ge=0)


class TerminationDetails(BaseModel):
    """Clean audit of how the call ended."""
    source: TerminationSource = Field(
        default=TerminationSource.UNKNOWN,
        description="Who initiated disconnect: agent, customer, or system"
    )
    reason: Optional[str] = Field(
        default=None,
        description="Plivo hangup cause e.g. normal-clearing, no-answer, busy, rejected"
    )
    duration_seconds: int = Field(default=0, ge=0, description="Billable/actual connected duration in seconds")


class RecordingArtifacts(BaseModel):
    """Audio recording telemetry."""
    url: Optional[str] = Field(default=None, description="Direct Plivo audio recording URL (WAV/MP3)")
    uuid: Optional[str] = Field(default=None, description="Plivo recording UUID")
    duration_seconds: int = Field(default=0, ge=0, description="Audio file duration in seconds")
    format: str = Field(default="wav")


class AICallArtifacts(BaseModel):
    """AI Conversation and LLM artifacts."""
    summary: Optional[str] = Field(default=None, description="AI-generated post-call summary")
    transcript_text: Optional[str] = Field(default=None, description="Flat text of conversation")
    conversation: List[TranscriptMessage] = Field(
        default_factory=list,
        description="Turn-by-turn dialogue list with speaker and utterance"
    )
    sentiment: Optional[str] = Field(default=None, description="Sentiment analysis result if enabled")


class CallCost(BaseModel):
    """Call financial metrics."""
    rate_per_min: Optional[float] = Field(default=None, ge=0)
    currency: str = Field(default="USD")


class CallSessionModel(BaseModel):
    """
    Scalable, minimal MongoDB Call Document.
    Only stores operational fields needed by the frontend and future workflows.
    """
    # 1. Identifiers
    trigger_id: str = Field(..., description="Plivo trigger api_id")
    call_uuid: Optional[str] = None
    conversation_id: Optional[str] = None
    conversation_url: Optional[str] = None
    flow_name: Optional[str] = None

    # 2. Telephony
    username: str = Field(..., min_length=1, max_length=100)
    from_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    to_number: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    from_country: Optional[str] = None
    to_country: Optional[str] = None
    direction: str = "outbound"
    persona: str = "support"
    prompt: Optional[str] = ""
    context: Optional[str] = ""

    # 3. State & Termination
    status: CallStatus = CallStatus.INITIATED
    termination: TerminationDetails = Field(default_factory=TerminationDetails)

    # 4. Media & AI Assets
    recording: RecordingArtifacts = Field(default_factory=RecordingArtifacts)
    ai: AICallArtifacts = Field(default_factory=AICallArtifacts)
    cost: CallCost = Field(default_factory=CallCost)

    # 5. Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def to_mongo(self) -> dict:
        data = self.model_dump()
        # Flat aliases for frontend UI compatibility
        data["request_uuid"] = self.trigger_id
        data["duration"] = self.termination.duration_seconds
        data["hangup_source"] = self.termination.source.value
        data["hangup_cause"] = self.termination.reason
        data["recording_url"] = self.recording.url
        data["recording_uuid"] = self.recording.uuid
        data["recording_duration"] = self.recording.duration_seconds
        data["transcript"] = self.ai.transcript_text
        data["summary"] = self.ai.summary
        data["bill_rate"] = str(self.cost.rate_per_min) if self.cost.rate_per_min else None
        return data
