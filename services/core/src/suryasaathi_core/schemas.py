"""Validation against the shared JSON schemas in packages/schemas."""

import json
from functools import cache
from typing import Any, Literal

from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

from .paths import schemas_package

SchemaName = Literal["reading", "system", "case"]
BASE = "https://suryasaathi.dev/schemas/"


@cache
def _registry() -> Registry:
    resources = []
    for path in sorted((schemas_package() / "schemas").glob("*.schema.json")):
        schema = json.loads(path.read_text())
        resources.append((schema["$id"], Resource.from_contents(schema)))
    return Registry().with_resources(resources)


@cache
def validator(name: SchemaName) -> Draft202012Validator:
    schema = _registry().contents(f"{BASE}{name}.schema.json")
    return Draft202012Validator(schema, registry=_registry(), format_checker=FormatChecker())


def validate(name: SchemaName, data: Any) -> None:
    """Raises ``jsonschema.ValidationError`` when ``data`` doesn't match the schema."""
    validator(name).validate(data)


def errors(name: SchemaName, data: Any) -> list[str]:
    """Every problem with ``data``, as readable messages (empty when it is valid)."""
    return [
        f"{'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message}"
        for e in validator(name).iter_errors(data)
    ]
