"""
IRAgent — Core AI agent that processes investor inquiries using Claude Opus 4.6.
"""

import json
import logging
from typing import Optional

import anthropic

from config.settings import settings
from models import Inquiry, Investor, AgentResponse, EscalationPayload, InquiryCategory
from knowledge.client_rules import ClientRules
from knowledge.vector_store import VectorStore
from .prompts import SYSTEM_PROMPT, CLASSIFY_PROMPT

logger = logging.getLogger(__name__)


class IRAgent:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.client_rules = ClientRules()
        self.vector_store = VectorStore()

    # ------------------------------------------------------------------
    # Public entry point
    # ------------------------------------------------------------------

    async def handle_inquiry(
        self,
        inquiry: Inquiry,
        investor: Optional[Investor] = None,
    ) -> AgentResponse:
        """
        Main pipeline:
        1. Classify inquiry
        2. Resolve client/deal
        3. Fetch relevant knowledge
        4. Ask Claude to respond or escalate
        5. Return structured AgentResponse
        """

        # Step 1 – classify
        inquiry = await self._classify(inquiry)

        # Step 2 – resolve client rules
        client_info = self.client_rules.get(inquiry.client_name)

        # Step 3 – retrieve knowledge snippets
        snippets = self.vector_store.search(
            query=inquiry.body,
            category=inquiry.category,
            client_name=inquiry.client_name,
        )

        # Step 4 – build context and call Claude
        context = self._build_context(inquiry, investor, client_info, snippets)
        raw = await self._call_claude(inquiry, context)

        # Step 5 – parse Claude's structured response
        return self._parse_response(inquiry, raw)

    # ------------------------------------------------------------------
    # Classification
    # ------------------------------------------------------------------

    async def _classify(self, inquiry: Inquiry) -> Inquiry:
        """Ask Claude to classify the inquiry category."""
        prompt = CLASSIFY_PROMPT.format(inquiry_text=inquiry.body)
        response = self.client.messages.create(
            model="claude-opus-4-6",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            data = json.loads(response.content[0].text)
            inquiry.category = InquiryCategory(data.get("category", "other"))
            if data.get("client_hint") and not inquiry.client_name:
                inquiry.client_name = data["client_hint"]
            if data.get("deal_hint") and not inquiry.deal_name:
                inquiry.deal_name = data["deal_hint"]
        except Exception as exc:
            logger.warning("Classification parse error: %s", exc)
            inquiry.category = InquiryCategory.OTHER
        return inquiry

    # ------------------------------------------------------------------
    # Context builder
    # ------------------------------------------------------------------

    def _build_context(
        self,
        inquiry: Inquiry,
        investor: Optional[Investor],
        client_info: Optional[dict],
        snippets: list[str],
    ) -> str:
        parts = []

        if investor:
            parts.append(
                f"INVESTOR VERIFIED: {investor.full_name} ({investor.email})\n"
                f"Entity type: {investor.entity_type or 'unknown'}\n"
                f"Accreditation: {investor.accreditation_status or 'unknown'}\n"
                f"Deals: {', '.join(investor.deals) or 'none on file'}"
            )
        else:
            parts.append("INVESTOR: NOT YET VERIFIED — ask for name + registered email + deal.")

        if client_info:
            parts.append(f"CLIENT RULES:\n{json.dumps(client_info, indent=2)}")

        if snippets:
            parts.append("KNOWLEDGE BASE MATCHES:\n" + "\n---\n".join(snippets))

        parts.append(
            f"INQUIRY DETAILS:\n"
            f"Channel: {inquiry.channel}\n"
            f"Category: {inquiry.category}\n"
            f"Client: {inquiry.client_name or 'unknown'}\n"
            f"Deal: {inquiry.deal_name or 'unknown'}\n"
            f"Subject: {inquiry.subject or '—'}\n"
            f"Body:\n{inquiry.body}"
        )

        return "\n\n".join(parts)

    # ------------------------------------------------------------------
    # Claude call
    # ------------------------------------------------------------------

    async def _call_claude(self, inquiry: Inquiry, context: str) -> str:
        """Stream a response from Claude Opus 4.6 with adaptive thinking."""
        user_message = (
            "Using the context below, process this investor inquiry.\n\n"
            f"{context}\n\n"
            "Return ONLY a valid JSON object (action: respond OR escalate) as specified in your instructions."
        )

        with self.client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=2048,
            thinking={"type": "adaptive"},
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_message}],
        ) as stream:
            response = stream.get_final_message()

        # Extract text block (skip thinking blocks)
        for block in response.content:
            if block.type == "text":
                return block.text

        return "{}"

    # ------------------------------------------------------------------
    # Response parser
    # ------------------------------------------------------------------

    def _parse_response(self, inquiry: Inquiry, raw: str) -> AgentResponse:
        """Parse Claude's JSON output into an AgentResponse."""
        # Strip markdown code fences if present
        text = raw.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            logger.error("Could not parse Claude response as JSON: %s", raw[:300])
            return self._fallback_escalation(inquiry, raw)

        action = data.get("action", "escalate")

        if action == "respond":
            return AgentResponse(
                inquiry_id=inquiry.id,
                channel=inquiry.channel,
                category=inquiry.category or InquiryCategory.OTHER,
                responded=True,
                response_text=data.get("response_text", ""),
                subject_line=data.get("subject_line"),
                confidence=float(data.get("confidence", 0.8)),
            )

        # Escalate
        payload = EscalationPayload(
            inquiry_id=inquiry.id,
            investor_name=data.get("investor_name") or inquiry.sender_name,
            investor_email=data.get("investor_email") or inquiry.sender_email,
            client_name=data.get("client_name") or inquiry.client_name,
            deal_name=data.get("deal_name") or inquiry.deal_name,
            channel=inquiry.channel,
            category=inquiry.category or InquiryCategory.OTHER,
            original_text=inquiry.body,
            info_found=data.get("info_found", ""),
            info_gaps=data.get("info_gaps", ""),
            draft_response=data.get("draft_response"),
        )
        return AgentResponse(
            inquiry_id=inquiry.id,
            channel=inquiry.channel,
            category=inquiry.category or InquiryCategory.OTHER,
            responded=False,
            response_text=data.get("investor_acknowledgement"),
            confidence=0.0,
            escalation_payload=payload,
        )

    def _fallback_escalation(self, inquiry: Inquiry, raw: str) -> AgentResponse:
        payload = EscalationPayload(
            inquiry_id=inquiry.id,
            investor_name=inquiry.sender_name,
            investor_email=inquiry.sender_email,
            client_name=inquiry.client_name,
            deal_name=inquiry.deal_name,
            channel=inquiry.channel,
            category=inquiry.category or InquiryCategory.OTHER,
            original_text=inquiry.body,
            info_found="",
            info_gaps="Agent response could not be parsed.",
            draft_response=None,
        )
        return AgentResponse(
            inquiry_id=inquiry.id,
            channel=inquiry.channel,
            category=inquiry.category or InquiryCategory.OTHER,
            responded=False,
            response_text=(
                "Thank you for reaching out. Our team has received your inquiry "
                "and will be in touch shortly."
            ),
            confidence=0.0,
            escalation_payload=payload,
        )
