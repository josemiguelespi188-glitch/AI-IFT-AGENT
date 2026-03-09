"""
InvestorLookup — resolves an email/name to an Investor record.

In production this queries the Tribexa API; here we provide the interface
with a simple in-memory stub so the rest of the system works out of the box.
Replace `_fetch_from_portal` with a real HTTP call to your CRM/portal.
"""

import logging
from typing import Optional

import httpx

from config.settings import settings
from models import Investor

logger = logging.getLogger(__name__)


class InvestorLookup:
    async def find(
        self,
        email: Optional[str] = None,
        name: Optional[str] = None,
    ) -> Optional[Investor]:
        if not email and not name:
            return None
        try:
            return await self._fetch_from_portal(email=email, name=name)
        except Exception as exc:
            logger.warning("Investor lookup failed: %s", exc)
            return None

    async def _fetch_from_portal(
        self,
        email: Optional[str],
        name: Optional[str],
    ) -> Optional[Investor]:
        """
        Call the Tribexa API to look up an investor.
        Replace the stub below with a real implementation.
        """
        if not settings.tribexa_api_url or not settings.tribexa_api_key:
            logger.debug("Tribexa not configured — skipping portal lookup.")
            return None

        params = {}
        if email:
            params["email"] = email
        if name:
            params["name"] = name

        async with httpx.AsyncClient(timeout=10.0) as http:
            resp = await http.get(
                f"{settings.tribexa_api_url}/investors/search",
                params=params,
                headers={"Authorization": f"Bearer {settings.tribexa_api_key}"},
            )
            resp.raise_for_status()
            data = resp.json()

        if not data.get("results"):
            return None

        hit = data["results"][0]
        return Investor(
            id=str(hit["id"]),
            full_name=hit.get("full_name", ""),
            email=hit.get("email", email or ""),
            phone=hit.get("phone"),
            entity_type=hit.get("entity_type"),
            accreditation_status=hit.get("accreditation_status"),
            deals=hit.get("deals", []),
            portal_user_id=str(hit.get("portal_user_id", "")),
            notes=hit.get("notes"),
        )
