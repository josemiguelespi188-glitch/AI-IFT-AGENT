"""
ClientRules — loads client-specific JSON configs from data/clients/.
"""

import json
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent.parent / "data" / "clients"


class ClientRules:
    def __init__(self):
        self._rules: dict[str, dict] = {}
        self._load_all()

    def _load_all(self):
        for path in _DATA_DIR.glob("*.json"):
            try:
                data = json.loads(path.read_text())
                name = data.get("client_name", path.stem).lower()
                self._rules[name] = data
                # Also index by file stem for fuzzy lookup
                self._rules[path.stem.replace("_", " ")] = data
            except Exception as exc:
                logger.warning("Could not load client rules from %s: %s", path, exc)

    def get(self, client_name: Optional[str]) -> Optional[dict]:
        """Return client rules for a given client name (case-insensitive fuzzy match)."""
        if not client_name:
            return None
        key = client_name.lower()
        # Exact match
        if key in self._rules:
            return self._rules[key]
        # Partial match
        for stored_key, rules in self._rules.items():
            if stored_key in key or key in stored_key:
                return rules
        return None

    def list_clients(self) -> list[str]:
        seen = set()
        result = []
        for v in self._rules.values():
            name = v.get("client_name", "")
            if name and name not in seen:
                seen.add(name)
                result.append(name)
        return result
