"""
Unit tests for backend.services.classifier_service (Issue #916).

Covers:
- ClassifierService.__init__ (defaults)
- ClassifierService.load (idempotent, missing model, LFS placeholder, no torch)
- ClassifierService.predict (normal classification, degraded mode, keyword override)
- PRIORITY_MAP / TEAM_MAP / AUTO_RESOLVE_SUBS constant mappings
- Module-level constants (SAVE_DIR, MAX_LEN)

All ML dependencies (torch, transformers) are mocked so the suite runs
without GPU or model files present.
"""

from __future__ import annotations

import os
import sys
import json
import types
import tempfile
import pytest
from unittest.mock import MagicMock, patch, PropertyMock

# Ensure project root is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Stub out torch and transformers before importing the module
_torch_mock = MagicMock()
_torch_mock.cuda.is_available.return_value = False
_torch_mock.device.return_value = "cpu"
_torch_mock.no_grad.return_value.__enter__ = MagicMock()
_torch_mock.no_grad.return_value.__exit__ = MagicMock()
sys.modules["torch"] = _torch_mock
sys.modules["torch.nn"] = MagicMock()
sys.modules["torch.nn.functional"] = MagicMock()
sys.modules["transformers"] = MagicMock()

# Remove conftest stub so we import the real module
if "backend.services.classifier_service" in sys.modules:
    del sys.modules["backend.services.classifier_service"]

from backend.services.classifier_service import (
    ClassifierService,
    PRIORITY_MAP,
    TEAM_MAP,
    AUTO_RESOLVE_SUBS,
    SAVE_DIR,
    MAX_LEN,
    _HAS_TORCH,
)


# ============================================================================
# Constants
# ============================================================================

class TestConstants:
    """Verify module-level constants are correctly defined."""

    def test_max_len_is_128(self):
        assert MAX_LEN == 128

    def test_save_dir_points_to_models_classifier(self):
        assert "models" in SAVE_DIR
        assert "classifier" in SAVE_DIR

    def test_priority_map_has_critical_entries(self):
        critical_subs = ["Blue Screen", "Overheating", "Data Loss", "Hardware Failure"]
        for sub in critical_subs:
            assert PRIORITY_MAP.get(sub) == "Critical"

    def test_priority_map_has_high_entries(self):
        high_subs = ["Application Crash", "Login Failure", "Password Reset"]
        for sub in high_subs:
            assert PRIORITY_MAP.get(sub) == "High"

    def test_priority_map_has_medium_entries(self):
        medium_subs = ["Permission Issue", "Software Install", "Performance"]
        for sub in medium_subs:
            assert PRIORITY_MAP.get(sub) == "Medium"

    def test_priority_map_has_low_entries(self):
        low_subs = ["Account Unlock", "Keyboard/Mouse", "Printer Error"]
        for sub in low_subs:
            assert PRIORITY_MAP.get(sub) == "Low"

    def test_team_map_covers_all_categories(self):
        expected = {
            "Access": "IAM Team",
            "Network": "Network Support",
            "Software": "Application Support",
            "Hardware": "Hardware Support",
        }
        for cat, team in expected.items():
            assert TEAM_MAP[cat] == team

    def test_auto_resolve_subs_contains_common_tasks(self):
        assert "Password Reset" in AUTO_RESOLVE_SUBS
        assert "Account Unlock" in AUTO_RESOLVE_SUBS
        assert "Software Install" in AUTO_RESOLVE_SUBS
        assert "WiFi Issue" in AUTO_RESOLVE_SUBS

    def test_auto_resolve_subs_is_subset_of_priority_map(self):
        """Every auto-resolve subcategory should have a priority mapping."""
        for sub in AUTO_RESOLVE_SUBS:
            assert sub in PRIORITY_MAP, f"{sub} missing from PRIORITY_MAP"


# ============================================================================
# ClassifierService.__init__
# ============================================================================

