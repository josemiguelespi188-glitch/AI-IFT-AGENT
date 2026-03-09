"""
ZendeskHandler — polls Zendesk for new tickets, processes them with the agent,
and posts replies or internal notes.
"""

import logging
import uuid
from typing import Optional

import httpx

from config.settings import settings
from models import Inquiry, InquiryChannel, AgentResponse

logger = logging.getLogger(__name__)

_BASE = "https://{subdomain}.zendesk.com/api/v2"


class ZendeskHandler:
    def __init__(self):
        self._base = _BASE.format(subdomain=settings.zendesk_subdomain)
        self._auth = (
            f"{settings.zendesk_email}/token",
            settings.zendesk_api_token,
        )

    # ------------------------------------------------------------------
    # Fetch new / open tickets
    # ------------------------------------------------------------------

    async def fetch_new_tickets(self) -> list[Inquiry]:
        """Pull unassigned / pending tickets and convert to Inquiry objects."""
        if not settings.zendesk_subdomain:
            logger.debug("Zendesk not configured.")
            return []

        async with httpx.AsyncClient(timeout=15.0) as http:
            resp = await http.get(
                f"{self._base}/tickets.json",
                params={"status": "new", "per_page": 50},
                auth=self._auth,
            )
            resp.raise_for_status()
            tickets = resp.json().get("tickets", [])

        return [self._ticket_to_inquiry(t) for t in tickets]

    def _ticket_to_inquiry(self, ticket: dict) -> Inquiry:
        requester = ticket.get("via", {}).get("source", {}).get("from", {})
        return Inquiry(
            id=f"zd-{ticket['id']}",
            channel=InquiryChannel.ZENDESK,
            sender_email=requester.get("address") or ticket.get("requester_id", ""),
            sender_name=requester.get("name"),
            subject=ticket.get("subject", ""),
            body=ticket.get("description", ""),
            raw_metadata={"zendesk_ticket_id": ticket["id"]},
        )

    # ------------------------------------------------------------------
    # Post reply
    # ------------------------------------------------------------------

    async def post_reply(
        self,
        ticket_id: int,
        response: AgentResponse,
        *,
        public: bool = True,
    ) -> bool:
        """Post a public reply or internal note to a Zendesk ticket."""
        if not response.response_text:
            return False

        body = {
            "ticket": {
                "comment": {
                    "body": response.response_text,
                    "public": public,
                },
                "status": "pending" if response.responded else "open",
            }
        }

        async with httpx.AsyncClient(timeout=15.0) as http:
            try:
                resp = await http.put(
                    f"{self._base}/tickets/{ticket_id}.json",
                    json=body,
                    auth=self._auth,
                )
                resp.raise_for_status()
                logger.info("Zendesk ticket %s updated.", ticket_id)
                return True
            except httpx.HTTPStatusError as exc:
                logger.error("Zendesk reply failed: %s", exc)
                return False

    # ------------------------------------------------------------------
    # Tag ticket for escalation
    # ------------------------------------------------------------------

    async def tag_escalation(self, ticket_id: int, tags: Optional[list[str]] = None) -> None:
        tags = tags or ["axiskey-escalated"]
        body = {"ticket": {"tags": tags, "status": "open"}}
        async with httpx.AsyncClient(timeout=10.0) as http:
            await http.put(
                f"{self._base}/tickets/{ticket_id}.json",
                json=body,
                auth=self._auth,
            )
