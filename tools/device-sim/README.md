# tools/device-sim

Virtual devices for AWS IoT Core. Each simulated system (`SS-SIM-0001`, …) replays one of
the golden scenarios in `packages/schemas/fixtures` (dust, smog-day, fault, rain,
vendor-misses-deadline), publishing one `reading.schema.json` message per simulated day
to `suryasaathi/readings/<systemId>` over MQTT with the simulator's X.509 certificate.

```bash
uv run tools/device-sim fetch-cert                        # saves certs/cert.pem + private.key
uv run tools/device-sim --systems 5 --days 30 --speed 60  # register, then publish
uv run tools/device-sim --systems 2 --days 3 --dry-run    # print the messages only
```

Before publishing, `run` registers the systems in the systems table, marked with their
scenario, so the expected-output service serves that scenario's sunlight and rain and the
agent reaches the same decisions as the demo. Flags: `--endpoint` (default: looked up),
`--cert`, `--key`, `--ca`, `--certs-dir`, `--speed` (seconds per simulated day; use 60 with a
demo-mode deploy), `--scenario`, `--first-date`, `--no-register`, `--dry-run`. See
`docs/runbook.md` for the full walkthrough.