class TestClassifierServiceInit:
    """Tests for ClassifierService initialization."""

    def test_defaults(self):
        svc = ClassifierService()
        assert svc.model is None
        assert svc.tokenizer is None
        assert svc.id2label is None
        assert svc.label2id is None
        assert svc._loaded is False

    def test_multiple_instances_are_independent(self):
        a = ClassifierService()
        b = ClassifierService()
        a._loaded = True
        assert b._loaded is False


# ============================================================================
# ClassifierService.load
# ============================================================================

class TestClassifierServiceLoad:
    """Tests for model loading behaviour."""

    def test_load_is_idempotent(self):
        """load() should not re-load if already loaded."""
        svc = ClassifierService()
        svc._loaded = True
        svc.load()  # should be a no-op
        assert svc.model is None  # still None because we didn't actually load

    @patch.dict(os.environ, {}, clear=False)
    def test_load_no_torch_degraded(self):
        """When _HAS_TORCH is False, load() should print info and return."""
        svc = ClassifierService()
        with patch("backend.services.classifier_service._HAS_TORCH", False):
            # Should not raise
            svc.load()
            assert svc._loaded is False

    def test_load_missing_model_file_raises(self):
        """When model.safetensors doesn't exist, load() should raise FileNotFoundError."""
        svc = ClassifierService()
        with patch("backend.services.classifier_service._HAS_TORCH", True):
            with patch("backend.services.classifier_service.SAVE_DIR", "/nonexistent/path"):
                with pytest.raises(FileNotFoundError, match="Classifier model not found"):
                    svc.load()

    def test_load_lfs_placeholder_raises(self):
        """When model.safetensors is a Git LFS pointer, load() should raise."""
        svc = ClassifierService()
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a fake LFS pointer
            model_path = os.path.join(tmpdir, "model.safetensors")
            with open(model_path, "wb") as f:
                f.write(b"version https://git-lfs.github.com/spec\noid sha256:abc123\n")

            with patch("backend.services.classifier_service._HAS_TORCH", True):
                with patch("backend.services.classifier_service.SAVE_DIR", tmpdir):
                    with pytest.raises(FileNotFoundError, match="Git LFS placeholder"):
                        svc.load()


# ============================================================================
# ClassifierService.predict
# ============================================================================

