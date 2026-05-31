"""
Tests for SLA Engine — breach detection, escalation logic, and notification dispatch.

Covers:
  - SLA policy configuration per priority tier
  - Ticket evaluation (ACTIVE, WARNING, BREACHED, MET statuses)
  - Escalation level calculation (L1, L2, L3)
  - Batch check with mock Supabase client
  - Multi-channel notification dispatch
  - Dashboard statistics aggregation
  - Edge cases (missing data, resolved tickets, timezone handling)
"""

import datetime
import json
from unittest.mock import MagicMock, patch, AsyncMock

import pytest


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_supabase():
    """Create a mock Supabase client with chainable methods."""
    client = MagicMock()
    # Default chainable table mock
    table_mock = MagicMock()
    table_mock.select.return_value = table_mock
    table_mock.not_.ilike.return_value = table_mock
    table_mock.eq.return_value = table_mock
    table_mock.execute.return_value = MagicMock(data=[])
    client.table.return_value = table_mock
    return client


@pytest.fixture
def engine(mock_supabase):
    """Create an SLAEngine instance with mock Supabase."""
    with patch.dict("os.environ", {"SLA_CHANNELS": "[]", "SLA_ESCALATION_CONTACTS": "{}"}):
        from backend.services.sla_engine import SLAEngine
        return SLAEngine(supabase_client=mock_supabase)


@pytest.fixture
def now():
    """Fixed UTC timestamp for deterministic tests."""
    return datetime.datetime(2026, 5, 31, 12, 0, 0, tzinfo=datetime.timezone.utc)


# ---------------------------------------------------------------------------
# SLA Policy Tests
# ---------------------------------------------------------------------------

class TestSLAPolicies:
    """Verify SLA policy configuration for each priority tier."""

    def test_critical_policy_values(self, engine):
        from backend.services.sla_engine import SLA_POLICIES
        p = SLA_POLICIES["critical"]
        assert p["max_hours"] == 2
        assert p["max_seconds"] == 7200
        assert p["warning_pct"] == 0.75
        assert p["l2_escalation_mins"] == 0  # immediate
        assert p["l3_escalation_mins"] == 120
        assert p["auto_escalate_on_breach"] is True

    def test_high_policy_values(self, engine):
        from backend.services.sla_engine import SLA_POLICIES
        p = SLA_POLICIES["high"]
        assert p["max_hours"] == 4
        assert p["l2_escalation_mins"] == 30
        assert p["auto_escalate_on_breach"] is True

    def test_medium_policy_values(self, engine):
        from backend.services.sla_engine import SLA_POLICIES
        p = SLA_POLICIES["medium"]
        assert p["max_hours"] == 8
        assert p["l2_escalation_mins"] == 60

    def test_low_policy_no_auto_escalation(self, engine):
        from backend.services.sla_engine import SLA_POLICIES
        p = SLA_POLICIES["low"]
        assert p["max_hours"] == 24
        assert p["auto_escalate_on_breach"] is False

    def test_get_sla_policy_helper(self, engine):
        from backend.services.sla_engine import get_sla_policy
        assert get_sla_policy("critical")["max_hours"] == 2
        assert get_sla_policy("HIGH")["max_hours"] == 4  # case insensitive
        assert get_sla_policy("unknown")["max_hours"] == 8  # defaults to medium

    def test_all_policies_have_required_keys(self, engine):
        from backend.services.sla_engine import SLA_POLICIES
        required_keys = {"max_hours", "max_seconds", "warning_pct", "warning_label",
                         "l2_escalation_mins", "l3_escalation_mins", "auto_escalate_on_breach"}
        for priority, policy in SLA_POLICIES.items():
            assert required_keys.issubset(policy.keys()), f"{priority} missing keys"


# ---------------------------------------------------------------------------
# Ticket Evaluation Tests
# ---------------------------------------------------------------------------

