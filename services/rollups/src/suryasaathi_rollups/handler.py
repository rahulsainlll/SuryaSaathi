"""AWS Lambda entry point for the rollups service."""

from typing import Any

SERVICE_NAME = "rollups"


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Handle a Lambda invocation. Not implemented yet."""
    return {"service": SERVICE_NAME, "status": "not_implemented"}
