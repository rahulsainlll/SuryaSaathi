"""Virtual device: sends simulated readings to AWS IoT Core.

Run from the repo root:  uv run tools/device-sim --systems 20 --days 30
"""

import argparse
import sys


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(prog="device-sim", description=__doc__)
    parser.add_argument("--systems", type=int, default=1, help="number of simulated systems")
    parser.add_argument("--days", type=int, default=30, help="days of readings per system")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    print(
        f"device-sim: would publish {args.days} days for {args.systems} systems "
        "(not implemented yet)",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
