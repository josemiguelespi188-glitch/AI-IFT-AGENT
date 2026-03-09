from typing import Optional, List
from pydantic import BaseModel


class Investor(BaseModel):
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    entity_type: Optional[str] = None       # individual / LLC / trust / etc.
    accreditation_status: Optional[str] = None
    deals: List[str] = []                   # list of deal IDs or names
    portal_user_id: Optional[str] = None
    notes: Optional[str] = None
