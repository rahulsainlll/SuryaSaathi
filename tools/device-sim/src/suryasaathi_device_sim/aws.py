"""The AWS calls the simulator makes from your laptop: register systems, fetch the cert."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import boto3
from suryasaathi_core.config import Settings
from suryasaathi_core.schemas import validate
from suryasaathi_core.store import Store

CERT_SECRET = "suryasaathi/simulator-certificate"


def register(records: list[dict[str, Any]], store: Store | None = None) -> None:
    """Writes the simulated systems to the systems table (ingest drops unknown systems)."""
    store = store or Store(Settings.from_env())
    for record in records:
        validate("system", record)
        store.put_system(record)


def iot_endpoint() -> str:
    """The account's IoT Core data endpoint (ATS)."""
    return boto3.client("iot").describe_endpoint(endpointType="iot:Data-ATS")["endpointAddress"]


def fetch_certificate(out_dir: Path, secret_id: str = CERT_SECRET) -> tuple[Path, Path]:
    """Saves the simulator certificate and private key that infra stored in Secrets Manager."""
    secret = boto3.client("secretsmanager").get_secret_value(SecretId=secret_id)
    data = json.loads(secret["SecretString"])
    out_dir.mkdir(parents=True, exist_ok=True)
    cert, key = out_dir / "cert.pem", out_dir / "private.key"
    cert.write_text(data["certificatePem"])
    key.write_text(data["privateKey"])
    os.chmod(key, 0o600)
    return cert, key
