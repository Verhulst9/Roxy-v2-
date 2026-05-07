"""WebSocket output adapter for nakari.

Provides multi-output support for nakari's reply tool,
allowing messages to be sent to both CLI and WebSocket simultaneously.
"""

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from nakari.frontend_adapter.audio_interceptor import AudioBroadcaster
    from nakari.frontend_adapter.state_emitter import StateEmitter

_log = structlog.get_logger("multi_output")


class OutputEndpoint(ABC):
    """Abstract base class for output endpoints."""

    @abstractmethod
    async def send(self, message: str, **metadata: object) -> None:
        """Send a message to this endpoint."""
        ...


class CLIOutput(OutputEndpoint):
    """CLI output endpoint (existing functionality)."""

    def __init__(self) -> None:
        self._log = structlog.get_logger("cli_output")

    async def send(self, message: str, **metadata: object) -> None:
        """Print message to CLI via the existing print_reply callback."""
        from nakari.cli import CLI

        await CLI.print_reply(message)


class WebSocketOutput(OutputEndpoint):
    """WebSocket output endpoint for frontend."""

    def __init__(self, ws_manager) -> None:
        # Import here to avoid circular dependency
        self._manager = ws_manager
        self._log = structlog.get_logger("websocket_output")

    async def send(self, message: str, **metadata: object) -> None:
        """Send message to all connected WebSocket clients."""
        reply_msg = {
            "version": "1.0",
            "type": "text",
            "timestamp": asyncio.get_running_loop().time(),
            "payload": {
                "text": message,
                "isUser": False,
            },
        }
        await self._manager.broadcast(reply_msg)
        self._log.debug("reply_sent", content_length=len(message))


class MultiOutputHandler:
    """Multi-output handler that broadcasts to multiple endpoints.

    This allows nakari to send replies to both CLI and web frontend
    simultaneously, or to any number of output endpoints.
    """

    def __init__(self) -> None:
        self._outputs: list[OutputEndpoint] = []
        self._log = structlog.get_logger("multi_output_handler")

    def register(self, endpoint: OutputEndpoint) -> None:
        """Register a new output endpoint.

        Args:
            endpoint: The output endpoint to register
        """
        self._outputs.append(endpoint)
        self._log.info("output_registered", endpoint=type(endpoint).__name__)

    def unregister(self, endpoint: OutputEndpoint) -> None:
        """Unregister an output endpoint.

        Args:
            endpoint: The output endpoint to unregister
        """
        if endpoint in self._outputs:
            self._outputs.remove(endpoint)
            self._log.info("output_unregistered", endpoint=type(endpoint).__name__)

    async def emit(self, message: str, **metadata: object) -> None:
        """Broadcast a message to all registered output endpoints.

        Args:
            message: The message to send
            **metadata: Additional metadata to include with the message
        """
        self._log.debug("emitting_message", outputs=len(self._outputs))

        # Send to all endpoints concurrently
        tasks = [output.send(message, **metadata) for output in self._outputs]
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for output, result in zip(self._outputs, results):
                if isinstance(result, Exception):
                    self._log.warning(
                        "output_send_failed",
                        endpoint=type(output).__name__,
                        error=str(result),
                    )

    @property
    def output_count(self) -> int:
        """Return the number of registered output endpoints."""
        return len(self._outputs)
