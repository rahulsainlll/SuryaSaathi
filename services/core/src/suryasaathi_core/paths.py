"""Where packages/schemas lives: next to the code in a checkout, or copied into the image."""

import os
from functools import cache
from pathlib import Path


@cache
def schemas_package() -> Path:
    """The packages/schemas directory (holding schemas/ and fixtures/).

    Set ``SURYASAATHI_SCHEMAS_DIR`` to override; the Lambda images do, since they copy the
    directory to /var/task. Otherwise the repository checkout is found from this file.
    """
    if env := os.environ.get("SURYASAATHI_SCHEMAS_DIR"):
        return Path(env)
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "packages" / "schemas"
        if (candidate / "schemas").is_dir():
            return candidate
    raise FileNotFoundError("packages/schemas not found; set SURYASAATHI_SCHEMAS_DIR")
