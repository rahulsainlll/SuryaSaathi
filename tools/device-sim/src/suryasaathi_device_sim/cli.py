"""device-sim: replay the golden scenarios to AWS IoT Core.

uv run tools/device-sim fetch-cert                       # once, after `cdk deploy`
uv run tools/device-sim --systems 20 --days 30 --speed 60
uv run tools/device-sim --systems 5 --dry-run            # print, don't send
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from collections.abc import Callable
from datetime import date
from pathlib import Path

from .plan import (
    DEFAULT_SCENARIOS,
    TOPIC_PREFIX,
    default_first_date,
    messages_for_day,
    simulated_systems,
)
from .publisher import MqttPublisher, PrintPublisher, Publisher

COMMANDS = {"run", "register", "fetch-cert"}
MAX_DAYS = 30


def _common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--systems", type=int, default=5, help="number of simulated systems (default 5)")
    p.add_argument(
        "--days",
        type=int,
        default=MAX_DAYS,
        help=f"days to replay, 1-{MAX_DAYS} (default {MAX_DAYS})",
    )
    p.add_argument(
        "--scenario",
        action="append",
        choices=DEFAULT_SCENARIOS,
        help="scenario to replay; repeat for several (default: all five, round-robin)",
    )
    p.add_argument(
        "--first-date",
        type=date.fromisoformat,
        help="date to send fixture day 0 as (default: so the last day is today)",
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="device-sim", description=__doc__.split("\n\n")[0])
    sub = parser.add_subparsers(dest="command")

    run = sub.add_parser("run", help="register the systems and publish their readings")
    _common(run)
    run.add_argument(
        "--endpoint",
        default=os.environ.get("IOT_ENDPOINT"),
        help="IoT Core data endpoint (or IOT_ENDPOINT; looked up if unset)",
    )
    run.add_argument(
        "--certs-dir",
        type=Path,
        default=Path("certs"),
        help="where fetch-cert saved cert.pem and private.key",
    )
    run.add_argument("--cert", type=Path, help="device certificate (default CERTS_DIR/cert.pem)")
    run.add_argument("--key", type=Path, help="private key (default CERTS_DIR/private.key)")
    run.add_argument("--ca", type=Path, help="Amazon Root CA 1 (default: the system trust store)")
    run.add_argument(
        "--client-id",
        default="suryasaathi-sim",
        help="MQTT client id; must match the IoT thing name",
    )
    run.add_argument("--topic-prefix", default=TOPIC_PREFIX)
    run.add_argument(
        "--speed",
        type=float,
        default=5.0,
        help="seconds of wall-clock time per simulated day (default 5; 0 = no wait). "
        "Use 60 with a demo-mode deploy so case deadlines line up.",
    )
    run.add_argument("--no-register", action="store_true", help="skip writing the systems table")
    run.add_argument(
        "--dry-run", action="store_true", help="print the readings instead of publishing"
    )

    reg = sub.add_parser("register", help="only write the simulated systems to the systems table")
    _common(reg)

    cert = sub.add_parser("fetch-cert", help="save the simulator certificate from Secrets Manager")
    cert.add_argument("--out", type=Path, default=Path("certs"))
    cert.add_argument(
        "--secret-id", help="secret name or ARN (default: from the SuryaSaathi-Ingest stack)"
    )
    return parser


def main(
    argv: list[str] | None = None,
    publisher_factory: Callable[[argparse.Namespace], Publisher] | None = None,
    sleep: Callable[[float], None] = time.sleep,
) -> int:
    args_list = list(sys.argv[1:] if argv is None else argv)
    if not args_list or args_list[0] not in COMMANDS | {"-h", "--help"}:
        args_list.insert(0, "run")  # `device-sim --systems 20 --days 30` means run
    args = build_parser().parse_args(args_list)

    if args.command == "fetch-cert":
        from .aws import fetch_certificate, iot_endpoint

        cert, key = fetch_certificate(args.out, args.secret_id)
        print(f"Saved {cert} and {key}")
        print(f"IoT endpoint: {iot_endpoint()}")
        return 0

    if not 1 <= args.days <= MAX_DAYS:
        print(
            f"--days must be between 1 and {MAX_DAYS} (the fixtures are 30 days)", file=sys.stderr
        )
        return 2
    systems = simulated_systems(args.systems, args.scenario)
    first = args.first_date or default_first_date(args.days)

    if args.command == "register" or not (args.no_register or args.dry_run):
        from .aws import register

        register([s.record(first) for s in systems])
        print(f"Registered {len(systems)} systems (first day {first})", file=sys.stderr)
        if args.command == "register":
            return 0

    publisher = (publisher_factory or _publisher)(args)
    try:
        for day in range(args.days):
            for m in messages_for_day(systems, day, first, args.topic_prefix):
                publisher.publish(m.topic, m.reading)
            print(f"Day {day + 1}/{args.days}: {len(systems)} readings sent", file=sys.stderr)
            if args.speed and day < args.days - 1:
                sleep(args.speed)
    finally:
        publisher.close()
    return 0


def _publisher(args: argparse.Namespace) -> Publisher:
    if args.dry_run:
        return PrintPublisher()
    endpoint = args.endpoint
    if not endpoint:
        from .aws import iot_endpoint

        endpoint = iot_endpoint()
    return MqttPublisher(
        endpoint=endpoint,
        cert=args.cert or args.certs_dir / "cert.pem",
        key=args.key or args.certs_dir / "private.key",
        ca=args.ca,
        client_id=args.client_id,
    )
