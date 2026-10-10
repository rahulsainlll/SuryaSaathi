# tools/device-sim

Virtual device that publishes simulated daily readings to AWS IoT Core, so cases can be watched
opening, escalating and closing without real hardware.

```bash
uv run tools/device-sim --systems 20 --days 30
```

Scaffold only: it parses its arguments and exits. Needs `IOT_ENDPOINT` once implemented.
