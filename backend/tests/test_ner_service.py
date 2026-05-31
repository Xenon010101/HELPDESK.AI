"""
Unit tests for NERService.
Tests cover: initialization, load behavior, _clean_label parsing,
extract_entities with mocked ML model, and regex fallback layer.
"""

import json
import os
from unittest.mock import MagicMock, patch, PropertyMock

import pytest


@pytest.fixture()
def _mock_torch(monkeypatch):
    """Stub torch and transformers so the module loads without GPU/CPU deps."""
    mock_torch = MagicMock()
    mock_torch.device.return_value = "cpu"
    mock_torch.no_grad.return_value.__enter__ = MagicMock()
    mock_torch.no_grad.return_value.__exit__ = MagicMock()
    monkeypatch.setitem(__import__("sys").modules, "torch", mock_torch)
    monkeypatch.setitem(__import__("sys").modules, "torch.nn", mock_torch.nn)
    monkeypatch.setitem(__import__("sys").modules, "torch.nn.functional", mock_torch.nn.functional)

    mock_transformers = MagicMock()
    monkeypatch.setitem(__import__("sys").modules, "transformers", mock_transformers)
    return mock_torch


@pytest.fixture()
def service(_mock_torch):
    from backend.services.ner_service import NERService
    return NERService()


# ---------------------------------------------------------------------------
# Initialization
# ---------------------------------------------------------------------------

class TestInit:
    def test_default_state(self, service):
        assert service.model is None
        assert service.tokenizer is None
        assert service.id2label is None
        assert service.label2id is None
        assert service._loaded is False


# ---------------------------------------------------------------------------
# _clean_label
# ---------------------------------------------------------------------------

class TestCleanLabel:
    def test_o_tag(self, service):
        assert service._clean_label("O") == ("O", "")

    def test_b_b_prefix(self, service):
        assert service._clean_label("B-B-APP_NAME") == ("B", "APP_NAME")

    def test_i_b_prefix(self, service):
        assert service._clean_label("I-B-APP_NAME") == ("I", "APP_NAME")

    def test_b_prefix(self, service):
        assert service._clean_label("B-LOCATION") == ("B", "LOCATION")

    def test_i_prefix(self, service):
        assert service._clean_label("I-LOCATION") == ("I", "LOCATION")

    def test_unknown_label(self, service):
        assert service._clean_label("UNKNOWN") == ("O", "")


# ---------------------------------------------------------------------------
# REGEX_PATTERNS
# ---------------------------------------------------------------------------

class TestRegexPatterns:
    def test_ip_address_pattern(self):
        from backend.services.ner_service import REGEX_PATTERNS
        import re
        text = "Server at 192.168.1.1 is down"
        match = re.search(REGEX_PATTERNS["IP_ADDRESS"], text)
        assert match is not None
        assert "192.168.1.1" in match.group()

    def test_hostname_pattern(self):
        from backend.services.ner_service import REGEX_PATTERNS
        import re
        text = "srv-prod-01 is unreachable"
        match = re.search(REGEX_PATTERNS["HOSTNAME"], text)
        assert match is not None

    def test_network_error_pattern(self):
        from backend.services.ner_service import REGEX_PATTERNS
        import re
        for keyword in ["Network issues", "Timeout", "Connection failed"]:
            match = re.search(REGEX_PATTERNS["NETWORK_ERROR"], keyword)
            assert match is not None, f"Failed to match: {keyword}"

    def test_vlan_pattern(self):
        from backend.services.ner_service import REGEX_PATTERNS
        import re
        match = re.search(REGEX_PATTERNS["VLAN"], "VLAN100 is configured")
        assert match is not None

    def test_database_pattern(self):
        from backend.services.ner_service import REGEX_PATTERNS
        import re
        for keyword in ["SQL", "Postgres", "Database"]:
            match = re.search(REGEX_PATTERNS["DATABASE"], keyword)
            assert match is not None

    def test_browser_pattern(self):
        from backend.services.ner_service import REGEX_PATTERNS
        import re
        for browser in ["Chrome", "Firefox", "Safari"]:
            match = re.search(REGEX_PATTERNS["BROWSER"], browser)
            assert match is not None


# ---------------------------------------------------------------------------
# extract_entities (with mocked model)
# ---------------------------------------------------------------------------

