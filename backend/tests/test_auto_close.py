"""
Unit tests for AutoCloseService.

Tests cover:
- System settings fallback to defaults
- Ticket status update handling
- Error logging boundaries
"""

import os
import sys
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch, call
import pytest

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

# Mock supabase before import
supabase_mock = MagicMock()
sys.modules['supabase'] = supabase_mock

from backend.services.auto_close_service import AutoCloseService


class TestAutoCloseService:
    """Test suite for AutoCloseService."""

    @pytest.fixture
    def mock_supabase(self):
        return MagicMock()

    @pytest.fixture
    def service(self):
        """Create an AutoCloseService with mocked Supabase."""
        # Create a fresh supabase mock BEFORE the service constructor
        fresh_supabase = MagicMock()
        fresh_supabase.table.return_value = MagicMock()
        fresh_supabase.table.return_value.select.return_value = MagicMock()
        fresh_supabase.table.return_value.select.return_value.eq.return_value = MagicMock()
        fresh_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock()
        fresh_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        with patch('backend.services.auto_close_service.create_client', return_value=fresh_supabase):
            svc = AutoCloseService()
            svc.enabled = True
            svc.default_auto_close_days = 7
            svc.supabase = fresh_supabase
            return svc

    # --- Tests for get_system_settings ---

    def test_get_system_settings_returns_company_values(self, service):
        """
        When system_settings exist for a company, get_system_settings should
        return the stored values.
        """
        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_execute = MagicMock()
        mock_execute.data = {"auto_close_days": 3, "auto_close_enabled": False}
        mock_single = MagicMock()
        mock_single.execute.return_value = mock_execute

        mock_select.eq.return_value = mock_select
        mock_select.single.return_value = mock_single

        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        result = service.get_system_settings("company-uuid-123")

        assert result["auto_close_days"] == 3
        assert result["auto_close_enabled"] is False

    def test_get_system_settings_falls_back_to_defaults_on_error(self, service):
        """
        When the database query fails (exception), get_system_settings should
        fall back to default values without crashing.
        """
        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_single = MagicMock()
        mock_single.execute.side_effect = Exception("DB connection error")

        mock_select.eq.return_value = mock_select
        mock_select.single.return_value = mock_single

        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        result = service.get_system_settings("company-uuid-456")

        assert result["auto_close_days"] == service.default_auto_close_days
        assert result["auto_close_enabled"] is True

    def test_get_system_settings_falls_back_when_data_missing(self, service):
        """
        When the database returns empty data (company not found), settings
        should fall back to defaults.
        """
        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_execute = MagicMock()
        mock_execute.data = None
        mock_single = MagicMock()
        mock_single.execute.return_value = mock_execute

        mock_select.eq.return_value = mock_select
        mock_select.single.return_value = mock_single

        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        result = service.get_system_settings("nonexistent-company-uuid")

        assert result["auto_close_days"] == service.default_auto_close_days
        assert result["auto_close_enabled"] is True

    def test_get_system_settings_handles_partial_data(self, service):
        """
        When the database returns partial data (missing some keys), the
        missing keys should fall back to defaults.
        """
        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_execute = MagicMock()
        mock_execute.data = {"auto_close_days": 14}
        mock_single = MagicMock()
        mock_single.execute.return_value = mock_execute

        mock_select.eq.return_value = mock_select
        mock_select.single.return_value = mock_single

        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        result = service.get_system_settings("company-uuid-789")

        assert result["auto_close_days"] == 14
        assert result["auto_close_enabled"] is True

    # --- Tests for _close_ticket ---

    def test_close_ticket_updates_status_successfully(self, service):
        """
        _close_ticket should update the ticket status to 'closed' and set
        auto_closed flag, returning True on success.
        """
        mock_tbl = MagicMock()
        mock_update = MagicMock()
        mock_eq = MagicMock()
        mock_eq.execute.return_value = MagicMock()

        mock_update.eq.return_value = mock_eq
        mock_tbl.update.return_value = mock_update
        service.supabase.table.return_value = mock_tbl

        stats = {"closed_count": 0, "error_count": 0}
        result = service._close_ticket("ticket-uuid-1", "company-uuid-1", stats)

        assert result is True
        assert stats["closed_count"] == 1

        # Verify the update call
        update_args = mock_tbl.update.call_args
        assert update_args is not None
        update_kwargs = update_args[0][0] if update_args[0] else {}
        assert update_kwargs.get("status") == "closed"
        assert update_kwargs.get("auto_closed") is True

    def test_close_ticket_handles_database_error(self, service):
        """
        When the database update fails, _close_ticket should catch the
        exception, increment error_count, and return False.
        """
        # Test the real _close_ticket behavior by wrapping it
        original_close = service._close_ticket
        
        def mock_update(*args, **kwargs):
            raise Exception("Update failed")
        
        mock_tbl = MagicMock()
        mock_tbl.update = mock_update
        service.supabase.table.return_value = mock_tbl

        with patch.object(service, '_close_ticket', wraps=original_close):
            stats = {"closed_count": 0, "error_count": 0}
            result = service._close_ticket("ticket-uuid-2", "company-uuid-2", stats)

            assert result is False
            assert stats["closed_count"] == 0
            assert stats["error_count"] == 1

    # --- Tests for run() ---

    def test_run_returns_disabled_when_service_disabled(self, service):
        """
        When the service is disabled (enabled=False), run() should immediately
        return disabled status without querying the database.
        """
        service.enabled = False

        result = service.run()

        assert result == {"status": "disabled"}
        service.supabase.table.assert_not_called()

    def test_run_processes_resolved_tickets(self, service):
        """
        run() should fetch resolved tickets, check their age against company
        settings, and close expired ones.
        """
        recent_time = (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
        old_time = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

        resolved_tickets = [
            {"id": "ticket-recent", "company_id": "company-a", "status": "resolved", "updated_at": recent_time},
            {"id": "ticket-old", "company_id": "company-a", "status": "resolved", "updated_at": old_time},
            {"id": "ticket-old-2", "company_id": "company-b", "status": "resolved", "updated_at": old_time},
        ]

        # Build mock chain: table().select().eq().execute().data
        mock_execute = MagicMock()
        mock_execute.data = resolved_tickets

        mock_eq = MagicMock()
        mock_eq.execute.return_value = mock_execute

        mock_select = MagicMock()
        mock_select.eq.return_value = mock_eq

        mock_table = MagicMock()
        mock_table.select.return_value = mock_select

        # Patch the entire table method so it returns our mock
        service.supabase.table = MagicMock(return_value=mock_table)

        # Use wraps so _close_ticket still increments stats
        original_close = service._close_ticket

        with patch.object(service, 'get_system_settings', return_value={"auto_close_days": 7, "auto_close_enabled": True}):
            with patch.object(service, '_close_ticket', wraps=original_close) as mock_close:
                result = service.run()

                assert result["closed_count"] == 2
                assert result["skipped_count"] == 1
                assert mock_close.call_count == 2

    def test_run_disabled_company_skips_tickets(self, service):
        """
        When a company has auto-close disabled, all their tickets should
        be skipped.
        """
        old_time = (datetime.now(timezone.utc) - timedelta(days=14)).isoformat()

        resolved_tickets = [
            {"id": "ticket-1", "company_id": "company-disabled", "status": "resolved", "updated_at": old_time},
        ]

        mock_execute = MagicMock()
        mock_execute.data = resolved_tickets

        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_eq.execute.return_value = mock_execute

        mock_select.eq.return_value = mock_eq
        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        with patch.object(service, 'get_system_settings', return_value={"auto_close_days": 7, "auto_close_enabled": False}):
            with patch.object(service, '_close_ticket') as mock_close:
                result = service.run()

                assert result["closed_count"] == 0
                assert result["skipped_count"] == 1
                mock_close.assert_not_called()

    def test_run_handles_fatal_error_gracefully(self, service):
        """
        When a fatal error occurs during ticket query, run() should catch it,
        increment error_count, and still return stats.
        """
        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_eq.execute.side_effect = Exception("Query failed")

        mock_select.eq.return_value = mock_eq
        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        result = service.run()

        assert result["error_count"] >= 1
        assert "processed_count" in result

    # --- Tests for load/get_instance ---

    def test_load_creates_singleton(self, service):
        """
        load() should create and return a singleton AutoCloseService instance.
        """
        from backend.services.auto_close_service import load, get_instance

        # Reset singleton
        import backend.services.auto_close_service as mod
        mod._instance = None

        with patch('backend.services.auto_close_service.create_client', return_value=MagicMock()):
            instance1 = load()
            instance2 = load()
            assert instance1 is instance2

    def test_test_query_returns_tickets(self, service):
        """
        test_query() should return a sample of resolved tickets.
        """
        mock_execute = MagicMock()
        mock_execute.data = [{"id": "test-1", "status": "resolved"}]

        mock_tbl = MagicMock()
        mock_select = MagicMock()
        mock_eq = MagicMock()
        mock_limit = MagicMock()
        mock_limit.execute.return_value = mock_execute

        mock_eq.limit.return_value = mock_limit
        mock_select.eq.return_value = mock_eq
        mock_tbl.select.return_value = mock_select
        service.supabase.table.return_value = mock_tbl

        result = service.test_query()

        assert len(result) == 1
        assert result[0]["id"] == "test-1"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
