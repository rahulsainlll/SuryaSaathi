from suryasaathi_rollups.handler import SERVICE_NAME, handler


def test_handler_returns_not_implemented() -> None:
    result = handler({}, None)

    assert result == {"service": SERVICE_NAME, "status": "not_implemented"}
