from typing import Optional
from pydantic import BaseModel
from .inquiry import InquiryCategory, InquiryChannel


class AgentResponse(BaseModel):
    inquiry_id: str
    channel: InquiryChannel
    category: InquiryCategory
    responded: bool                         # True = auto-responded, False = escalated
    response_text: Optional[str] = None
    subject_line: Optional[str] = None      # for email/zendesk
    confidence: float = 0.0                 # 0.0–1.0
    escalation_payload: Optional["EscalationPayload"] = None


class EscalationPayload(BaseModel):
    inquiry_id: str
    investor_name: Optional[str]
    investor_email: Optional[str]
    client_name: Optional[str]
    deal_name: Optional[str]
    channel: InquiryChannel
    category: InquiryCategory
    original_text: str
    info_found: str
    info_gaps: str
    draft_response: Optional[str]
