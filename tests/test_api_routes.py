from __future__ import annotations

from fastapi.testclient import TestClient

from nakari.api.app import _get_allowed_origins, _get_public_websocket_url, create_app


def test_live2d_routes_are_mounted_under_single_api_prefix() -> None:
    app = create_app()

    with TestClient(app) as client:
        assert client.get("/api/config").status_code == 200
        assert client.get("/api/models").status_code == 200
        assert client.get("/api/emotions").status_code == 200
        assert client.get("/api/motions").status_code == 200
        assert client.get("/api/api/config").status_code == 404


def test_allowed_origins_are_trimmed_from_env(monkeypatch) -> None:
    monkeypatch.setenv("ALLOWED_ORIGINS", " http://one.example, ,http://two.example ")

    assert _get_allowed_origins() == [
        "http://one.example",
        "http://two.example",
    ]


def test_health_websocket_url_uses_api_env(monkeypatch) -> None:
    monkeypatch.delenv("NAKARI_PUBLIC_WS_URL", raising=False)
    monkeypatch.setenv("NAKARI_API_HOST", "127.0.0.1")
    monkeypatch.setenv("NAKARI_API_PORT", "9012")

    assert _get_public_websocket_url() == "ws://127.0.0.1:9012/api/ws"


def test_health_websocket_url_can_be_public_override(monkeypatch) -> None:
    monkeypatch.setenv("NAKARI_PUBLIC_WS_URL", "wss://assistant.example/ws")

    assert _get_public_websocket_url() == "wss://assistant.example/ws"
