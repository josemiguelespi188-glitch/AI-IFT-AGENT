"""
EmailHandler — reads investor emails via IMAP and sends replies via SMTP.
"""

import email
import logging
import uuid
from email.message import EmailMessage
from typing import Optional

import aioimaplib
import aiosmtplib

from config.settings import settings
from models import Inquiry, InquiryChannel, AgentResponse

logger = logging.getLogger(__name__)


class EmailHandler:

    # ------------------------------------------------------------------
    # Fetch unread emails
    # ------------------------------------------------------------------

    async def fetch_unread(self) -> list[Inquiry]:
        if not settings.email_address:
            logger.debug("Email not configured.")
            return []

        try:
            return await self._imap_fetch()
        except Exception as exc:
            logger.error("IMAP fetch error: %s", exc)
            return []

    async def _imap_fetch(self) -> list[Inquiry]:
        imap = aioimaplib.IMAP4_SSL(
            host=settings.email_imap_host,
            port=settings.email_imap_port,
        )
        await imap.wait_hello_from_server()
        await imap.login(settings.email_address, settings.email_password)
        await imap.select("INBOX")

        _, data = await imap.search("UNSEEN")
        uid_list = data[0].split()

        inquiries = []
        for uid in uid_list[-20:]:           # process last 20 unseen messages
            _, msg_data = await imap.fetch(uid, "(RFC822)")
            raw = msg_data[1]
            parsed = email.message_from_bytes(raw)
            inquiry = self._email_to_inquiry(uid.decode(), parsed)
            if inquiry:
                inquiries.append(inquiry)

        await imap.logout()
        return inquiries

    def _email_to_inquiry(self, uid: str, msg) -> Optional[Inquiry]:
        subject = msg.get("Subject", "")
        from_header = msg.get("From", "")
        # Parse "Name <email>"
        sender_name, sender_email = email.utils.parseaddr(from_header)

        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    payload = part.get_payload(decode=True)
                    if payload:
                        body = payload.decode(errors="replace")
                        break
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body = payload.decode(errors="replace")

        if not body.strip():
            return None

        return Inquiry(
            id=f"email-{uid}",
            channel=InquiryChannel.EMAIL,
            sender_email=sender_email.lower().strip(),
            sender_name=sender_name.strip() or None,
            subject=subject,
            body=body.strip(),
            raw_metadata={"imap_uid": uid},
        )

    # ------------------------------------------------------------------
    # Send reply
    # ------------------------------------------------------------------

    async def send_reply(
        self,
        to_email: str,
        response: AgentResponse,
        in_reply_to: Optional[str] = None,
    ) -> bool:
        if not response.response_text:
            return False

        msg = EmailMessage()
        msg["From"] = settings.email_address
        msg["To"] = to_email
        msg["Subject"] = response.subject_line or "Re: Your Inquiry — Industry FinTech"
        if in_reply_to:
            msg["In-Reply-To"] = in_reply_to
            msg["References"] = in_reply_to

        msg.set_content(
            response.response_text
            + "\n\n--\nIndustry FinTech – Investor Support\nsupport@industryfintech.com"
        )

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.email_smtp_host,
                port=settings.email_smtp_port,
                username=settings.email_address,
                password=settings.email_password,
                start_tls=True,
            )
            logger.info("Email reply sent to %s", to_email)
            return True
        except Exception as exc:
            logger.error("SMTP send failed: %s", exc)
            return False
