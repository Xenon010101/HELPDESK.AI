"""
Duplicate Detection Service
Uses sentence-transformers all-MiniLM-L6-v2 to detect similar tickets.

Bounded cache: stores at most DUPLICATE_CACHE_MAX entries (default 5000).
Pre-computed embeddings are persisted to avoid re-encoding on startup.
"""

import logging
import os

from sentence_transformers import SentenceTransformer, util

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.70
MAX_CACHE_ENTRIES = int(os.environ.get("DUPLICATE_CACHE_MAX", "5000"))


class DuplicateService:
    def __init__(self):
        self.model = None
        self._loaded = False
        self._load_failed = False
        # In-memory store: list of (ticket_id, embedding, text)
        self._tickets: list[tuple[str, object, str]] = []
        self.storage_file = os.path.join(os.path.dirname(__file__), "..", "data", "case_history_cache.json")
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)

    def is_available(self) -> bool:
        """Check if the model is available for duplicate detection."""
        return self._loaded and not self._load_failed

    def load(self):
        """Load the sentence-transformer model and saved tickets."""
        if self._loaded or self._load_failed:
            return

        logger.info("[DuplicateService] Loading model...")
        try:
            # Check if a local model path is provided
            model_path = os.environ.get("SENTENCE_TRANSFORMER_MODEL_PATH")
            if model_path and os.path.exists(model_path):
                logger.info("[DuplicateService] Loading from local path: %s", model_path)
                self.model = SentenceTransformer(model_path)
            else:
                # Download from HuggingFace
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self._loaded = True

            if os.path.exists(self.storage_file):
                logger.info("[DuplicateService] Syncing previous ticket history from %s...", self.storage_file)
                import json
                try:
                    with open(self.storage_file, "r") as f:
                        data = json.load(f)
                    # Prune to MAX_CACHE_ENTRIES on load (keep most recent)
                    if len(data) > MAX_CACHE_ENTRIES:
                        logger.info(
                            "[DuplicateService] Pruning cache from %d to %d entries",
                            len(data), MAX_CACHE_ENTRIES,
                        )
                        data = data[-MAX_CACHE_ENTRIES:]
                        # Persist pruned cache immediately
                        with open(self.storage_file, "w") as f:
                            json.dump(data, f, indent=2)

                    re_encoded = 0
                    for item in data:
                        text = item["text"]
                        # Use pre-computed embedding if available, otherwise encode
                        stored_emb = item.get("embedding")
                        if stored_emb is not None:
                            import torch
                            embedding = torch.tensor(stored_emb)
                        else:
                            embedding = self.model.encode(text, convert_to_tensor=True)
                            re_encoded += 1
                        self._tickets.append((item["ticket_id"], embedding, text))

                    if re_encoded > 0:
                        logger.info(
                            "[DuplicateService] Loaded %d tickets (%d re-encoded).",
                            len(self._tickets), re_encoded,
                        )
                    else:
                        logger.info("[DuplicateService] Loaded %d tickets (all from cache).", len(self._tickets))
                except Exception as e:
                    logger.error("[DuplicateService] Error loading storage: %s", e)
        except Exception as e:
            allow_degraded = os.environ.get("ALLOW_DEGRADED_STARTUP", "0") == "1"
            self._load_failed = True
            logger.error("[DuplicateService] Failed to load model: %s", e)
            if allow_degraded:
                logger.warning("[DuplicateService] DEGRADED: Continuing without model (ALLOW_DEGRADED_STARTUP=1)")
                self.model = None
                self._loaded = False
            else:
                raise

    def save_to_disk(self, ticket_id: str, text: str, embedding=None):
        """Append a new ticket to the JSON storage with pre-computed embedding."""
        import json
        data = []
        try:
            os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)
            if os.path.exists(self.storage_file):
                with open(self.storage_file, "r") as f:
                    try:
                        data = json.load(f)
                        if not isinstance(data, list):
                            data = []
                    except Exception:
                        data = []

            entry = {"ticket_id": ticket_id, "text": text}
            if embedding is not None:
                entry["embedding"] = embedding.tolist()

            data.append(entry)

            # Cap cache size — keep only the most recent entries
            if len(data) > MAX_CACHE_ENTRIES:
                data = data[-MAX_CACHE_ENTRIES:]

            with open(self.storage_file, "w") as f:
                json.dump(data, f, indent=2)
            logger.info("[DuplicateService] Indexed ticket %s to case history.", ticket_id)
        except Exception as e:
            logger.error("[DuplicateService] Failed to save to disk: %s", e)

    def add_ticket(self, ticket_id: str, text: str):
        """Add a ticket to the in-memory store and persist to disk."""
        self.load()
        if not self.is_available():
            logger.warning("[DuplicateService] DEGRADED: Skipping embedding for ticket %s (model not available)", ticket_id)
            return

        # Cap in-memory store to match disk cap
        if len(self._tickets) >= MAX_CACHE_ENTRIES:
            self._tickets = self._tickets[-(MAX_CACHE_ENTRIES - 1):]

        embedding = self.model.encode(text, convert_to_tensor=True)
        self._tickets.append((ticket_id, embedding, text))
        self.save_to_disk(ticket_id, text, embedding)

    def check_duplicate(self, text: str, threshold: float = None) -> dict:
        """
        Check if a ticket is a duplicate of any stored ticket.

        Args:
            text: The ticket text to check.
            threshold: Optional override for the similarity threshold.

        Returns:
            {
                "is_duplicate": bool,
                "duplicate_ticket_id": str | None,
                "similarity": float
            }
        """
        self.load()

        # If model is not available, return no duplicate found
        if not self.is_available():
            logger.warning("[DuplicateService] DEGRADED: Duplicate check skipped (model not available)")
            return {
                "is_duplicate": False,
                "duplicate_ticket_id": None,
                "similarity": 0.0,
            }

        # Use provided threshold or default to global constant
        active_threshold = threshold if threshold is not None else SIMILARITY_THRESHOLD

        if not self._tickets:
            return {
                "is_duplicate": False,
                "duplicate_ticket_id": None,
                "similarity": 0.0,
            }

        query_embedding = self.model.encode(text, convert_to_tensor=True)

        best_score = 0.0
        best_id = None

        for ticket_id, stored_emb, _ in self._tickets:
            score = util.cos_sim(query_embedding, stored_emb).item()
            if score > best_score:
                best_score = score
                best_id = ticket_id

        is_dup = best_score >= active_threshold

        return {
            "is_duplicate": is_dup,
            "duplicate_ticket_id": best_id if is_dup else None,
            "similarity": round(best_score, 4),
        }
