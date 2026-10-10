"""Expected output per system and date: cached, from a fixture, live, or a fallback."""

from __future__ import annotations

from datetime import date
from typing import Any

from suryasaathi_core.fixtures import load_fixture
from suryasaathi_core.logs import log_event
from suryasaathi_core.store import Store

from .model import Roof, expected_kwh
from .sources import RAIN_WASH_MM, Sources, SourceUnavailable, climatology_aod550

MODEL = "pvlib-solis-pvwatts"


def expected_for(
    system: dict[str, Any], day: str, store: Store, sources: Sources | None = None
) -> dict[str, Any]:
    """The expected-output record for ``system`` on ``day`` (YYYY-MM-DD), cached in DynamoDB."""
    if cached := store.get_expected(system["systemId"], day):
        return cached
    record = compute(system, date.fromisoformat(day), sources or Sources())
    store.put_expected(record)
    log_event("expected_output_computed", **{k: v for k, v in record.items() if k != "inputs"})
    return record


def compute(system: dict[str, Any], day: date, sources: Sources) -> dict[str, Any]:
    base = {"systemId": system["systemId"], "date": day.isoformat()}
    if (sim := system.get("simulation")) and (fixed := _from_fixture(sim, day)):
        return {**base, **fixed, "source": "fixture"}

    loc = system["location"]
    lat, lon = float(loc["lat"]), float(loc["lon"])
    inputs: dict[str, Any] = {}
    assumed: list[str] = []

    try:
        aod = sources.aod550(lat, lon, day)
        inputs["haze"] = {"aod550": round(aod, 3), "from": "open-meteo"}
    except SourceUnavailable as e:
        aod = climatology_aod550(day)
        inputs["haze"] = {"aod550": aod, "from": "delhi-climatology", "error": str(e)}
        assumed.append("haze")
    try:
        cloud = sources.cloud_factor(lat, lon, day)
        inputs["sunlight"] = {"cloudFactor": round(cloud, 3), "from": "nasa-power"}
    except SourceUnavailable as e:
        cloud = 1.0
        inputs["sunlight"] = {"cloudFactor": 1.0, "from": "assumed-clear", "error": str(e)}
        assumed.append("sunlight")
    try:
        rain = sources.rain_mm(lat, lon, day)
        inputs["rain"] = {"mm": rain, "from": "open-meteo"}
    except SourceUnavailable as e:
        rain = 0.0
        inputs["rain"] = {"mm": 0.0, "from": "assumed-dry", "error": str(e)}
        assumed.append("rain")

    roof = Roof(lat=lat, lon=lon, capacity_kw=float(system["capacityKw"]))
    result = expected_kwh(roof, day, aod, cloud, reference_aod550=climatology_aod550(day))
    return {
        **base,
        "expectedKwh": result.expected_kwh,
        "clearSkyKwh": result.clear_sky_kwh,
        "rained": rain >= RAIN_WASH_MM,
        "source": "live" if not assumed else ("fallback" if len(assumed) == 3 else "partial"),
        "assumed": assumed,
        "model": MODEL,
        "inputs": inputs,
    }


def _from_fixture(sim: dict[str, Any], day: date) -> dict[str, Any] | None:
    """For simulated systems: the scenario's own expected output and rain for that day."""
    index = (day - date.fromisoformat(sim["firstDate"])).days
    days = load_fixture(sim["scenario"]).days
    if not 0 <= index < len(days):
        return None
    d = days[index]
    return {"expectedKwh": d.expected_kwh, "clearSkyKwh": d.clear_sky_kwh, "rained": d.rained}
