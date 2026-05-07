"""WebSocket input adapter for nakari.

Converts WebSocket messages from the frontend into Mailbox events,
following the same pattern as CLI.input_loop().
"""

from __future__ import annotations

import asyncio
import json
import uuid
from typing import TYPE_CHECKING

import structlog

from nakari.config import Config
from nakari.mailbox import Mailbox
from nakari.models import Attachment, Event, EventType

if TYPE_CHECKING:
    from fastapi import WebSocket
    from nakari.journal import JournalStore

_log = structlog.get_logger("websocket_input")


class WebSocketInput:
    """WebSocket input adapter, similar to CLI.input_loop().

    This adapter receives messages from the web frontend via WebSocket
    and converts them into Mailbox events that nakari can process.
    """

    def __init__(self, mailbox: Mailbox, config: Config, journal: JournalStore | None = None) -> None:
        self._mailbox = mailbox
        self._config = config
        self._journal = journal
        self._log = _log

    async def handle_message(self, ws: WebSocket, message: str) -> None:
        """Handle a single WebSocket message.

        Args:
            ws: The WebSocket connection
            message: JSON message string from the frontend
        """
        try:
            data = json.loads(message)
            if not isinstance(data, dict):
                self._log.warning("invalid_message_payload", payload_type=type(data).__name__)
                return

            msg_type = data.get("type")
            # Support both "payload" (legacy) and "data" (new frontend) fields
            payload = data["payload"] if "payload" in data else data.get("data", {})
            if payload is None:
                payload = {}
            if not isinstance(payload, dict):
                self._log.warning(
                    "invalid_message_payload",
                    type=msg_type,
                    payload_type=type(payload).__name__,
                )
                return

            if msg_type == "user_text":
                await self._handle_user_text(payload)
            elif msg_type == "audio_blob":
                await self._handle_audio_blob(payload)
            elif msg_type == "ping":
                await self._handle_ping(ws, payload)
            else:
                self._log.warning("unknown_message_type", type=msg_type)

        except json.JSONDecodeError as e:
            self._log.error("json_decode_error", error=str(e))
        except Exception as e:
            self._log.error("handle_message_error", error=str(e), exc_info=True)

    async def _handle_user_text(self, payload: dict) -> None:
        """Handle user text input from the frontend.

        Creates a USER_TEXT event in the mailbox.
        """
        content = payload.get("content", "")
        if not content:
            return

        event = Event(
            type=EventType.USER_TEXT,
            content=content,
            max_tool_calls=self._config.default_max_tool_calls,
            metadata={"source": "websocket"},
        )
        await self._mailbox.put(event)

        # Log user message to journal for title generation
        if self._journal:
            await self._journal.log_message(role="user", content=content)

        self._log.info("user_text_received", content=content[:50])

    async def _handle_audio_blob(self, payload: dict) -> None:
        """Handle audio blob from the frontend.

        Creates an ASR_TRANSCRIPT event with audio attachment.
        """
        audio_uri = payload.get("audio_uri")
        if not audio_uri:
            return

        event = Event(
            type=EventType.ASR_TRANSCRIPT,
            content="",
            attachments=[
                Attachment(
                    mime_type=payload.get("mime_type", "audio/webm"),
                    uri=audio_uri,
                    metadata=payload.get("metadata", {}),
                )
            ],
            max_tool_calls=self._config.default_max_tool_calls,
        )
        await self._mailbox.put(event)
        self._log.info("audio_blob_received", uri=audio_uri)

    async def _handle_ping(self, ws: WebSocket, payload: dict) -> None:
        """Handle ping message from frontend.

        Responds with a pong message containing server timestamp.
        """
        now = asyncio.get_running_loop().time()
        pong_message = {
            "version": "1.0",
            "type": "pong",
            "timestamp": now,
            "payload": {
                "server_time": now,
            },
        }
        try:
            await ws.send_json(pong_message)
        except Exception as e:
            self._log.warning("pong_send_failed", error=str(e))

    async def input_loop(self, ws: WebSocket) -> None:
        """Continuous input loop for WebSocket messages.

        Similar to CLI.input_loop(), but processes WebSocket messages
        instead of stdin.

        Args:
            ws: The WebSocket connection to read from
        """
        self._log.info("websocket_input_loop_started")

        try:
            async for message in ws.iter_text():
                await self.handle_message(ws, message)
        except Exception as e:
            self._log.error("input_loop_error", error=str(e), exc_info=True)
        finally:
            self._log.info("websocket_input_loop_ended")
