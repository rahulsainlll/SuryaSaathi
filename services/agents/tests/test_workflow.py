from datetime import UTC, datetime, timedelta
from typing import Any

import boto3
import pytest
from suryasaathi_agents.handler import process_reading
from suryasaathi_agents.workflow import MAX_PENDING, run_step
from suryasaathi_core.config import Settings
from suryasaathi_core.fixtures import Fixture, load_fixture
from suryasaathi_core.store import Store

from .conftest import fixture_lookup, reading_for, register

SETTINGS = Settings(agent_enabled=False)
T0 = datetime(2026, 10, 1, 13, 0, tzinfo=UTC)


class Replay:
    """Feeds a fixture's readings through the agent one day at a time."""

    def __init__(self, store: Store, name: str, settings: Settings = SETTINGS) -> None:
        self.store, self.settings = store, settings
        self.fixture: Fixture = load_fixture(name)
        self.lookup = fixture_lookup(self.fixture)
        self.day = -1
        register(store, self.fixture)

    def until(self, day: int) -> None:
        while self.day < day:
            self.day += 1
            reading = reading_for(self.fixture, self.day)
            self.store.put_reading(reading)
            now = T0 + timedelta(days=self.day)
            process_reading(reading, self.store, self.settings, self.lookup, now=now)

    def step(self, step: str, case_id: str, **extra: Any) -> dict[str, Any]:
        now = T0 + timedelta(days=self.day)
        return run_step(
            {"step": step, "caseId": case_id, **extra}, self.store, self.settings, self.lookup, now
        )

    def status(self, case_id: str) -> str:
        case = self.store.get_case(case_id)
        assert case is not None
        return str(case["status"])


def test_vendor_on_time_is_verified_at_the_deadline(store: Store) -> None:
    run = Replay(store, "dust")  # engine: filed day 12, fixed day 14, verified day 15
    run.until(12)
    case_id = "SS-SIM-0001-20261013"
    assert run.step("notifyVendor", case_id)["waitUntil"] == "2026-10-16T19:00:00Z"
    run.until(15)
    assert run.step("recheck", case_id)["outcome"] == "verified"
    run.step("verify", case_id)
    case = store.get_case(case_id)
    assert case is not None
    assert (case["status"], case["resolvedBy"], case["verifiedDate"]) == (
        "verified",
        "vendor",
        "2026-10-16",
    )
    assert case["familyMessage"].startswith("आपके panels पर धूल थी।")
    assert "DISCOM" not in case["familyMessage"]


def test_a_missed_deadline_escalates_then_verifies_like_the_engine(store: Store) -> None:
    run = Replay(store, "vendor-misses-deadline")  # engine: filed 15, escalated 18, verified 21
    run.until(15)
    case_id = "SS-SIM-0001-20261016"
    assert run.status(case_id) == "filed"
    run.step("notifyVendor", case_id)
    run.until(18)
    assert run.step("recheck", case_id)["outcome"] == "escalate"
    escalated = run.step("escalate", case_id)
    assert run.status(case_id) == "escalated"
    assert escalated["waitUntil"] == "2026-10-22T19:00:00Z"
    run.until(21)
    assert run.step("recheck", case_id)["outcome"] == "verified"
    run.step("verify", case_id)
    case = store.get_case(case_id)
    assert case is not None
    assert (case["resolvedBy"], case["escalatedDate"], case["verifiedDate"]) == (
        "discom",
        "2026-10-19",
        "2026-10-22",
    )
    assert "DISCOM से करवाया" in case["familyMessage"]
    # the scripted fault the next day opens a fresh case, as in the engine
    run.until(22)
    assert run.status("SS-SIM-0001-20261023") == "filed"


def test_a_case_closed_by_rain_ends_the_workflow(store: Store) -> None:
    run = Replay(store, "rain")
    run.until(13)  # filed day 12, closed by rain day 13
    assert run.step("recheck", "SS-SIM-0001-20261013")["outcome"] == "closed"


def test_recheck_waits_for_the_deadline_reading_then_gives_up(store: Store) -> None:
    run = Replay(store, "vendor-misses-deadline")
    run.until(17)  # deadline day 18 has no reading yet
    case_id = "SS-SIM-0001-20261016"
    attempts = 0
    for _ in range(MAX_PENDING - 1):
        result = run.step("recheck", case_id, attempts=attempts)
        assert result["outcome"] == "pending" and result["retryAfterSeconds"] == 21600
        attempts = result["attempts"]
    assert run.step("recheck", case_id, attempts=attempts)["outcome"] == "escalate"


def test_the_discom_is_reminded_then_the_case_is_unresolved(store: Store) -> None:
    run = Replay(store, "vendor-misses-deadline")
    run.until(18)
    case_id = "SS-SIM-0001-20261016"
    run.step("escalate", case_id)
    store.update_case(
        case_id, {"discomDeadlineDate": "2026-10-20"}
    )  # recheck on a still-broken day
    run.until(19)
    assert run.step("recheck", case_id)["outcome"] == "still_failing"
    run.step("remind", case_id)
    run.step("remind", case_id)
    store.update_case(case_id, {"discomDeadlineDate": "2026-10-20"})
    assert run.step("recheck", case_id)["outcome"] == "unresolved"


def test_emails_go_out_through_ses_when_configured(store: Store) -> None:
    boto3.client("ses").verify_email_identity(EmailAddress="alerts@suryasaathi.dev")
    settings = Settings(
        agent_enabled=False,
        sender_email="alerts@suryasaathi.dev",
        vendor_email="vendor@example.com",
        discom_email="discom@example.com",
    )
    run = Replay(store, "vendor-misses-deadline", settings)
    run.until(18)
    case_id = "SS-SIM-0001-20261016"
    run.step("notifyVendor", case_id)
    run.step("escalate", case_id)
    assert boto3.client("ses").get_send_quota()["SentLast24Hours"] == 2


def test_without_ses_the_email_is_logged_instead(
    store: Store, caplog: pytest.LogCaptureFixture
) -> None:
    run = Replay(store, "fault")
    run.until(12)
    run.step("notifyVendor", "SS-SIM-0001-20261013")
    skipped = [r for r in caplog.records if r.getMessage() == "email_skipped"]
    assert skipped and "free repair due by 2026-10-16" in skipped[-1].subject  # type: ignore[attr-defined]
