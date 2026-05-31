import pytest
from unittest.mock import MagicMock, patch
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import importlib.util

spec = importlib.util.spec_from_file_location(
    "ner_service",
    "/home/itsmaestro/gssoc/HELPDESK.AI/backend/services/ner_service.py"
)
ner_module = importlib.util.module_from_spec(spec)
sys.modules['backend.services.ner_service'] = ner_module
spec.loader.exec_module(ner_module)


class TestNERServiceInit:
    def test_init_sets_defaults(self):
        service = ner_module.NERService()
        assert service.model is None
        assert service.tokenizer is None
        assert service.id2label is None
        assert service.label2id is None
        assert service._loaded is False


class TestNERServiceCleanLabel:
    def test_clean_label_o_tag(self):
        service = ner_module.NERService()
        bio, entity = service._clean_label("O")
        assert bio == "O"
        assert entity == ""

    def test_clean_label_b_b_entity(self):
        service = ner_module.NERService()
        bio, entity = service._clean_label("B-B-APP_NAME")
        assert bio == "B"
        assert entity == "APP_NAME"

    def test_clean_label_i_b_entity(self):
        service = ner_module.NERService()
        bio, entity = service._clean_label("I-B-APP_NAME")
        assert bio == "I"
        assert entity == "APP_NAME"

    def test_clean_label_b_entity(self):
        service = ner_module.NERService()
        bio, entity = service._clean_label("B-ENTITY")
        assert bio == "B"
        assert entity == "ENTITY"

    def test_clean_label_i_entity(self):
        service = ner_module.NERService()
        bio, entity = service._clean_label("I-ENTITY")
        assert bio == "I"
        assert entity == "ENTITY"

    def test_clean_label_unknown_returns_o(self):
        service = ner_module.NERService()
        bio, entity = service._clean_label("UNKNOWN")
        assert bio == "O"
        assert entity == ""


class TestNERServiceLoad:
    def test_load_without_torch(self):
        original_has_torch = ner_module._HAS_TORCH
        ner_module._HAS_TORCH = False
        try:
            service = ner_module.NERService()
            service.load()
            assert service._loaded is False
        finally:
            ner_module._HAS_TORCH = original_has_torch

    def test_load_idempotent(self):
        service = ner_module.NERService()
        service._loaded = True
        service.load()
        assert service._loaded is True


class TestNERServiceExtractEntities:
    def test_extract_entities_empty_text(self):
        service = ner_module.NERService()
        service._loaded = True
        service._load_failed = True
        result = service.extract_entities("")
        assert result == []


class TestRegexPatterns:
    def test_regex_patterns_exist(self):
        assert hasattr(ner_module, 'REGEX_PATTERNS')
        patterns = ner_module.REGEX_PATTERNS
        assert "IP_ADDRESS" in patterns
        assert "HOSTNAME" in patterns
        assert "NETWORK_ERROR" in patterns
        assert "LOGIN_ISSUE" in patterns
        assert "VLAN" in patterns
        assert "DATABASE" in patterns
        assert "SYSTEM" in patterns
        assert "BROWSER" in patterns


class TestNERServiceMaxLen:
    def test_max_len_constant(self):
        assert hasattr(ner_module, 'MAX_LEN')
        assert ner_module.MAX_LEN == 128
