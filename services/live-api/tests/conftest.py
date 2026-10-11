from collections.abc import Iterator
from typing import Any

import boto3
import pytest
from moto import mock_aws
from suryasaathi_core.config import Settings
from suryasaathi_core.store import Store
from suryasaathi_core.summaries import Summaries
from suryasaathi_core.testing import console_fixture, create_tables, load_console_fleet


@pytest.fixture
def aws(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        yield


@pytest.fixture
def settings() -> Settings:
    return Settings()


@pytest.fixture
def tables(aws: None, settings: Settings) -> tuple[Store, Summaries]:
    db = boto3.resource("dynamodb")
    create_tables(db, settings)
    return Store(settings, db), Summaries(settings, db)


@pytest.fixture
def fixture() -> tuple[dict[str, Any], dict[str, Any]]:
    return console_fixture()


@pytest.fixture
def loaded(
    tables: tuple[Store, Summaries], fixture: tuple[dict[str, Any], dict[str, Any]]
) -> tuple[Store, Summaries]:
    load_console_fleet(tables[0], fixture[0])
    return tables


@pytest.fixture
def rolled_up(loaded: tuple[Store, Summaries], settings: Settings) -> tuple[Store, Summaries]:
    """The fixture loaded and the nightly rollup run as of its last day."""
    from suryasaathi_rollups.handler import run

    run(*loaded, settings, "2026-10-10")
    return loaded
