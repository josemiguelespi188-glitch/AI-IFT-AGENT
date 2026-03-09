"""
VectorStore — lightweight in-memory knowledge base using cosine similarity
on TF-IDF vectors. No external vector DB required; swap with Pinecone/Chroma
for production scale.
"""

import json
import logging
import math
import re
from collections import Counter
from pathlib import Path
from typing import Optional

from models.inquiry import InquiryCategory

logger = logging.getLogger(__name__)

_KB_PATH = Path(__file__).parent.parent / "data" / "knowledge_base" / "general.json"
_LEARNED_PATH = Path(__file__).parent.parent / "data" / "knowledge_base" / "learned_examples.json"


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-z0-9]+", text.lower())


def _tfidf_vector(tokens: list[str], idf: dict[str, float]) -> dict[str, float]:
    tf = Counter(tokens)
    total = sum(tf.values()) or 1
    return {t: (count / total) * idf.get(t, 0) for t, count in tf.items()}


def _cosine(a: dict[str, float], b: dict[str, float]) -> float:
    dot = sum(a.get(k, 0) * v for k, v in b.items())
    mag_a = math.sqrt(sum(v ** 2 for v in a.values())) or 1e-9
    mag_b = math.sqrt(sum(v ** 2 for v in b.values())) or 1e-9
    return dot / (mag_a * mag_b)


class VectorStore:
    def __init__(self):
        self._docs: list[dict] = []   # {"text": str, "tokens": list, "meta": dict}
        self._idf: dict[str, float] = {}
        self._load()

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def _load(self):
        entries = []
        # General knowledge base
        if _KB_PATH.exists():
            kb = json.loads(_KB_PATH.read_text())
            for key, item in kb.items():
                text = f"{item.get('topic', key)}\n{item.get('answer', '')}"
                entries.append({"text": text, "meta": {"source": "general", "key": key}})

        # Learned examples
        if _LEARNED_PATH.exists():
            try:
                learned = json.loads(_LEARNED_PATH.read_text())
                for ex in learned:
                    text = f"{ex.get('question', '')} {ex.get('answer', '')}"
                    entries.append({"text": text, "meta": {"source": "learned", **ex}})
            except Exception as exc:
                logger.warning("Could not load learned examples: %s", exc)

        # Tokenize and compute IDF
        tokenized = [_tokenize(e["text"]) for e in entries]
        N = len(tokenized) or 1
        df: Counter = Counter()
        for tokens in tokenized:
            df.update(set(tokens))
        self._idf = {t: math.log(N / (count + 1)) + 1 for t, count in df.items()}

        for entry, tokens in zip(entries, tokenized):
            entry["tokens"] = tokens
            entry["vector"] = _tfidf_vector(tokens, self._idf)

        self._docs = entries
        logger.info("VectorStore loaded %d documents.", len(self._docs))

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(
        self,
        query: str,
        category: Optional[InquiryCategory] = None,
        client_name: Optional[str] = None,
        top_k: int = 4,
    ) -> list[str]:
        if not self._docs:
            return []

        query_tokens = _tokenize(query)
        query_vec = _tfidf_vector(query_tokens, self._idf)

        scored = []
        for doc in self._docs:
            score = _cosine(query_vec, doc["vector"])
            # Boost client-specific entries
            if client_name and client_name.lower() in doc["text"].lower():
                score += 0.15
            # Boost by category keyword match
            if category and category.value.replace("_", " ") in doc["text"].lower():
                score += 0.10
            scored.append((score, doc["text"]))

        scored.sort(reverse=True)
        return [text for _, text in scored[:top_k] if _ > 0.05]

    # ------------------------------------------------------------------
    # Learning
    # ------------------------------------------------------------------

    def add_example(self, example: dict):
        """Persist a human-approved Q&A example for future use."""
        existing = []
        if _LEARNED_PATH.exists():
            try:
                existing = json.loads(_LEARNED_PATH.read_text())
            except Exception:
                pass

        existing.append(example)
        _LEARNED_PATH.parent.mkdir(parents=True, exist_ok=True)
        _LEARNED_PATH.write_text(json.dumps(existing, indent=2))
        # Reload in-memory index
        self._load()
        logger.info("VectorStore updated with new learned example.")
