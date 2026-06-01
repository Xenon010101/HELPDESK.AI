"""
Tests for backend/services/auto_close_service.py (Issue #913).
Covers: enabled/disabled toggle, default fallback, DB read for is_enabled_for_company,
company-specific settings, run() with disabled flag, run() closes old tickets,
run() skips recent tickets, get_system_settings alias handling.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock, patch, PropertyMock
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))


def _make_supabase_mock(settings_data=None, tickets_data=None, raise_exc=None):
    """Build a minimal mock Supabase client."""
    client = MagicMock()
    settings_result = MagicMock()
    settings_result.data = settings_data

    tickets_result = MagicMock()
    tickets_result.data = tickets_data or []

    update_result = MagicMock()
    update_result.data = [{"id": "t1", "status": "closed"}]

    builder = MagicMock()
    builder.select.return_value = builder
    builder.eq.return_value = builder
    builder.single.return_value = builder
    builder.update.return_value = builder
    builder.order.return_value = builder

    if raise_exc:
        builder.execute.side_effect = raise_exc
    else:
        # First call: settings, subsequent calls: tickets & update
        builder.execute.side_effect = [
            settings_result,
            tickets_result,
            update_result,
        ]

    client.table.return_value = builder
    return client


def _build_service(enabled_env="true", mock_supabase=None):
    """Create an AutoCloseService with mocked Supabase and env vars."""
    from backend.services.auto_close_service import AutoCloseService
    svc = AutoCloseService.__new__(AutoCloseService)
    svc.supabase = mock_supabase or MagicMock()
    svc.enabled = enabled_env.lower() == "true"
    svc.default_auto_close_days = 7
    svc.cron_schedule = "0 2 * * *"
    return svc


class TestAutoCloseEnabledToggle(unittest.TestCase):
    def test_run_returns_disabled_when_env_false(self):
        svc = _build_service(enabled_env="false")
        result = svc.run()
        self.assertEqual(result["status"], "disabled")

    def test_run_proceeds_when_env_true(self):
        mock_sb = MagicMock()
        # simulate no resolved tickets
        res = MagicMock()
        res.data = []
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.execute.return_value = res
        mock_sb.table.return_value = builder

        svc = _build_service(enabled_env="true", mock_supabase=mock_sb)
        result = svc.run()
        self.assertNotEqual(result.get("status"), "disabled")

    def test_enabled_attribute_set_from_env_true(self):
        svc = _build_service("true")
        self.assertTrue(svc.enabled)

    def test_enabled_attribute_set_from_env_false(self):
        svc = _build_service("false")
        self.assertFalse(svc.enabled)


class TestIsEnabledForCompany(unittest.TestCase):
    def test_returns_true_when_db_auto_close_enabled_true(self):
        mock_sb = MagicMock()
        res = MagicMock()
        res.data = {"auto_close_enabled": True, "auto_close_days": 7}
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.return_value = res
        mock_sb.table.return_value = builder

        svc = _build_service(mock_supabase=mock_sb)
        result = svc.is_enabled_for_company("company-1")
        self.assertTrue(result)

    def test_returns_false_when_db_auto_close_enabled_false(self):
        mock_sb = MagicMock()
        res = MagicMock()
        res.data = {"auto_close_enabled": False}
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.return_value = res
        mock_sb.table.return_value = builder

        svc = _build_service(mock_supabase=mock_sb)
        result = svc.is_enabled_for_company("company-2")
        self.assertFalse(result)

    def test_falls_back_to_env_on_db_exception(self):
        mock_sb = MagicMock()
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.side_effect = Exception("DB unavailable")
        mock_sb.table.return_value = builder

        svc = _build_service(enabled_env="true", mock_supabase=mock_sb)
        result = svc.is_enabled_for_company("company-err")
        self.assertTrue(result)

    def test_alias_enable_auto_resolve_used_when_auto_close_enabled_missing(self):
        mock_sb = MagicMock()
        res = MagicMock()
        res.data = {"enable_auto_resolve": True, "auto_close_days": 5}
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.return_value = res
        mock_sb.table.return_value = builder

        svc = _build_service(mock_supabase=mock_sb)
        result = svc.is_enabled_for_company("company-3")
        self.assertTrue(result)


class TestGetSystemSettings(unittest.TestCase):
    def _mock_settings(self, data):
        mock_sb = MagicMock()
        res = MagicMock()
        res.data = data
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.return_value = res
        mock_sb.table.return_value = builder
        return mock_sb

    def test_returns_defaults_when_no_data(self):
        mock_sb = self._mock_settings(None)
        svc = _build_service(mock_supabase=mock_sb)
        result = svc.get_system_settings("c1")
        self.assertIn("auto_close_days", result)
        self.assertIn("auto_close_enabled", result)

    def test_returns_db_values(self):
        mock_sb = self._mock_settings({"auto_close_days": 14, "auto_close_enabled": True})
        svc = _build_service(mock_supabase=mock_sb)
        result = svc.get_system_settings("c2")
        self.assertEqual(result["auto_close_days"], 14)
        self.assertTrue(result["auto_close_enabled"])

    def test_defaults_fallback_on_exception(self):
        mock_sb = MagicMock()
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.side_effect = Exception("network error")
        mock_sb.table.return_value = builder

        svc = _build_service(mock_supabase=mock_sb)
        result = svc.get_system_settings("c3")
        self.assertIsInstance(result, dict)
        self.assertIn("auto_close_days", result)

    def test_default_auto_close_days_is_7(self):
        svc = _build_service()
        svc.supabase = MagicMock()
        svc.supabase.table.return_value.select.return_value.eq.return_value.single.return_value.execute.side_effect = Exception("off")
        result = svc.get_system_settings("c4")
        self.assertEqual(result["auto_close_days"], svc.default_auto_close_days)


class TestRunSkipsRecentTickets(unittest.TestCase):
    def test_recent_ticket_is_skipped(self):
        now = datetime.now(timezone.utc)
        recent_updated_at = (now - timedelta(days=1)).isoformat()

        mock_sb = MagicMock()
        tickets_res = MagicMock()
        tickets_res.data = [{"id": "t1", "company_id": "c1", "status": "resolved",
                              "updated_at": recent_updated_at}]

        settings_res = MagicMock()
        settings_res.data = {"auto_close_days": 7, "auto_close_enabled": True}

        call_count = [0]
        def execute_side_effect():
            call_count[0] += 1
            if call_count[0] == 1:
                return tickets_res
            return settings_res

        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.execute.side_effect = lambda: execute_side_effect()
        mock_sb.table.return_value = builder

        svc = _build_service(enabled_env="true", mock_supabase=mock_sb)
        # Patch is_enabled_for_company to return True
        svc.is_enabled_for_company = lambda cid: True
        stats = svc.run()
        # Recent ticket should be skipped, not closed
        self.assertEqual(stats.get("closed_count", 0), 0)

    def test_old_ticket_is_closed(self):
        now = datetime.now(timezone.utc)
        old_updated_at = (now - timedelta(days=14)).isoformat()

        mock_sb = MagicMock()

        tickets_res = MagicMock()
        tickets_res.data = [{"id": "t2", "company_id": "c1", "status": "resolved",
                              "updated_at": old_updated_at}]

        settings_res = MagicMock()
        settings_res.data = {"auto_close_days": 7, "auto_close_enabled": True}

        update_res = MagicMock()
        update_res.data = [{"id": "t2", "status": "closed"}]

        call_count = [0]
        def exe():
            call_count[0] += 1
            if call_count[0] == 1:
                return tickets_res
            if call_count[0] == 2:
                return settings_res
            return update_res

        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.single.return_value = builder
        builder.update.return_value = builder
        builder.execute.side_effect = lambda: exe()
        mock_sb.table.return_value = builder

        svc = _build_service(enabled_env="true", mock_supabase=mock_sb)
        svc.is_enabled_for_company = lambda cid: True
        stats = svc.run()
        self.assertGreaterEqual(stats.get("closed_count", 0), 1)


class TestRunReturnStats(unittest.TestCase):
    def test_run_returns_dict_with_expected_keys(self):
        mock_sb = MagicMock()
        res = MagicMock()
        res.data = []
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.execute.return_value = res
        mock_sb.table.return_value = builder

        svc = _build_service(enabled_env="true", mock_supabase=mock_sb)
        stats = svc.run()
        for key in ("processed_count", "closed_count", "error_count", "skipped_count"):
            self.assertIn(key, stats)

    def test_run_error_returns_non_fatal(self):
        mock_sb = MagicMock()
        builder = MagicMock()
        builder.select.return_value = builder
        builder.eq.return_value = builder
        builder.execute.side_effect = Exception("fatal DB error")
        mock_sb.table.return_value = builder

        svc = _build_service(enabled_env="true", mock_supabase=mock_sb)
        stats = svc.run()
        self.assertIn("error_count", stats)


if __name__ == "__main__":
    unittest.main()