class TestExtractEntities:
    def _make_service_with_mock_model(self, service, predicted_labels, confidences=0.95):
        """Helper to set up NERService with a mocked model that returns
        specified label predictions."""
        import torch

        mock_model = MagicMock()
        mock_tokenizer = MagicMock()

        # Build id2label mapping
        unique_labels = list(set(predicted_labels))
        id2label = {str(i): label for i, label in enumerate(unique_labels)}
        label2id = {label: int(i) for i, label in id2label.items()}

        service.model = mock_model
        service.tokenizer = mock_tokenizer
        service.id2label = id2label
        service.label2id = label2id
        service._loaded = True

        # Mock tokenizer output
        num_tokens = len(predicted_labels)
        encoding = MagicMock()
        encoding.__getitem__ = MagicMock(return_value=MagicMock(
            to=MagicMock(return_value=MagicMock()),
        ))
        word_ids_map = []
        for i in range(num_tokens):
            word_ids_map.append(i)
        encoding.word_ids.return_value = word_ids_map

        mock_tokenizer.return_value = encoding

        # Mock model output
        mock_logits = MagicMock()
        mock_probs = MagicMock()

        # Create predicted IDs tensor
        pred_ids = [label2id[label] for label in predicted_labels]

        # Mock softmax and argmax chain
        with patch("backend.services.ner_service.F") as mock_F:
            with patch("backend.services.ner_service.torch") as mock_torch_mod:
                mock_torch_mod.no_grad.return_value.__enter__ = MagicMock()
                mock_torch_mod.no_grad.return_value.__exit__ = MagicMock()
                mock_torch_mod.device.return_value = "cpu"

                mock_output = MagicMock()
                mock_model.return_value = mock_output

                # The mock chain: F.softmax -> argmax -> squeeze -> cpu -> tolist
                mock_probs_tensor = MagicMock()
                mock_F.softmax.return_value = mock_probs_tensor

                mock_argmax_result = MagicMock()
                mock_probs_tensor.argmax.return_value = mock_argmax_result

                mock_squeezed = MagicMock()
                mock_argmax_result.squeeze.return_value = mock_squeezed

                mock_cpu = MagicMock()
                mock_squeezed.cpu.return_value = mock_cpu
                mock_cpu.tolist.return_value = pred_ids

                # max values
                mock_max_values = MagicMock()
                mock_max_result = MagicMock()
                mock_max_result.values = mock_max_values
                mock_probs_tensor.max.return_value = mock_max_result

                mock_max_squeezed = MagicMock()
                mock_max_values.squeeze.return_value = mock_max_squeezed
                mock_max_cpu = MagicMock()
                mock_max_squeezed.cpu.return_value = mock_max_cpu
                mock_max_cpu.tolist.return_value = [confidences] * num_tokens

                return service

    def test_empty_text(self, service):
        service._loaded = True
        service.model = MagicMock()
        service.tokenizer = MagicMock()
        result = service.extract_entities("")
        assert result == []

    def test_regex_fallback_ip(self, service):
        """Even without model entities, regex should catch IP addresses."""
        service._loaded = True
        service.model = MagicMock()
        service.tokenizer = MagicMock()

        # Mock tokenizer + model to return all O labels
        encoding = MagicMock()
        encoding.__getitem__ = MagicMock(return_value=MagicMock(
            to=MagicMock(return_value=MagicMock()),
        ))
        encoding.word_ids.return_value = [0, 1, 2, 3, 4]
        service.tokenizer.return_value = encoding

        with patch("backend.services.ner_service.F") as mock_F:
            with patch("backend.services.ner_service.torch") as mock_torch_mod:
                mock_torch_mod.no_grad.return_value.__enter__ = MagicMock()
                mock_torch_mod.no_grad.return_value.__exit__ = MagicMock()

                mock_output = MagicMock()
                service.model.return_value = mock_output

                mock_probs = MagicMock()
                mock_F.softmax.return_value = mock_probs

                # All O labels (id=0)
                mock_probs.argmax.return_value.squeeze.return_value.cpu.return_value.tolist.return_value = [0, 0, 0, 0, 0]
                mock_probs.max.return_value.values.squeeze.return_value.cpu.return_value.tolist.return_value = [0.9] * 5

                service.id2label = {"0": "O"}

                result = service.extract_entities("Server at 192.168.1.1 is down")

        # Regex should have caught the IP address
        ip_entities = [e for e in result if e["label"] == "IP_ADDRESS"]
        assert len(ip_entities) >= 1
        assert ip_entities[0]["confidence"] == 0.99


# ---------------------------------------------------------------------------
# load
# ---------------------------------------------------------------------------

class TestLoad:
    def test_load_idempotent(self, service):
        service._loaded = True
        service.load()  # Should not raise
        assert service._loaded is True

    def test_load_missing_model_raises(self, service, tmp_path, monkeypatch):
        monkeypatch.setattr(
            "backend.services.ner_service.SAVE_DIR",
            str(tmp_path / "nonexistent"),
        )
        with pytest.raises(FileNotFoundError):
            service.load()
