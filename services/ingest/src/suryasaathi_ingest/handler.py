"""AWS IoT rule → Lambda: validate a device reading and store it.

The IoT rule selects ``*, topic(3) AS topicSystemId`` from ``suryasaathi/readings/+``, so
the event is the reading plus the system id from the topic. Storing the reading inserts a
row in the readings table, whose stream invokes the diagnosis agent.
"""

from __future__ import annotations

from typing import Any

from aws_lambda_powertools.utilities.typing import LambdaContext
from suryasaathi_core.logs import log_event, logger
from suryasaathi_core.schemas import errors
from suryasaathi_core.store import Store

TOPIC_FIELD = "topicSystemId"

_store: Store | None = None


def store() -> Store:
    global _store
    if _store is None:
        _store = Store()
    return _store


@logger.inject_lambda_context(clear_state=True)
def handler(event: dict[str, Any], context: LambdaContext) -> dict[str, Any]:
    return ingest(event, store())


def ingest(event: dict[str, Any], db: Store) -> dict[str, Any]:
    reading = {k: v for k, v in event.items() if k != TOPIC_FIELD}
    system_id = reading.get("systemId")

    if problems := errors("reading", reading):
        return _reject("invalid_reading", system_id, problems=problems)
    if event.get(TOPIC_FIELD) not in (None, system_id):
        return _reject("topic_mismatch", system_id, topic_system_id=event[TOPIC_FIELD])

    system = db.get_system(reading["systemId"])
    if system is None:
        return _reject("unknown_system", system_id)
    if not system.get("consent", {}).get("granted"):
        return _reject("no_consent", system_id)

    db.put_reading(reading)
    log_event(
        "reading_stored",
        system_id=reading["systemId"],
        date=reading["date"],
        energy_kwh=reading["energyKwh"],
        source=reading["source"],
        fault_code=reading.get("faultCode"),
    )
    return {"status": "stored", "systemId": reading["systemId"], "date": reading["date"]}


def _reject(reason: str, system_id: Any, **details: Any) -> dict[str, Any]:
    log_event("reading_rejected", reason=reason, system_id=system_id, **details)
    return {"status": "rejected", "reason": reason}
