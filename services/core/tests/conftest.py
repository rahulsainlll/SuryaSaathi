from collections.abc import Iterator

import boto3
import pytest
from moto import mock_aws
from suryasaathi_core.store import Store
from suryasaathi_core.testing import create_tables


@pytest.fixture
def aws(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "ap-south-1")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        yield


@pytest.fixture
def store(aws: None) -> Store:
    db = boto3.resource("dynamodb")
    return Store(create_tables(db), db)
