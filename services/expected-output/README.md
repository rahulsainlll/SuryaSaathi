# services/expected-output

What each roof should have made on a given day, in kWh, cached in the expected table.

- **Model** (`model.py`): pvlib. A Simplified Solis clear sky with that day's aerosol optical
  depth (haze), transposed to the panel plane and run through PVWatts with 14% losses and a
  96% inverter, then scaled by NASA POWER's all-sky / clear-sky ratio (clouds). The same
  roof on a cloudless day with the month's ordinary haze is the clear-sky reference the
  smog rule uses, so only an unusually hazy or cloudy day reads as "expected is low".
- **Inputs** (`sources.py`): NASA POWER for sunlight, Open-Meteo for haze (AOD at 550 nm)
  and the previous day's rain (≥ 2 mm washes the panels).
- **Fallback**: an unreachable or empty source is replaced deterministically (Delhi's
  monthly AOD climatology, a cloudless sky, no rain), and the record lists what was assumed
  (`source`: live, partial or fallback).
- **Simulated systems** (`simulation` in the system record) get their scenario's expected
  output and rain from the golden fixture, so the agent sees the same world as the demo.

Invoked by the agent for one system and day, and nightly by EventBridge for every system.

```bash
uv run pytest services/expected-output
```
