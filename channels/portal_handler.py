"""
PortalHandler — polls and replies to messages in the Tribexa investor portal.
"""

import logging
from typing import Optional

import httpx

from config.settings import settings
from models import Inquiry, InquiryChannel, AgentResponse

logger = logging.getLogger(__name__)


class PortalHandler:
    def __init__(self):
        self._headers = {
            "Authorization": f"Bearer {settings.tribexa_api_key}",
            "Content-Type": "application/json",
        }

    # ------------------------------------------------------------------
    # Fetch new portal messages
    # ------------------------------------------------------------------

    async def fetch_new_messages(self) -> list[Inquiry]:
        if not settings.tribexa_api_url:
            logger.debug("Tribexa portal not configured.")
            return []

        async with httpx.AsyncClient(timeout=15.0) as http:
            try:
                resp = await http.get(
                    f"{settings.tribexa_api_url}/messages/inbox",
                    headers=self._headers,
                    params={"status": "unread", "limit": 50},
                )
                resp.raise_for_status()
                messages = resp.json().get("messages", [])
                return [self._message_to_inquiry(m) for m in messages]
            except Exception as exc:
                logger.error("Portal fetch error: %s", exc)
                return []

    def _message_to_inquiry(self, msg: dict) -> Inquiry:
        return Inquiry(
            id=f"portal-{msg['id']}",
            channel=InquiryChannel.PORTAL,
            sender_email=msg.get("investor_email"),
            sender_name=msg.get("investor_name"),
            subject=msg.get("subject"),
            body=msg.get("body", ""),
            client_name=msg.get("fund_name"),
            deal_name=msg.get("deal_name"),
            raw_metadata={"portal_message_id": msg["id"], "investor_id": msg.get("investor_id")},
        )

    # ------------------------------------------------------------------
    # Post reply in portal
    # ------------------------------------------------------------------

    async def post_reply(
        self,
        message_id: str,
        response: AgentResponse,
    ) -> bool:
        if not response.response_text:
            return False

        payload = {
            "reply_to": message_id,
            "body": response.response_text,
            "sender": "IFT Investor Support",
        }

        async with httpx.AsyncClient(timeout=15.0) as http:
            try:
                resp = await http.post(
                    f"{settings.tribexa_api_url}/messages/reply",
                    headers=self._headers,
                    json=payload,
                )
                resp.raise_for_status()
                logger.info("Portal reply sent for message %s", message_id)
                return True
            except httpx.HTTPStatusError as exc:
                logger.error("Portal reply failed: %s", exc)
                return False
