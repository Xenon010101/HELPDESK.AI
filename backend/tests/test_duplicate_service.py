"""
Unit tests for DuplicateService.check_duplicate method.

Tests cover:
- Threshold override parameter
- Empty ticket store behavior
- Degraded mode when model is not available
"""

import os
import sys
import json
from unittest.mock import patch, MagicMock, PropertyMock
import pytest

# Add backend to path so we can import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

# Mock heavy dependencies before any import
from unittest.mock import MagicMock
sys.modules['sentence_transformers'] = MagicMock()
sys.modules['sentence_transformers.SentenceTransformer'] = MagicMock()
sys.modules['sentence_transformers.util'] = MagicMock()
sys.modules['sentence_transformers.util.cos_sim'] = MagicMock()

from backend.services.duplicate_service import DuplicateService, SIMILARITY_THRESHOLD


class TestDuplicateServiceCheckDuplicate:
    """Test suite for DuplicateService.check_duplicate."""

    @pytest.fixture
    def service(self):
        """Create a DuplicateService instance with mocked model."""
        svc = DuplicateService()
        # Mock the model as loaded with a fake embedding
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock()
        svc.model = mock_model
        svc._loaded = True
        svc._load_failed = False
        svc._tickets = []
        return svc

    def test_check_duplicate_returns_no_match_when_store_empty(self, service):
        """
        When the ticket store is empty and the model is available,
        check_duplicate should return no duplicate.
        """
        result = service.check_duplicate("New ticket about billing issue")

        assert result["is_duplicate"] is False
        assert result["duplicate_ticket_id"] is None
        assert result["similarity"] == 0.0

    def test_check_duplicate_uses_custom_threshold(self, service):
        """
        When a custom threshold is provided, it should be used instead of the
        default SIMILARITY_THRESHOLD.
        """

        # Create a mock that returns a mock with .item() returning float
        class MockCosSim:
            def __init__(self, val):
                self._val = val
            def item(self):
                return self._val

        emb1 = MagicMock()
        mock_model = MagicMock()
        mock_model.encode.return_value = emb1
        service.model = mock_model
        service._tickets.append(("ticket-1", emb1, "Existing ticket about login error"))

        # Need to patch the module-level import inside duplicate_service
        import backend.services.duplicate_service as svc_module
        
        with patch.object(svc_module.util, 'cos_sim', return_value=MockCosSim(0.85)):
            result = service.check_duplicate("Some text", threshold=0.9)
            assert result["is_duplicate"] is False
            assert result["duplicate_ticket_id"] is None

        with patch.object(svc_module.util, 'cos_sim', return_value=MockCosSim(0.85)):
            result = service.check_duplicate("Some text", threshold=0.8)
            assert result["is_duplicate"] is True
            assert result["duplicate_ticket_id"] == "ticket-1"

    def test_check_duplicate_uses_default_threshold(self, service):
        """
        When no threshold is provided, the default SIMILARITY_THRESHOLD should be used.
        """

        class MockCosSim:
            def __init__(self, val):
                self._val = val
            def item(self):
                return self._val

        emb1 = MagicMock()
        mock_model = MagicMock()
        mock_model.encode.return_value = emb1
        service.model = mock_model
        service._tickets.append(("ticket-1", emb1, "Existing ticket"))

        import backend.services.duplicate_service as svc_module

        # Default threshold is 0.70
        with patch.object(svc_module.util, 'cos_sim', return_value=MockCosSim(0.85)):
            result = service.check_duplicate("Some text")
            assert result["is_duplicate"] is True

        with patch.object(svc_module.util, 'cos_sim', return_value=MockCosSim(0.50)):
            result = service.check_duplicate("Some text")
            assert result["is_duplicate"] is False

    def test_check_duplicate_handles_degraded_mode(self, service):
        """
        When the model failed to load (degraded mode), check_duplicate should
        return a safe no-match result.
        """
        service._loaded = False
        service._load_failed = True
        service.model = None

        result = service.check_duplicate("Some ticket text")

        assert result["is_duplicate"] is False
        assert result["duplicate_ticket_id"] is None
        assert result["similarity"] == 0.0

    def test_check_duplicate_finds_duplicate(self, service):
        """
        When a similar ticket exists, check_duplicate should identify it as duplicate.
        """

        class MockCosSim:
            def __init__(self, val):
                self._val = val
            def item(self):
                return self._val

        emb1 = MagicMock()
        mock_model = MagicMock()
        mock_model.encode.return_value = emb1
        service.model = mock_model
        service._tickets.append(("ticket-123", emb1, "Original ticket"))

        import backend.services.duplicate_service as svc_module

        with patch.object(svc_module.util, 'cos_sim', return_value=MockCosSim(0.95)):
            result = service.check_duplicate("Very similar ticket text")
            assert result["is_duplicate"] is True
            assert result["duplicate_ticket_id"] == "ticket-123"
            assert result["similarity"] >= 0.7

    def test_check_duplicate_returns_best_match(self, service):
        """
        When multiple tickets exist, check_duplicate should return the best match.
        """

        class MockCosSim:
            def __init__(self, val):
                self._val = val
            def item(self):
                return self._val

        emb_low = MagicMock()
        emb_high = MagicMock()

        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock()
        service.model = mock_model
        service._tickets.append(("ticket-low", emb_low, "Low similarity ticket"))
        service._tickets.append(("ticket-high", emb_high, "High similarity ticket"))

        # Simulate iteration: first call returns 0.3, second returns 0.85
        similarities = iter([MockCosSim(0.3), MockCosSim(0.85)])

        import backend.services.duplicate_service as svc_module

        with patch.object(svc_module.util, 'cos_sim', side_effect=lambda a, b: next(similarities)):
            result = service.check_duplicate("Some query")
            assert result["is_duplicate"] is True
            assert result["duplicate_ticket_id"] == "ticket-high"
            assert result["similarity"] == 0.85

    def test_check_duplicate_loads_model_if_not_loaded(self, service):
        """
        check_duplicate should call load() if the model hasn't been loaded yet.
        """
        service._loaded = False
        service._load_failed = False

        with patch.object(service, 'load') as mock_load:
            service.check_duplicate("Some text")
            mock_load.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
