"""Expected daily output for one roof with pvlib.

Haze enters through the clear-sky model: Simplified Solis takes aerosol optical depth at
700 nm, so a smoggy day lowers the clear-sky irradiance itself. Clouds enter as NASA
POWER's all-sky / clear-sky ratio for the day. Irradiance is transposed to the panel
plane and run through PVWatts with fixed losses. The clear-sky reference uses the month's
ordinary haze, matching the engine's "clear sky" (which already loses 6-14% to haze).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date

import pandas as pd
from pvlib import irradiance, pvsystem, temperature
from pvlib.location import Location

TIMEZONE = "Asia/Kolkata"
#: Ångström exponent for converting AOD from 550 nm (Open-Meteo) to 700 nm (Solis).
ANGSTROM_ALPHA = 1.3
PRECIPITABLE_WATER_CM = 2.0
GAMMA_PDC = -0.004  # per °C, typical crystalline silicon
SYSTEM_LOSSES = 0.14  # wiring, mismatch, soiling baseline, availability (PVWatts default)
INVERTER_EFFICIENCY = 0.96
STEP_MINUTES = 15


@dataclass(frozen=True)
class Roof:
    lat: float
    lon: float
    capacity_kw: float
    #: Panel tilt in degrees; rooftop systems in India are commonly tilted near latitude.
    tilt: float | None = None
    #: Degrees clockwise from north; 180 faces south.
    azimuth: float = 180.0


def aod700(aod550: float) -> float:
    return float(aod550 * (700 / 550) ** -ANGSTROM_ALPHA)


def clear_day_kwh(roof: Roof, day: date, aod550: float) -> float:
    """AC energy for a cloudless day with the given haze, kWh."""
    loc = Location(roof.lat, roof.lon, tz=TIMEZONE)
    start = pd.Timestamp(day.isoformat(), tz=TIMEZONE)
    times = pd.date_range(start, periods=24 * 60 // STEP_MINUTES, freq=f"{STEP_MINUTES}min")
    sun = loc.get_solarposition(times)
    sky = loc.get_clearsky(
        times,
        model="simplified_solis",
        solar_position=sun,
        aod700=aod700(aod550),
        precipitable_water=PRECIPITABLE_WATER_CM,
    )
    poa = irradiance.get_total_irradiance(
        surface_tilt=roof.tilt if roof.tilt is not None else abs(roof.lat),
        surface_azimuth=roof.azimuth,
        solar_zenith=sun["apparent_zenith"],
        solar_azimuth=sun["azimuth"],
        dni=sky["dni"],
        ghi=sky["ghi"],
        dhi=sky["dhi"],
    )
    g = poa["poa_global"].clip(lower=0).fillna(0)
    cell = temperature.faiman(g, temp_air=30.0, wind_speed=1.0)
    dc = pvsystem.pvwatts_dc(g, cell, pdc0=roof.capacity_kw * 1000, gamma_pdc=GAMMA_PDC)
    ac_w = dc.clip(lower=0) * (1 - SYSTEM_LOSSES) * INVERTER_EFFICIENCY
    return float(ac_w.sum() * STEP_MINUTES / 60 / 1000)


@dataclass(frozen=True)
class Expected:
    expected_kwh: float
    clear_sky_kwh: float


def expected_kwh(
    roof: Roof, day: date, aod550: float, cloud_factor: float, reference_aod550: float
) -> Expected:
    """What this roof should make given the day's haze and cloud.

    ``clear_sky_kwh`` is the reference the smog rule compares against: the same roof on a
    cloudless day with the haze that is ordinary for the place and month
    (``reference_aod550``). Only a day noticeably hazier or cloudier than that falls below
    80% of it, which is what "expected is low" means in the diagnosis rules.
    """
    hazy = clear_day_kwh(roof, day, aod550)
    ordinary = clear_day_kwh(roof, day, reference_aod550)
    factor = min(max(cloud_factor, 0.0), 1.0)
    return Expected(expected_kwh=round(hazy * factor, 3), clear_sky_kwh=round(ordinary, 3))
