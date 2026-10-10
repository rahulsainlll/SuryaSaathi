"""Publishing to AWS IoT Core over MQTT with mutual TLS (X.509 certificate)."""

from __future__ import annotations

import json
import ssl
from pathlib import Path
from typing import Any, Protocol

import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion


class Publisher(Protocol):
    def publish(self, topic: str, payload: dict[str, Any]) -> None: ...
    def close(self) -> None: ...


class MqttPublisher:
    """Connects to the IoT Core data endpoint on port 8883 and publishes with QoS 1."""

    def __init__(
        self,
        endpoint: str,
        cert: Path,
        key: Path,
        ca: Path | None,
        client_id: str,
        port: int = 8883,
        timeout: float = 10.0,
    ) -> None:
        self.timeout = timeout
        self.client = mqtt.Client(CallbackAPIVersion.VERSION2, client_id=client_id)
        self.client.tls_set(
            ca_certs=str(ca) if ca else None,
            certfile=str(cert),
            keyfile=str(key),
            tls_version=ssl.PROTOCOL_TLS_CLIENT,
        )
        self.client.connect(endpoint, port, keepalive=60)
        self.client.loop_start()

    def publish(self, topic: str, payload: dict[str, Any]) -> None:
        info = self.client.publish(topic, json.dumps(payload), qos=1)
        info.wait_for_publish(timeout=self.timeout)
        if not info.is_published():
            raise TimeoutError(f"IoT Core did not acknowledge {topic} within {self.timeout}s")

    def close(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()


class PrintPublisher:
    """--dry-run: prints each message as a JSON line instead of sending it."""

    def publish(self, topic: str, payload: dict[str, Any]) -> None:
        print(json.dumps({"topic": topic, "payload": payload}))

    def close(self) -> None:
        pass
