"""
Duplicate Detection Service
Uses sentence-transformers all-MiniLM-L6-v2 to detect similar tickets.

Redis integration: query embeddings and duplicate-check results are cached
so repeated analysis of the same text skips the model entirely.
Cache misses fall through to the model transparently.
"""

import os
import json
import logging
import torch
from sentence_transformers import SentenceTransformer, util

from backend.services.cache_service import cache_service

logger = logging.getLogger(__name__)

SIMILARITY_THRESHOLD = 0.70


class DuplicateService:
    def __init__(self):
        self.model = None
        self._loaded = False
        self._load_failed = False
        # In-memory store: list of (ticket_id, embedding, text)
        self._tickets: list[tuple[str, object, str]] = []
        self.storage_file = os.path.join(
            os.path.dirname(__file__), "..", "data", "case_history_cache.json"
        )
        os.makedirs(os.path.dirname(self.storage_file), exist_ok=True)

    def is_available(self) -> bool:
        return self._loaded and not self._load_failed

    def load(self):
        """Load the sentence-transformer model and restore saved tickets."""
        if self._loaded or self._load_failed:
            return

        print("[DuplicateService] Loading model...")
        try:
            model_path = os.environ.get("SENTENCE_TRANSFORMER_MODEL_PATH")
            if model_path and os.path.exists(model_path):
                print(f"[DuplicateService] Loading from local path: {model_path}")
                self.model = SentenceTransformer(model_path)
            else:
                self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self._loaded = True

            if os.path.exists(self.storage_file):
                print(f"[DuplicateService] Syncing ticket history from {self.storage_file}...")
                try:
                    with open(self.storage_file, "r") as f:
                        data = json.load(f)
                    for item in data:
                        text = item["text"]
                        embedding = self._encode_with_cache(text)
                        self._tickets.append((item["ticket_id"], embedding, text))
                    print(f"[DuplicateService] Loaded {len(self._tickets)} tickets.")
                except Exception as exc:
                    print(f"[DuplicateService] Error loading storage: {exc}")
        except Exception as exc:
            allow_degraded = os.environ.get("ALLOW_DEGRADED_STARTUP", "0") == "1"
            self._load_failed = True
            print(f"[DuplicateService] Failed to load model: {exc}")
            if allow_degraded:
                print("[DuplicateService] DEGRADED: Continuing without model (ALLOW_DEGRADED_STARTUP=1)")
                self.model = None
                self._loaded = False
            else:
                raise

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _encode_with_cache(self, text: str):
        """
        Return a sentence-transformer embedding tensor for *text*.

        Strategy:
        1. Check Redis for a pre-computed embedding stored as a JSON float list.
        2. On hit, deserialize and convert back to a tensor — zero model inference.
        3. On miss, run the model, then persist the result to Redis for future calls.
        """
        cached_vector = cache_service.get_embedding(text)
        if cached_vector is not None:
            logger.debug("[DuplicateService] Embedding cache HIT for text (len=%d)", len(text))
            return torch.tensor(cached_vector)

        # Cache miss: compute via model
        embedding_tensor = self.model.encode(text, convert_to_tensor=True)

        # Persist as a plain Python list so JSON serialisation is trivial
        cache_service.set_embedding(text, embedding_tensor.tolist())
        logger.debug("[DuplicateService] Embedding cache SET for text (len=%d)", len(text))
        return embedding_tensor

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def save_to_disk(self, ticket_id: str, text: str):
        """Append a new ticket entry to the JSON persistence file."""
        data: list = []
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

            data.append({"ticket_id": ticket_id, "text": text})
            with open(self.storage_file, "w") as f:
                json.dump(data, f, indent=2)
            print(f"[DuplicateService] Indexed ticket {ticket_id} to case history.")
        except Exception as exc:
            print(f"[DuplicateService] Failed to save to disk: {exc}")

    def add_ticket(self, ticket_id: str, text: str):
        """
        Index a new ticket.

        Computes (or retrieves from Redis cache) the embedding, adds it to
        the in-memory store, persists to disk, and invalidates stale
        duplicate-result cache entries so future checks reflect this new ticket.
        """
        self.load()
        if not self.is_available():
            print(
                f"[DuplicateService] DEGRADED: Skipping embedding for ticket {ticket_id} (model not available)"
            )
            return

        embedding = self._encode_with_cache(text)
        self._tickets.append((ticket_id, embedding, text))
        self.save_to_disk(ticket_id, text)

        # Evict stale duplicate-result entries: a cached "no duplicate" answer
        # is now potentially wrong since a new similar ticket was just indexed.
        evicted = cache_service.invalidate_duplicate_cache()
        if evicted:
            logger.debug(
                "[DuplicateService] Evicted %d stale dup-result cache entries after indexing ticket %s.",
                evicted,
                ticket_id,
            )

    def check_duplicate(self, text: str, threshold: float | None = None) -> dict:
        """
        Check whether *text* matches any previously stored ticket.

        Cache behaviour:
        - A full duplicate-check result (including threshold) is cached so
          identical texts submitted within the TTL window skip all model work.
        - The cache key encodes only the text; if the caller passes a custom
          threshold, bypass caching to avoid returning stale threshold-specific
          results.

        Returns:
            {
                "is_duplicate": bool,
                "duplicate_ticket_id": str | None,
                "similarity": float
            }
        """
        self.load()

        if not self.is_available():
            print("[DuplicateService] DEGRADED: Duplicate check skipped (model not available)")
            return {
                "is_duplicate": False,
                "duplicate_ticket_id": None,
                "similarity": 0.0,
            }

        active_threshold = threshold if threshold is not None else SIMILARITY_THRESHOLD
        use_default_threshold = threshold is None

        # Try the result cache only when using the default threshold so we
        # don't serve threshold-mismatched cached results.
        if use_default_threshold:
            cached_result = cache_service.get_duplicate_result(text)
            if cached_result is not None:
                logger.debug("[DuplicateService] Duplicate-result cache HIT")
                return cached_result

        if not self._tickets:
            result = {
                "is_duplicate": False,
                "duplicate_ticket_id": None,
                "similarity": 0.0,
            }
            if use_default_threshold:
                cache_service.set_duplicate_result(text, result)
            return result

        query_embedding = self._encode_with_cache(text)

        best_score = 0.0
        best_id = None

        for ticket_id, stored_emb, _ in self._tickets:
            score = util.cos_sim(query_embedding, stored_emb).item()
            if score > best_score:
                best_score = score
                best_id = ticket_id

        is_dup = best_score >= active_threshold

        result = {
            "is_duplicate": is_dup,
            "duplicate_ticket_id": best_id if is_dup else None,
            "similarity": round(best_score, 4),
        }

        if use_default_threshold:
            cache_service.set_duplicate_result(text, result)

        return result
