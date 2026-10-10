# services/ingest

IoT rule handler. The `SuryaSaathi-Ingest` stack routes every message on
`suryasaathi/readings/+` to `suryasaathi_ingest.handler.handler`, which:

1. validates the reading against `reading.schema.json`,
2. checks the topic's system id matches the payload,
3. drops readings from unknown systems or systems without consent,
4. stores the reading in the readings table; the table's stream invokes the diagnosis agent.

Every stored or rejected reading is logged as structured JSON (`reading_stored`,
`reading_rejected`).

```bash
uv run pytest services/ingest
```
