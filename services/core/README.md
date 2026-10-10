# services/core

Shared Python code for the services: the diagnosis rules and case workflow ported from
`packages/engine`, validation against `packages/schemas`, the golden fixtures, DynamoDB
access and structured decision logs.

`tests/test_parity.py` replays every golden fixture through `suryasaathi_core.rules` and
fails if any day's diagnosis, case state or decision wording differs from the TypeScript
engine, so the demo and the real agent never disagree.

```bash
uv run pytest services/core
```
