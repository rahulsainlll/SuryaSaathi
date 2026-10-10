from collections.abc import Iterator
from datetime import date
from typing import Any

import boto3
import pytest
from moto import mock_aws
from suryasaathi_core.fixtures import load_fixture
from suryasaathi_core.store import Store
from suryasaathi_core.testing import create_tables, system_record
from suryasaathi_expected_output.handler import handle
from suryasaathi_expected_output.model import Roof, clear_day_kwh, expected_kwh
from suryasaathi_expected_output.service import compute, expected_for
from suryasaathi_expected_output.sources import Sources, SourceUnavailable

DWARKA = Roof(lat=28.5921, lon=77.046, capacity_kw=3)
DAY = date(2026, 10, 9)


class FakeFetch:
    """Canned NASA POWER and Open-Meteo responses; records the URLs it was asked for."""

    def __init__(
        self, aod: float = 0.4, allsky: float = 5.0, clear: float = 6.0, rain: float = 0.0
    ):
        self.aod, self.allsky, self.clear, self.rain = aod, allsky, clear, rain
        self.calls: list[str] = []

    def __call__(self, url: str) -> dict[str, Any]:
        self.calls.append(url)
        if "power.larc.nasa.gov" in url:
            ymd = DAY.strftime("%Y%m%d")
            sky = {"ALLSKY_SFC_SW_DWN": {ymd: self.allsky}, "CLRSKY_SFC_SW_DWN": {ymd: self.clear}}
            return {"properties": {"parameter": sky}}
        if "air-quality" in url:
            hours = [f"{DAY}T{h:02d}:00" for h in range(24)]
            return {"hourly": {"time": hours, "aerosol_optical_depth": [self.aod] * 24}}
        return {"daily": {"precipitation_sum": [self.rain]}}


def unreachable(url: str) -> dict[str, Any]:
    raise SourceUnavailable("network down")


@pytest.fixture
def db(monkeypatch: pytest.MonkeyPatch) -> Iterator[Store]:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        resource = boto3.resource("dynamodb")
        yield Store(create_tables(resource), resource)


# --- model -------------------------------------------------------------------------


def test_a_clear_october_day_in_delhi_is_plausible_for_3_kw() -> None:
    kwh = clear_day_kwh(DWARKA, DAY, aod550=0.05)
    assert 12 < kwh < 18  # ~4.5-5.5 kWh per kW on a clean, clear day


def test_ordinary_haze_is_not_low_but_heavy_smog_and_cloud_are() -> None:
    typical = 0.66  # Delhi in October
    ordinary = expected_kwh(DWARKA, DAY, aod550=typical, cloud_factor=1.0, reference_aod550=typical)
    smog = expected_kwh(DWARKA, DAY, aod550=1.5, cloud_factor=1.0, reference_aod550=typical)
    cloudy = expected_kwh(DWARKA, DAY, aod550=typical, cloud_factor=0.5, reference_aod550=typical)
    assert ordinary.expected_kwh == ordinary.clear_sky_kwh
    assert smog.expected_kwh < 0.8 * smog.clear_sky_kwh  # "expected is low"
    assert cloudy.expected_kwh == pytest.approx(ordinary.expected_kwh * 0.5, abs=0.01)


def test_the_model_is_deterministic() -> None:
    assert expected_kwh(DWARKA, DAY, 0.6, 0.9, 0.66) == expected_kwh(DWARKA, DAY, 0.6, 0.9, 0.66)


# --- sources -----------------------------------------------------------------------


def test_live_sources_feed_the_model() -> None:
    record = compute(
        system_record(), DAY, Sources(FakeFetch(aod=0.4, allsky=5.0, clear=6.0, rain=3.1))
    )
    assert record["source"] == "live" and record["assumed"] == []
    assert record["inputs"]["sunlight"] == {"cloudFactor": 0.833, "from": "nasa-power"}
    assert record["inputs"]["haze"] == {"aod550": 0.4, "from": "open-meteo"}
    assert record["rained"] is True
    expected = expected_kwh(DWARKA, DAY, 0.4, 5 / 6, reference_aod550=0.66)
    assert record["expectedKwh"] == expected.expected_kwh
    assert record["clearSkyKwh"] == expected.clear_sky_kwh


def test_missing_nasa_values_count_as_unavailable() -> None:
    record = compute(system_record(), DAY, Sources(FakeFetch(allsky=-999)))
    assert record["source"] == "partial" and record["assumed"] == ["sunlight"]


def test_unreachable_apis_fall_back_deterministically() -> None:
    first = compute(system_record(), DAY, Sources(unreachable))
    second = compute(system_record(), DAY, Sources(unreachable))
    assert first == second
    assert first["source"] == "fallback"
    assert first["assumed"] == ["haze", "sunlight", "rain"]
    assert first["inputs"]["haze"]["from"] == "delhi-climatology"
    assert first["rained"] is False
    assert first["expectedKwh"] == first["clearSkyKwh"]  # ordinary haze, clear sky


def test_simulated_systems_use_their_scenarios_world() -> None:
    fixture = load_fixture("smog-day")
    system = system_record(simulation={"scenario": "smog-day", "firstDate": "2026-10-01"})
    record = compute(system, date(2026, 10, 7), Sources(unreachable))  # fixture day 6: smog
    assert record["source"] == "fixture"
    assert record["expectedKwh"] == fixture.days[6].expected_kwh
    assert record["clearSkyKwh"] == fixture.days[6].clear_sky_kwh
    assert record["rained"] is False
    # outside the fixture's 30 days it falls back to the live/fallback path
    assert compute(system, date(2026, 11, 15), Sources(unreachable))["source"] == "fallback"


# --- cache and handler -------------------------------------------------------------


def test_results_are_cached_in_dynamodb(db: Store) -> None:
    fetch = FakeFetch()
    system = system_record()
    first = expected_for(system, DAY.isoformat(), db, Sources(fetch))
    calls = len(fetch.calls)
    again = expected_for(system, DAY.isoformat(), db, Sources(fetch))
    assert len(fetch.calls) == calls
    assert again["expectedKwh"] == first["expectedKwh"]


def test_handler_serves_one_system_or_runs_the_daily_batch(db: Store) -> None:
    for i in (1, 2):
        db.put_system(
            system_record(
                f"SS-SIM-000{i}", simulation={"scenario": "dust", "firstDate": "2026-10-01"}
            )
        )
    one = handle({"systemId": "SS-SIM-0001", "date": "2026-10-01"}, db)
    assert one["expectedKwh"] == load_fixture("dust").days[0].expected_kwh
    assert handle({"systemId": "SS-NOPE", "date": "2026-10-01"}, db)["error"] == "unknown_system"
    assert handle({"date": "2026-10-02"}, db) == {"date": "2026-10-02", "systems": 2}
    assert db.get_expected("SS-SIM-0002", "2026-10-02") is not None
