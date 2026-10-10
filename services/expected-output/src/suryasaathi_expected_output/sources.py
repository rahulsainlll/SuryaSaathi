"""Sunlight from NASA POWER, haze and rain from Open-Meteo.

Every fetch has a short timeout. When a source is unreachable or has no data for the day,
the caller falls back to a deterministic value and records which inputs were assumed.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any

Fetch = Callable[[str], dict[str, Any]]

NASA_POWER = "https://power.larc.nasa.gov/api/temporal/daily/point"
OPEN_METEO_AIR = "https://air-quality-api.open-meteo.com/v1/air-quality"
OPEN_METEO_WEATHER = "https://api.open-meteo.com/v1/forecast"
TIMEOUT_SECONDS = 5.0
#: Overnight rain of at least this much washes dust off the panels.
RAIN_WASH_MM = 2.0

#: Typical monthly mean AOD at 550 nm over Delhi (MODIS climatology), for when Open-Meteo
#: is unreachable. Index 0 is January.
DELHI_AOD550_BY_MONTH = [0.62, 0.58, 0.55, 0.6, 0.68, 0.78, 0.7, 0.6, 0.52, 0.66, 0.88, 0.76]


class SourceUnavailable(Exception):
    """A data source failed or had no value for the day."""


def http_fetch(url: str) -> dict[str, Any]:
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_SECONDS) as response:
            data: dict[str, Any] = json.load(response)
            return data
    except Exception as e:  # network, HTTP, JSON: all mean "unavailable"
        raise SourceUnavailable(f"{url.split('?')[0]}: {e}") from e


@dataclass
class Sources:
    fetch: Fetch = http_fetch

    def cloud_factor(self, lat: float, lon: float, day: date) -> float:
        """NASA POWER all-sky / clear-sky surface irradiance for the day (1 = cloudless)."""
        ymd = day.strftime("%Y%m%d")
        query = urllib.parse.urlencode(
            {
                "parameters": "ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN",
                "community": "RE",
                "latitude": lat,
                "longitude": lon,
                "start": ymd,
                "end": ymd,
                "format": "JSON",
            }
        )
        data = self.fetch(f"{NASA_POWER}?{query}")
        try:
            params = data["properties"]["parameter"]
            allsky = float(params["ALLSKY_SFC_SW_DWN"][ymd])
            clear = float(params["CLRSKY_SFC_SW_DWN"][ymd])
        except (KeyError, TypeError, ValueError) as e:
            raise SourceUnavailable(f"NASA POWER: no sunlight for {day}") from e
        if allsky < 0 or clear <= 0:  # -999 marks missing data
            raise SourceUnavailable(f"NASA POWER: no sunlight for {day}")
        return min(allsky / clear, 1.0)

    def aod550(self, lat: float, lon: float, day: date) -> float:
        """Daytime mean aerosol optical depth at 550 nm from Open-Meteo."""
        query = urllib.parse.urlencode(
            {
                "latitude": lat,
                "longitude": lon,
                "hourly": "aerosol_optical_depth",
                "start_date": day.isoformat(),
                "end_date": day.isoformat(),
                "timezone": "Asia/Kolkata",
            }
        )
        data = self.fetch(f"{OPEN_METEO_AIR}?{query}")
        try:
            times = data["hourly"]["time"]
            values = data["hourly"]["aerosol_optical_depth"]
        except (KeyError, TypeError) as e:
            raise SourceUnavailable(f"Open-Meteo: no haze for {day}") from e
        daytime = [
            float(v)
            for t, v in zip(times, values, strict=False)
            if v is not None and 8 <= int(t[11:13]) <= 17
        ]
        if not daytime:
            raise SourceUnavailable(f"Open-Meteo: no haze for {day}")
        return sum(daytime) / len(daytime)

    def rain_mm(self, lat: float, lon: float, day: date) -> float:
        """Rain the day before the reading (it falls overnight and cleans the panels)."""
        before = day - timedelta(days=1)
        query = urllib.parse.urlencode(
            {
                "latitude": lat,
                "longitude": lon,
                "daily": "precipitation_sum",
                "start_date": before.isoformat(),
                "end_date": before.isoformat(),
                "timezone": "Asia/Kolkata",
            }
        )
        data = self.fetch(f"{OPEN_METEO_WEATHER}?{query}")
        try:
            value = data["daily"]["precipitation_sum"][0]
        except (KeyError, IndexError, TypeError) as e:
            raise SourceUnavailable(f"Open-Meteo: no rain data for {before}") from e
        if value is None:
            raise SourceUnavailable(f"Open-Meteo: no rain data for {before}")
        return float(value)


def climatology_aod550(day: date) -> float:
    return DELHI_AOD550_BY_MONTH[day.month - 1]
