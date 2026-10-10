"""AWS Lambda entry point for the ingest service."""

from typing import Any

SERVICE_NAME = "ingest"


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle a Lambda invocation. Not implemented yet."""
    return {"service": SERVICE_NAME, "status": "not_implemented"}
