"""Lets `uv run tools/device-sim ...` run the CLI from the repository root."""

import sys

from suryasaathi_device_sim.cli import main

if __name__ == "__main__":
    sys.exit(main())
