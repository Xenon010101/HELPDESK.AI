"""
Unit tests for backend/services/translation_service.py

Tests pure functions and edge cases:
- detect_language
- get_supported_languages
- _get_model_name
- translate_text (with mocked models)
- translate_ticket
- clear_cache
"""

import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# Ensure root directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.services.translation_service import (
    detect_language,
    get_supported_languages,
    _get_model_name,
    translate_text,
    translate_ticket,
    clear_cache,
    SUPPORTED_LANGUAGES,
    _translation_cache,
    _model_cache,
    MAX_TEXT_LENGTH,
)


# ─── Fixtures ────────────────────────────────────────────────────────────────


@pytest.fixture(autouse=True)
def clear_caches():
    """Clear translation and model caches before each test."""
    clear_cache()
    yield
    clear_cache()


# ─── detect_language ─────────────────────────────────────────────────────────


class TestDetectLanguage:
    """Tests for detect_language function."""

    def test_detects_english(self):
        """Should detect English text."""
        result = detect_language("Hello, how are you today?")
        assert result == "en"

    def test_detects_spanish(self):
        """Should detect Spanish text."""
        result = detect_language("Hola, ¿cómo estás hoy?")
        assert result == "es"

    def test_returns_none_for_empty_string(self):
        """Should return None for empty string."""
        assert detect_language("") is None

    def test_returns_none_for_whitespace_only(self):
        """Should return None for whitespace-only input."""
        assert detect_language("   ") is None

    def test_returns_none_for_very_short_text(self):
        """Should return None for text shorter than 3 characters."""
        assert detect_language("Hi") is None
        assert detect_language("ab") is None

    def test_returns_none_for_none_input(self):
        """Should return None for None input."""
        assert detect_language(None) is None

    @patch("backend.services.translation_service.detect")
    def test_returns_none_on_detection_error(self, mock_detect):
        """Should return None when langdetect raises an exception."""
        mock_detect.side_effect = Exception("Detection failed")
        assert detect_language("Some text to detect") is None

    def test_detects_three_char_text(self):
        """Should attempt detection on exactly 3 characters."""
        # langdetect may or may not succeed on 3 chars — just ensure no crash
        result = detect_language("The")
        assert result is None or isinstance(result, str)


# ─── get_supported_languages ─────────────────────────────────────────────────


class TestGetSupportedLanguages:
    """Tests for get_supported_languages function."""

    def test_returns_dict(self):
        """Should return a dictionary."""
        result = get_supported_languages()
        assert isinstance(result, dict)

    def test_contains_expected_languages(self):
        """Should contain at least English, Spanish, French, German."""
        result = get_supported_languages()
        assert "en" in result
        assert "es" in result
        assert "fr" in result
        assert "de" in result

    def test_returns_copy_not_reference(self):
        """Should return a copy, not the original dict."""
        result = get_supported_languages()
        result["xx"] = "Test"
        assert "xx" not in SUPPORTED_LANGUAGES

    def test_all_values_are_strings(self):
        """All language names should be strings."""
        result = get_supported_languages()
        for code, name in result.items():
            assert isinstance(code, str)
            assert isinstance(name, str)

    def test_has_at_least_10_languages(self):
        """Should support at least 10 languages."""
        result = get_supported_languages()
        assert len(result) >= 10


# ─── _get_model_name ─────────────────────────────────────────────────────────


class TestGetModelName:
    """Tests for _get_model_name function."""

    def test_standard_pair(self):
        """Should return correct Helsinki-NLP model name."""
        result = _get_model_name("en", "es")
        assert result == "Helsinki-NLP/opus-mt-en-es"

    def test_reversed_pair(self):
        """Should handle reversed language pair."""
        result = _get_model_name("es", "en")
        assert result == "Helsinki-NLP/opus-mt-es-en"

    def test_different_pairs(self):
        """Should generate correct names for various pairs."""
        assert _get_model_name("fr", "de") == "Helsinki-NLP/opus-mt-fr-de"
        assert _get_model_name("zh", "en") == "Helsinki-NLP/opus-mt-zh-en"
        assert _get_model_name("ja", "ko") == "Helsinki-NLP/opus-mt-ja-ko"


# ─── translate_text ──────────────────────────────────────────────────────────


