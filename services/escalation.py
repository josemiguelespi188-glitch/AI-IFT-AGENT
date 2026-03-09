"""
EscalationService — routes escalation payloads to the IR team via email.
"""

import logging
import json

import aiosmtplib
from email.message import EmailMessage

from config.settings import settings
from models import EscalationPayload

logger = logging.getLogger(__name__)


class EscalationService:
    async def escalate(self, payload: EscalationPayload) -> bool:
        """Send escalation summary to the IR team inbox."""
        try:
            msg = self._build_email(payload)
            await aiosmtplib.send(
                msg,
                hostname=settings.email_smtp_host,
                port=settings.email_smtp_port,
                username=settings.email_address,
                password=settings.email_password,
                start_tls=True,
            )
            logger.info("Escalation sent for inquiry %s", payload.inquiry_id)
            return True
        except Exception as exc:
            logger.error("Escalation email failed: %s", exc)
            return False

    def _build_email(self, payload: EscalationPayload) -> EmailMessage:
        msg = EmailMessage()
        msg["From"] = settings.email_address
        msg["To"] = settings.escalation_email
        msg["Subject"] = (
            f"[Axiskey Escalation] {payload.category.value.replace('_', ' ').title()} "
            f"— {payload.investor_name or 'Unknown Investor'}"
        )

        body = f"""
AXISKEY INVESTOR INQUIRY — ESCALATION REQUIRED
================================================

Inquiry ID  : {payload.inquiry_id}
Channel     : {payload.channel}
Category    : {payload.category.value}
Client      : {payload.client_name or '—'}
Deal        : {payload.deal_name or '—'}

Investor    : {payload.investor_name or '—'}
Email       : {payload.investor_email or '—'}

ORIGINAL MESSAGE:
-----------------
{payload.original_text}

INFORMATION FOUND:
------------------
{payload.info_found or '—'}

INFORMATION GAPS:
-----------------
{payload.info_gaps or '—'}

DRAFT RESPONSE (pending approval):
-----------------------------------
{payload.draft_response or '—'}

================================================
Axiskey AI — Industry FinTech
        """.strip()

        msg.set_content(body)
        return msg
