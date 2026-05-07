from __future__ import annotations

import pytest

from nakari.api.websocket import WebSocketManager


class FakeWebSocket:
    def __init__(self, *, fail_send: bool = False) -> None:
        self.accepted = False
        self.closed = False
        self.sent_messages: list[dict] = []
        self.fail_send = fail_send

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, message: dict) -> None:
        if self.fail_send:
            raise RuntimeError("send failed")
        self.sent_messages.append(message)

    async def close(self) -> None:
        self.closed = True


@pytest.mark.asyncio
async def test_duplicate_client_id_replaces_old_socket_safely() -> None:
    manager = WebSocketManager()
    old_socket = FakeWebSocket()
    new_socket = FakeWebSocket()

    await manager.connect("client-1", old_socket)
    await manager.connect("client-1", new_socket)
    manager.disconnect("client-1", old_socket)

    assert old_socket.closed is True
    assert new_socket.accepted is True
    assert manager.connection_count == 1
    assert manager.connected_clients == {"client-1"}

    manager.disconnect("client-1", new_socket)
    assert manager.connection_count == 0


@pytest.mark.asyncio
async def test_broadcast_disconnects_failed_clients() -> None:
    manager = WebSocketManager()
    ok_socket = FakeWebSocket()
    failing_socket = FakeWebSocket()

    await manager.connect("ok", ok_socket)
    await manager.connect("bad", failing_socket)
    failing_socket.fail_send = True
    await manager.broadcast({"type": "state", "payload": {"state": "idle"}})

    assert manager.connected_clients == {"ok"}
    assert ok_socket.sent_messages[-1]["type"] == "state"
