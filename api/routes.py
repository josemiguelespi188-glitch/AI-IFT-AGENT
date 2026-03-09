"""
FastAPI routes for the Axiskey IR Agent.

Endpoints:
  POST /inquiries          — Submit a single inquiry for processing
  POST /inquiries/batch    — Process a batch from any channel
  POST /learn              — Record a human-approved response
  GET  /clients            — List known clients
  GET  /health             — Health check
"""

import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from agent import IRAgent
from channels import ZendeskHandler, EmailHandler, PortalHandler
from models import Inquiry, InquiryChannel, AgentResponse
from services import InvestorLookup, EscalationService, LearningService
from knowledge import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter()

# Shared singletons
_agent = IRAgent()
_investor_lookup = InvestorLookup()
_escalation = EscalationService()
_vector_store = VectorStore()
_learning = LearningService(_vector_store)
_zendesk = ZendeskHandler()
_email = EmailHandler()
_portal = PortalHandler()


# ------------------------------------------------------------------
# Request / Response schemas
# ------------------------------------------------------------------

class InquiryRequest(BaseModel):
    channel: InquiryChannel
    sender_email: Optional[str] = None
    sender_name: Optional[str] = None
    subject: Optional[str] = None
    body: str
    client_name: Optional[str] = None
    deal_name: Optional[str] = None


class LearnRequest(BaseModel):
    client: str
    deal: str
    category: str
    question: str
    approved_answer: str
    approved_by: str


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------

@router.get("/health")
async def health():
    return {"status": "ok", "service": "axiskey-ir-agent"}


@router.get("/clients")
async def list_clients():
    from knowledge import ClientRules
    return {"clients": ClientRules().list_clients()}


@router.post("/inquiries", response_model=AgentResponse)
async def process_inquiry(
    req: InquiryRequest,
    background_tasks: BackgroundTasks,
):
    """
    Submit an investor inquiry from any channel.
    Returns an AgentResponse (responded=True → send reply, responded=False → escalated).
    """
    inquiry = Inquiry(
        id=str(uuid.uuid4()),
        channel=req.channel,
        sender_email=req.sender_email,
        sender_name=req.sender_name,
        subject=req.subject,
        body=req.body,
        client_name=req.client_name,
        deal_name=req.deal_name,
    )

    # Look up investor
    investor = await _investor_lookup.find(
        email=req.sender_email,
        name=req.sender_name,
    )

    # Run agent
    response = await _agent.handle_inquiry(inquiry, investor)

    # Handle escalation in background
    if not response.responded and response.escalation_payload:
        background_tasks.add_task(
            _escalation.escalate, response.escalation_payload
        )

    return response


@router.post("/inquiries/batch")
async def process_batch(background_tasks: BackgroundTasks):
    """
    Pull and process all pending inquiries from every configured channel.
    Returns a summary.
    """
    results = {"processed": 0, "responded": 0, "escalated": 0, "errors": 0}

    async def handle(inquiry: Inquiry):
        try:
            investor = await _investor_lookup.find(
                email=inquiry.sender_email,
                name=inquiry.sender_name,
            )
            response = await _agent.handle_inquiry(inquiry, investor)
            results["processed"] += 1

            if response.responded:
                results["responded"] += 1
                # Deliver reply via the correct channel
                if inquiry.channel == InquiryChannel.ZENDESK:
                    tid = inquiry.raw_metadata.get("zendesk_ticket_id")
                    if tid:
                        await _zendesk.post_reply(tid, response)
                elif inquiry.channel == InquiryChannel.EMAIL:
                    if inquiry.sender_email:
                        await _email.send_reply(inquiry.sender_email, response)
                elif inquiry.channel == InquiryChannel.PORTAL:
                    mid = inquiry.raw_metadata.get("portal_message_id")
                    if mid:
                        await _portal.post_reply(mid, response)
            else:
                results["escalated"] += 1
                if response.escalation_payload:
                    await _escalation.escalate(response.escalation_payload)
                    # Send acknowledgement to investor
                    if response.response_text and inquiry.sender_email:
                        ack = AgentResponse(
                            inquiry_id=inquiry.id,
                            channel=inquiry.channel,
                            category=response.category,
                            responded=True,
                            response_text=response.response_text,
                            subject_line="We received your inquiry — Industry FinTech",
                        )
                        if inquiry.channel == InquiryChannel.EMAIL:
                            await _email.send_reply(inquiry.sender_email, ack)
        except Exception as exc:
            logger.error("Error processing inquiry %s: %s", inquiry.id, exc)
            results["errors"] += 1

    # Fetch from all channels
    zendesk_tickets = await _zendesk.fetch_new_tickets()
    email_messages = await _email.fetch_unread()
    portal_messages = await _portal.fetch_new_messages()

    all_inquiries = zendesk_tickets + email_messages + portal_messages

    for inquiry in all_inquiries:
        await handle(inquiry)

    return results


@router.post("/learn")
async def learn(req: LearnRequest):
    """Record a human-approved response to improve future auto-replies."""
    _learning.record_approved_response(
        client=req.client,
        deal=req.deal,
        category=req.category,
        question=req.question,
        approved_answer=req.approved_answer,
        approved_by=req.approved_by,
    )
    return {"status": "learned", "category": req.category}