class TestEvaluateTicket:
    """Test SLA status evaluation for individual tickets."""

    def test_active_ticket_within_sla(self, engine, now):
        """Ticket created 30 min ago with 4h SLA → ACTIVE."""
        ticket = {
            "priority": "high",
            "created_at": (now - datetime.timedelta(minutes=30)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        assert result["sla_status"] == "active"
        assert result["escalation_level"] == 0
        assert result["needs_notification"] is False

    def test_warning_ticket(self, engine, now):
        """Ticket created 3.5h ago with 4h SLA → WARNING (at 75%)."""
        ticket = {
            "priority": "high",
            "created_at": (now - datetime.timedelta(hours=3, minutes=30)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        assert result["sla_status"] == "warning"
        assert result["escalation_level"] == 1  # L1 for warning
        assert result["needs_notification"] is True

    def test_breached_ticket(self, engine, now):
        """Ticket created 5h ago with 4h SLA → BREACHED."""
        ticket = {
            "priority": "high",
            "created_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        assert result["sla_status"] == "breached"
        assert result["escalation_level"] >= 2  # L2+ for breach
        assert result["remaining_seconds"] < 0

    def test_resolved_ticket_is_met(self, engine, now):
        """Resolved ticket always returns MET status."""
        for status in ["resolved", "closed", "auto-resolved"]:
            ticket = {
                "priority": "critical",
                "created_at": (now - datetime.timedelta(hours=10)).isoformat(),
                "status": status,
            }
            result = engine.evaluate_ticket(ticket)
            assert result["sla_status"] == "met", f"Status '{status}' should be MET"
            assert result["needs_notification"] is False

    def test_missing_created_at(self, engine):
        """Ticket with no created_at → default active evaluation."""
        ticket = {"priority": "medium", "status": "open"}
        result = engine.evaluate_ticket(ticket)
        assert result["sla_status"] == "active"
        assert result["remaining_seconds"] == 8 * 3600  # medium = 8h

    def test_missing_priority_defaults_to_medium(self, engine):
        """Ticket with no priority → medium SLA policy."""
        now = datetime.datetime(2026, 5, 31, 12, 0, 0, tzinfo=datetime.timezone.utc)
        ticket = {
            "created_at": (now - datetime.timedelta(hours=1)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.datetime.timezone = datetime.timezone
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        # Medium = 8h, 1h elapsed = active
        assert result["sla_status"] == "active"

    def test_case_insensitive_priority(self, engine, now):
        """Priority 'HIGH' and 'high' should use the same policy."""
        for prio in ["HIGH", "high", "High", "  high  "]:
            ticket = {
                "priority": prio,
                "created_at": (now - datetime.timedelta(hours=2)).isoformat(),
                "status": "open",
            }
            result = engine.evaluate_ticket(ticket)
            assert result["policy"]["max_hours"] == 4, f"Priority '{prio}' should use high policy"

    def test_sla_started_at_overrides_created_at(self, engine, now):
        """If sla_started_at is set, it should be used instead of created_at."""
        ticket = {
            "priority": "high",
            "created_at": (now - datetime.timedelta(hours=10)).isoformat(),
            "sla_started_at": (now - datetime.timedelta(hours=1)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        # 1h elapsed on 4h SLA = active
        assert result["sla_status"] == "active"

    def test_critical_breach_escalation_levels(self, engine, now):
        """Critical ticket escalation: immediate L2, L3 after 2h breach."""
        # Breach 30 min ago → L2
        ticket = {
            "priority": "critical",
            "created_at": (now - datetime.timedelta(hours=2, minutes=30)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        assert result["sla_status"] == "breached"
        # 30 min breach, L3 threshold is 120 min → L2
        assert result["escalation_level"] == 2

    def test_critical_long_breach_escalation_to_l3(self, engine, now):
        """Critical ticket breached for 3h → L3 escalation."""
        ticket = {
            "priority": "critical",
            "created_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "status": "open",
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        assert result["sla_status"] == "breached"
        assert result["escalation_level"] == 3

    def test_needs_notification_only_when_escalation_increases(self, engine, now):
        """Notification should only fire when escalation level increases."""
        ticket = {
            "priority": "high",
            "created_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "status": "open",
            "escalation_level": 2,  # already at L2
        }
        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.timezone = datetime.timezone
            result = engine.evaluate_ticket(ticket)

        # Breach 1h, L3 threshold is 240 min → still L2, no new notification
        assert result["needs_notification"] is False

    def test_invalid_created_at_format(self, engine):
        """Ticket with malformed created_at → default evaluation."""
        ticket = {"priority": "medium", "created_at": "not-a-date", "status": "open"}
        result = engine.evaluate_ticket(ticket)
        assert result["sla_status"] == "active"


# ---------------------------------------------------------------------------
# Batch Check Tests
# ---------------------------------------------------------------------------

class TestBatchCheck:
    """Test check_all_active_tickets batch processing."""

    @pytest.mark.asyncio
    async def test_empty_tickets(self, engine, mock_supabase):
        """No tickets → empty escalated list."""
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[])
        result = await engine.check_all_active_tickets()
        assert result == []

    @pytest.mark.asyncio
    async def test_no_supabase_client(self):
        """No Supabase client → returns empty, logs warning."""
        with patch.dict("os.environ", {"SLA_CHANNELS": "[]", "SLA_ESCALATION_CONTACTS": "{}"}):
            from backend.services.sla_engine import SLAEngine
            engine = SLAEngine(supabase_client=None)
            result = await engine.check_all_active_tickets()
        assert result == []

    @pytest.mark.asyncio
    async def test_breached_ticket_gets_escalated(self, engine, mock_supabase, now):
        """Breached ticket should be in the escalated list."""
        ticket = {
            "id": "ticket-001",
            "priority": "high",
            "created_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "status": "open",
            "sla_status": "active",
            "escalation_level": 0,
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[ticket])

        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.datetime.utcnow.return_value = now.replace(tzinfo=None)
            mock_dt.timezone = datetime.timezone
            result = await engine.check_all_active_tickets()

        assert len(result) == 1
        assert result[0]["ticket"]["id"] == "ticket-001"
        assert result[0]["sla_result"]["sla_status"] == "breached"

    @pytest.mark.asyncio
    async def test_resolved_ticket_not_escalated(self, engine, mock_supabase, now):
        """Resolved ticket should not be escalated."""
        ticket = {
            "id": "ticket-002",
            "priority": "critical",
            "created_at": (now - datetime.timedelta(hours=10)).isoformat(),
            "status": "resolved",
            "sla_status": "met",
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[ticket])
        result = await engine.check_all_active_tickets()
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_db_fetch_error_returns_empty(self, engine, mock_supabase):
        """DB error → returns empty list, logs error."""
        mock_supabase.table.return_value.execute.side_effect = Exception("Connection refused")
        result = await engine.check_all_active_tickets()
        assert result == []

    @pytest.mark.asyncio
    async def test_breach_timestamp_set_on_first_breach(self, engine, mock_supabase, now):
        """First breach should set sla_breach_at timestamp."""
        ticket = {
            "id": "ticket-003",
            "priority": "high",
            "created_at": (now - datetime.timedelta(hours=5)).isoformat(),
            "status": "open",
            "sla_status": "active",
            "sla_breach_at": None,
            "escalation_level": 0,
        }
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[ticket])

        with patch("backend.services.sla_engine.datetime") as mock_dt:
            mock_dt.datetime.now.return_value = now
            mock_dt.datetime.fromisoformat = datetime.datetime.fromisoformat
            mock_dt.datetime.utcnow.return_value = now.replace(tzinfo=None)
            mock_dt.timezone = datetime.timezone
            await engine.check_all_active_tickets()

        # Verify update was called with sla_breach_at
        update_calls = mock_supabase.table.return_value.update.call_args_list
        assert len(update_calls) > 0
        update_data = update_calls[0][0][0]
        assert "sla_breach_at" in update_data


# ---------------------------------------------------------------------------
# Notification Dispatch Tests
# ---------------------------------------------------------------------------

class TestNotificationDispatch:
    """Test multi-channel notification dispatch."""

    @pytest.mark.asyncio
    async def test_dispatch_to_slack_channel(self, engine):
        """Slack notification should include attachments format."""
        channel = {"type": "slack", "url": "https://hooks.slack.com/test", "enabled": True, "min_level": 0}
        ticket = {"id": "t-001", "subject": "Test ticket", "priority": "high", "assigned_team": "Support"}
        result_data = {"sla_status": "breached", "escalation_level": 2, "remaining_seconds": -3600}

        payload = engine._build_payload(ticket, result_data, "slack")
        assert "attachments" in payload
        assert "SLA BREACHED" in payload["attachments"][0]["title"]

    @pytest.mark.asyncio
    async def test_dispatch_to_teams_channel(self, engine):
        """Teams notification should include MessageCard format."""
        ticket = {"id": "t-002", "subject": "Urgent issue", "priority": "critical", "assigned_team": "DevOps"}
        result_data = {"sla_status": "warning", "escalation_level": 1, "remaining_seconds": 1800}

        payload = engine._build_payload(ticket, result_data, "teams")
        assert payload["@type"] == "MessageCard"
        assert len(payload["sections"][0]["facts"]) > 0

    @pytest.mark.asyncio
    async def test_dispatch_to_email_channel(self, engine):
        """Email notification should include template data."""
        ticket = {"id": "t-003", "subject": "Login broken", "priority": "medium", "assigned_team": "QA"}
        result_data = {"sla_status": "breached", "escalation_level": 2, "remaining_seconds": -7200}

        payload = engine._build_payload(ticket, result_data, "email")
        assert payload["type"] == "SLA_ALERT"
        assert "template_data" in payload
        assert "OVERDUE" in payload["template_data"]["refValue"]

    def test_resolve_channels_filters_by_level(self, engine):
        """Channels should be filtered by minimum escalation level."""
        engine.channels = [
            {"type": "slack", "url": "https://test", "enabled": True, "min_level": 0},
            {"type": "email", "url": "https://test", "enabled": True, "min_level": 2},
            {"type": "teams", "url": "https://test", "enabled": True, "min_level": 3},
        ]
        ticket = {}
        result = {"escalation_level": 2}

        channels = engine._resolve_channels(ticket, result)
        types = [c["type"] for c in channels]
        assert "slack" in types
        assert "email" in types
        assert "teams" not in types  # min_level 3 > 2

    def test_disabled_channels_excluded(self, engine):
        """Disabled channels should be excluded."""
        engine.channels = [
            {"type": "slack", "url": "https://test", "enabled": False, "min_level": 0},
            {"type": "email", "url": "https://test", "enabled": True, "min_level": 0},
        ]
        channels = engine._resolve_channels({}, {"escalation_level": 1})
        assert len(channels) == 1
        assert channels[0]["type"] == "email"


# ---------------------------------------------------------------------------
# Format Helper Tests
# ---------------------------------------------------------------------------

class TestFormatHelpers:
    """Test utility functions."""

    def test_fmt_remaining_overdue(self, engine):
        assert engine._fmt_remaining(0) == "OVERDUE"
        assert engine._fmt_remaining(-100) == "OVERDUE"

    def test_fmt_remaining_minutes_only(self, engine):
        assert engine._fmt_remaining(1800) == "30m"

    def test_fmt_remaining_hours_and_minutes(self, engine):
        assert engine._fmt_remaining(5400) == "1h 30m"

    def test_fmt_remaining_exact_hours(self, engine):
        assert engine._fmt_remaining(7200) == "2h 0m"


# ---------------------------------------------------------------------------
# Dashboard Stats Tests
# ---------------------------------------------------------------------------

class TestDashboardStats:
    """Test SLA dashboard statistics aggregation."""

    @pytest.mark.asyncio
    async def test_empty_dashboard(self, engine, mock_supabase):
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=[])
        stats = await engine.get_dashboard_stats()
        assert stats["total"] == 0
        assert stats["breach_rate"] == 0

    @pytest.mark.asyncio
    async def test_dashboard_with_mixed_tickets(self, engine, mock_supabase):
        tickets = [
            {"id": "1", "priority": "high", "sla_status": "breached", "status": "open"},
            {"id": "2", "priority": "high", "sla_status": "warning", "status": "open"},
            {"id": "3", "priority": "low", "sla_status": "active", "status": "open"},
            {"id": "4", "priority": "critical", "sla_status": "met", "status": "resolved"},
        ]
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=tickets)
        stats = await engine.get_dashboard_stats()

        assert stats["total"] == 4
        assert stats["breached"] == 1
        assert stats["warning"] == 1
        assert stats["met"] == 1
        assert stats["active"] == 3  # 4 - 1 resolved
        assert stats["breach_rate"] == 25.0

    @pytest.mark.asyncio
    async def test_dashboard_by_priority_breakdown(self, engine, mock_supabase):
        tickets = [
            {"id": "1", "priority": "high", "sla_status": "breached", "status": "open"},
            {"id": "2", "priority": "high", "sla_status": "active", "status": "open"},
            {"id": "3", "priority": "critical", "sla_status": "warning", "status": "open"},
        ]
        mock_supabase.table.return_value.execute.return_value = MagicMock(data=tickets)
        stats = await engine.get_dashboard_stats()

        assert stats["by_priority"]["high"]["total"] == 2
        assert stats["by_priority"]["high"]["breached"] == 1
        assert stats["by_priority"]["critical"]["warning"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_db_error(self, engine, mock_supabase):
        mock_supabase.table.return_value.execute.side_effect = Exception("DB down")
        stats = await engine.get_dashboard_stats()
        assert "error" in stats


# ---------------------------------------------------------------------------
# Escalation Channel Loading Tests
# ---------------------------------------------------------------------------

class TestChannelLoading:
    """Test environment-based channel configuration loading."""

    def test_valid_channels_from_env(self):
        with patch.dict("os.environ", {
            "SLA_CHANNELS": json.dumps([
                {"type": "slack", "url": "https://hooks.slack.com/test", "enabled": True}
            ]),
            "SLA_ESCALATION_CONTACTS": "{}",
        }):
            from backend.services.sla_engine import SLAEngine
            engine = SLAEngine()
            assert len(engine.channels) == 1
            assert engine.channels[0]["type"] == "slack"

    def test_invalid_json_channels_defaults_empty(self):
        with patch.dict("os.environ", {"SLA_CHANNELS": "not-json", "SLA_ESCALATION_CONTACTS": "{}"}):
            from backend.services.sla_engine import SLAEngine
            engine = SLAEngine()
            assert engine.channels == []

    def test_missing_env_defaults_empty(self):
        with patch.dict("os.environ", {"SLA_CHANNELS": "", "SLA_ESCALATION_CONTACTS": ""}, clear=False):
            from backend.services.sla_engine import SLAEngine
            engine = SLAEngine()
            # Empty string parses as empty list or dict
            assert isinstance(engine.channels, list)