class TestClassifierServicePredict:
    """Tests for the predict method."""

    def _make_loaded_service(self, pred_idx=0, confidence=0.95):
        """Helper: create a ClassifierService with mocked model internals."""
        svc = ClassifierService()
        svc._loaded = True
        svc.id2label = {
            "0": "Software | Software Install",
            "1": "Network | VPN Connection",
            "2": "Access | Login Failure",
            "3": "Hardware | Blue Screen",
            "4": "General | Unknown",
        }
        svc.label2id = {v: int(k) for k, v in svc.id2label.items()}

        # Mock tokenizer
        mock_encoding = {
            "input_ids": MagicMock(),
            "attention_mask": MagicMock(),
        }
        mock_encoding["input_ids"].to.return_value = mock_encoding["input_ids"]
        mock_encoding["attention_mask"].to.return_value = mock_encoding["attention_mask"]
        mock_encoding["attention_mask"].sum.return_value.item.return_value = 10

        svc.tokenizer = MagicMock(return_value=mock_encoding)

        # Mock model output
        mock_logits = MagicMock()
        mock_probs = MagicMock()

        _torch_mock.nn.functional.softmax.return_value = mock_probs
        _torch_mock.max.return_value = (MagicMock(item=MagicMock(return_value=confidence)), MagicMock(item=MagicMock(return_value=pred_idx)))

        svc.model = MagicMock()
        svc.model.return_value.logits = mock_logits

        return svc

    def test_predict_software_category(self):
        """Predicting with idx=0 should return Software | Software Install."""
        svc = self._make_loaded_service(pred_idx=0, confidence=0.95)
        result = svc.predict("install photoshop")

        assert result["category"] == "Software"
        assert result["subcategory"] == "Software Install"
        assert result["priority"] == "Medium"
        assert result["auto_resolve"] is True
        assert result["assigned_team"] == "Application Support"

    def test_predict_network_category(self):
        """Predicting with idx=1 should return Network | VPN Connection."""
        svc = self._make_loaded_service(pred_idx=1, confidence=0.90)
        result = svc.predict("vpn not connecting")

        assert result["category"] == "Network"
        assert result["subcategory"] == "VPN Connection"
        assert result["priority"] == "High"
        assert result["auto_resolve"] is False
        assert result["assigned_team"] == "Network Support"

    def test_predict_access_category(self):
        """Predicting with idx=2 should return Access | Login Failure."""
        svc = self._make_loaded_service(pred_idx=2, confidence=0.88)
        result = svc.predict("can't log in")

        assert result["category"] == "Access"
        assert result["subcategory"] == "Login Failure"
        assert result["priority"] == "High"
        assert result["auto_resolve"] is False
        assert result["assigned_team"] == "IAM Team"

    def test_predict_hardware_critical(self):
        """Predicting with idx=3 should return Hardware | Blue Screen (Critical)."""
        svc = self._make_loaded_service(pred_idx=3, confidence=0.99)
        result = svc.predict("blue screen of death")

        assert result["category"] == "Hardware"
        assert result["subcategory"] == "Blue Screen"
        assert result["priority"] == "Critical"
        assert result["auto_resolve"] is False
        assert result["assigned_team"] == "Hardware Support"

    def test_predict_unknown_category_defaults(self):
        """Unknown subcategory should default to Medium priority and General Support team."""
        svc = self._make_loaded_service(pred_idx=4, confidence=0.50)
        result = svc.predict("something weird")

        assert result["category"] == "General"
        assert result["subcategory"] == "Unknown"
        assert result["priority"] == "Medium"
        assert result["auto_resolve"] is False
        assert result["assigned_team"] == "General Support"

    def test_predict_keyword_override_network(self):
        """Text with network keywords should override to Network category."""
        svc = self._make_loaded_service(pred_idx=4, confidence=0.50)
        result = svc.predict("my DNS is not resolving and firewall blocks VPN")

        # Keyword override should kick in because category is "General" and confidence < 0.9
        assert result["category"] == "Network"
        assert result["assigned_team"] == "Network Support"
        assert result["confidence"] >= 0.92

    def test_predict_keyword_override_software(self):
        """Text with software keywords should override to Software category."""
        svc = self._make_loaded_service(pred_idx=4, confidence=0.50)
        result = svc.predict("the application keeps crashing with an error")

        assert result["category"] == "Software"
        assert result["assigned_team"] == "Application Support"

    def test_predict_keyword_override_access(self):
        """Text with access keywords should override to Access category."""
        svc = self._make_loaded_service(pred_idx=4, confidence=0.50)
        result = svc.predict("my password reset MFA authentication failed")

        assert result["category"] == "Access"
        assert result["assigned_team"] == "IAM Team"

    def test_predict_high_confidence_no_override(self):
        """When confidence >= 0.9 and category is not General, keywords should NOT override."""
        svc = self._make_loaded_service(pred_idx=1, confidence=0.95)
        result = svc.predict("DNS firewall issue")

        # Network prediction with high confidence — no override needed
        assert result["category"] == "Network"
        assert result["confidence"] == 0.95

    def test_predict_auto_resolve_subs(self):
        """Subcategories in AUTO_RESOLVE_SUBS should have auto_resolve=True."""
        svc = ClassifierService()
        svc._loaded = True
        svc.id2label = {"0": "Software | Password Reset"}
        svc.label2id = {"Software | Password Reset": 0}

        mock_encoding = {
            "input_ids": MagicMock(),
            "attention_mask": MagicMock(),
        }
        mock_encoding["input_ids"].to.return_value = mock_encoding["input_ids"]
        mock_encoding["attention_mask"].to.return_value = mock_encoding["attention_mask"]
        mock_encoding["attention_mask"].sum.return_value.item.return_value = 10
        svc.tokenizer = MagicMock(return_value=mock_encoding)

        _torch_mock.max.return_value = (MagicMock(item=MagicMock(return_value=0.99)), MagicMock(item=MagicMock(return_value=0)))
        svc.model = MagicMock()

        result = svc.predict("reset my password")
        assert result["auto_resolve"] is True
        assert result["priority"] == "High"
