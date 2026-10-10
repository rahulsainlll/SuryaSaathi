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

INGEST_STACK = "SuryaSaathi-Ingest"
CERT_SECRET_OUTPUT = "SimulatorCertificateSecret"


def register(records: list[dict[str, Any]], store: Store | None = None) -> None:
    """Writes the simulated systems to the systems table (ingest drops unknown systems)."""
    store = store or Store(Settings.from_env())
    for record in records:
        validate("system", record)
        store.put_system(record)


def iot_endpoint() -> str:
    """The account's IoT Core data endpoint (ATS)."""
    return boto3.client("iot").describe_endpoint(endpointType="iot:Data-ATS")["endpointAddress"]


def certificate_secret_id(stack: str = INGEST_STACK) -> str:
    """The secret holding the simulator certificate, from the Ingest stack's outputs."""
    outputs = (
        boto3.client("cloudformation")
        .describe_stacks(StackName=stack)["Stacks"][0]
        .get("Outputs", [])
    )
    for output in outputs:
        if output["OutputKey"] == CERT_SECRET_OUTPUT:
            return str(output["OutputValue"])
    raise LookupError(f"{stack} has no {CERT_SECRET_OUTPUT} output; is it deployed?")


def fetch_certificate(out_dir: Path, secret_id: str | None = None) -> tuple[Path, Path]:
    """Saves the simulator certificate and private key that infra stored in Secrets Manager."""
    secret = boto3.client("secretsmanager").get_secret_value(
        SecretId=secret_id or certificate_secret_id()
    )
    data = json.loads(secret["SecretString"])
    out_dir.mkdir(parents=True, exist_ok=True)
    cert, key = out_dir / "cert.pem", out_dir / "private.key"
    cert.write_text(data["certificatePem"])
    key.write_text(data["privateKey"])
    os.chmod(key, 0o600)
    return cert, key