class TestTranslateText:
    """Tests for translate_text function."""

    def test_empty_text_returns_empty(self):
        """Should return empty string for empty input."""
        result = translate_text("", "en")
        assert result["translated"] == ""
        assert result["cached"] is False

    def test_none_text_returns_empty(self):
        """Should return empty string for None input."""
        result = translate_text(None, "en")
        assert result["translated"] == ""

    def test_whitespace_only_returns_empty(self):
        """Should return empty string for whitespace-only input."""
        result = translate_text("   ", "en")
        assert result["translated"] == ""

    def test_same_language_no_translation(self):
        """Should return original text when source == target."""
        result = translate_text("Hello world", target_lang="en", source_lang="en")
        assert result["translated"] == "Hello world"
        assert result["source_lang"] == "en"
        assert result["target_lang"] == "en"

    def test_truncates_long_text(self):
        """Should truncate text exceeding MAX_TEXT_LENGTH."""
        long_text = "x" * (MAX_TEXT_LENGTH + 100)
        with patch("backend.services.translation_service.detect_language", return_value="en"):
            result = translate_text(long_text, target_lang="es", source_lang="en")
            # Should not crash — text gets truncated internally
            assert result["source_lang"] == "en"

    @patch("backend.services.translation_service.detect_language", return_value=None)
    def test_unknown_language_returns_original(self, _mock):
        """Should return original text when language detection fails."""
        result = translate_text("xyzabc unknown lang", target_lang="en")
        assert result["translated"] == "xyzabc unknown lang"
        assert result["source_lang"] == "unknown"

    @patch("backend.services.translation_service._load_translation_model", return_value=None)
    @patch("backend.services.translation_service.detect_language", return_value="fr")
    def test_model_load_failure_returns_original(self, _detect, _load):
        """Should return original text when model fails to load."""
        result = translate_text("Bonjour le monde", target_lang="en", source_lang="fr")
        assert result["translated"] == "Bonjour le monde"
        assert result["source_lang"] == "fr"

    def test_uses_cache_on_second_call(self):
        """Should return cached result on second identical call."""
        mock_model = MagicMock()
        mock_tokenizer = MagicMock()
        mock_tokenizer.return_value = {"input_ids": MagicMock(), "attention_mask": MagicMock()}
        mock_model.generate.return_value = [MagicMock()]
        mock_tokenizer.decode.return_value = "Translated text"

        with patch("backend.services.translation_service._load_translation_model", return_value=(mock_model, mock_tokenizer)):
            with patch("backend.services.translation_service.detect_language", return_value="es"):
                # First call
                result1 = translate_text("Hola mundo", target_lang="en", source_lang="es")
                assert result1["cached"] is False

                # Second call — should be cached
                result2 = translate_text("Hola mundo", target_lang="en", source_lang="es")
                assert result2["cached"] is True
                assert result2["translated"] == "Translated text"


# ─── translate_ticket ────────────────────────────────────────────────────────


class TestTranslateTicket:
    """Tests for translate_ticket function."""

    def test_translates_subject(self):
        """Should translate ticket subject."""
        with patch("backend.services.translation_service.translate_text") as mock_translate:
            mock_translate.return_value = {
                "translated": "Translated subject",
                "source_lang": "es",
                "target_lang": "en",
                "cached": False,
            }
            result = translate_ticket({"subject": "Asunto"}, target_lang="en")
            assert "subject" in result["translations"]
            assert result["translations"]["subject"]["translated"] == "Translated subject"

    def test_translates_description(self):
        """Should translate ticket description."""
        with patch("backend.services.translation_service.translate_text") as mock_translate:
            mock_translate.return_value = {
                "translated": "Translated desc",
                "source_lang": "fr",
                "target_lang": "en",
                "cached": False,
            }
            result = translate_ticket({"description": "Description"}, target_lang="en")
            assert "description" in result["translations"]

    def test_translates_messages(self):
        """Should translate ticket messages."""
        with patch("backend.services.translation_service.translate_text") as mock_translate:
            mock_translate.return_value = {
                "translated": "Translated msg",
                "source_lang": "de",
                "target_lang": "en",
                "cached": False,
            }
            result = translate_ticket(
                {"messages": [{"content": "Nachricht"}]},
                target_lang="en",
            )
            assert len(result["translations"]["messages"]) == 1
            assert result["translations"]["messages"][0]["translated"] == "Translated msg"

    def test_empty_ticket(self):
        """Should handle empty ticket data."""
        result = translate_ticket({}, target_lang="en")
        assert result["translations"] == {}
        assert result["original_language"] is None

    def test_detects_original_language(self):
        """Should detect original language from first translated field."""
        with patch("backend.services.translation_service.translate_text") as mock_translate:
            mock_translate.return_value = {
                "translated": "Translated",
                "source_lang": "ja",
                "target_lang": "en",
                "cached": False,
            }
            result = translate_ticket({"subject": "テスト"}, target_lang="en")
            assert result["original_language"] == "ja"


# ─── clear_cache ─────────────────────────────────────────────────────────────


class TestClearCache:
    """Tests for clear_cache function."""

    def test_clears_translation_cache(self):
        """Should clear translation cache."""
        _translation_cache["test:key:123"] = "cached"
        clear_cache()
        assert len(_translation_cache) == 0

    def test_clears_model_cache(self):
        """Should clear model cache."""
        _model_cache["en-es"] = ("model", "tokenizer")
        clear_cache()
        assert len(_model_cache) == 0

    def test_safe_to_call_multiple_times(self):
        """Should be safe to call multiple times."""
        clear_cache()
        clear_cache()
        assert len(_translation_cache) == 0
        assert len(_model_cache) == 0
