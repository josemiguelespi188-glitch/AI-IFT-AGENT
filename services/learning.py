"""
LearningService — stores human-approved Q&A pairs back into the knowledge base.
"""

import logging
from datetime import datetime, timezone

from knowledge.vector_store import VectorStore

logger = logging.getLogger(__name__)


class LearningService:
    def __init__(self, vector_store: VectorStore):
        self.vector_store = vector_store

    def record_approved_response(
        self,
        *,
        client: str,
        deal: str,
        category: str,
        question: str,
        approved_answer: str,
        approved_by: str,
    ) -> None:
        """
        After a human approves/edits an escalated response, call this to
        persist the example so similar future inquiries can be auto-answered.
        """
        example = {
            "client": client,
            "deal": deal,
            "category": category,
            "question": question,
            "answer": approved_answer,
            "approved_by": approved_by,
            "approved_at": datetime.now(tz=timezone.utc).isoformat(),
        }
        self.vector_store.add_example(example)
        logger.info(
            "Learned new example — client=%s category=%s approved_by=%s",
            client, category, approved_by,
        )
