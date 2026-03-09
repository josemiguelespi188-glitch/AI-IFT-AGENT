from enum import Enum
from typing import Optional
from pydantic import BaseModel


class InquiryChannel(str, Enum):
    ZENDESK = "zendesk"
    EMAIL = "email"
    PORTAL = "portal"


class InquiryCategory(str, Enum):
    DISTRIBUTIONS = "distributions"
    TAX_DOCUMENTS = "tax_documents"
    ACCOUNT_ACTIVATION = "account_activation"
    BANKING_CHANGES = "banking_changes"
    ACCREDITATION = "accreditation"
    INVESTMENT_STATUS = "investment_status"
    REDEMPTION_REQUEST = "redemption_request"
    TECHNICAL_PORTAL_HELP = "technical_portal_help"
    OTHER = "other"


class Inquiry(BaseModel):
    id: str
    channel: InquiryChannel
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    subject: Optional[str] = None
    body: str
    client_name: Optional[str] = None   # sponsor / fund name mentioned
    deal_name: Optional[str] = None
    category: Optional[InquiryCategory] = None
    raw_metadata: dict = {}
