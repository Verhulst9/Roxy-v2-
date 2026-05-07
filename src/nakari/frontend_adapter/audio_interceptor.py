"""Audio stream interceptor and broadcaster for Live2D lip-sync.

This module provides non-invasive interception of TTS audio streams,
broadcasting audio chunks to the frontend for lip-sync processing.
"""

from __future__ import annotations

import asyncio
import base64
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

import structlog

if TYPE_CHECKING:
    from fastapi import WebSocket

_log = structlog.get_logger("audio_interceptor")


class AudioBroadcaster:
    """Audio stream broadcaster for WebSocket clients.

    Receives audio chunks and broadcasts them to all connected
    WebSocket clients for lip-sync processing.
    """

    def __init__(self, ws_manager, chunk_size: int = 4096) -> None:
        self._ws_manager = ws_manager
        self._chunk_size = chunk_size
        self._current_sequence = 0
        self._log = structlog.get_logger("audio_broadcaster")

    async def broadcast(self, audio_data: bytes, format: str = "mp3") -> None:
        """Broadcast audio data to all connected WebSocket clients.

        Args:
            audio_data: Raw audio data bytes
            format: Audio format (mp3, wav, etc.)
        """
        # Split into chunks
        chunks = [
            audio_data[i : i + self._chunk_size]
            for i in range(0, len(audio_data), self._chunk_size)
        ]

        chunk_count = len(chunks)
        for i, chunk in enumerate(chunks):
            message = {
                "version": "1.0",
                "type": "audio_chunk",
                "timestamp": asyncio.get_running_loop().time(),
                "payload": {
                    "chunk_id": f"{self._current_sequence}_{i}",
                    "sequence": self._current_sequence,
                    "data": base64.b64encode(chunk).decode("utf-8"),
                    "format": format,
                    "sample_rate": 24000,
                    "channels": 1,
                    "is_final": (i == chunk_count - 1),
                },
            }
            await self._ws_manager.broadcast(message)

        self._current_sequence += 1
        self._log.debug(
            "audio_broadcasted",
            sequence=self._current_sequence - 1,
            chunks=chunk_count,
            bytes=len(audio_data),
        )

    def reset_sequence(self) -> None:
        """Reset the audio sequence counter."""
        self._current_sequence = 0


class AudioStreamInterceptor:
    """Non-invasive TTS audio stream interceptor.

    Wraps an existing TTSBackend to intercept audio chunks while
    preserving the original functionality. Audio is both yielded
    to the original consumer and broadcast to WebSocket clients.
    """

    def __init__(self, original_backend, broadcaster: AudioBroadcaster) -> None:
        """Initialize the interceptor.

        Args:
            original_backend: The original TTSBackend to wrap
            broadcaster: The AudioBroadcaster to send chunks to
        """
        self._original = original_backend
        self._broadcaster = broadcaster
        self._log = structlog.get_logger("audio_interceptor")

    async def synthesize_stream(self, text: str) -> AsyncIterator[bytes]:
        """Synthesize speech and broadcast audio chunks.

        Yields audio chunks to the original consumer (TTSPlayer)
        while simultaneously broadcasting them to WebSocket clients.

        Args:
            text: The text to synthesize

        Yields:
            Audio data chunks as bytes
        """
        self._log.info("synthesis_started", text_length=len(text))

        try:
            # Get the original stream
            async for chunk in self._original.synthesize_stream(text):
                # Original flow: yield chunk to TTSPlayer (mpv playback)
                yield chunk
                # Additional: broadcast to WebSocket clients
                await self._broadcaster.broadcast(chunk)

            self._log.info("synthesis_completed")

        except Exception as e:
            self._log.error("synthesis_error", error=str(e), exc_info=True)
            raise


def wrap_tts_backend(backend, broadcaster: AudioBroadcaster):
    """Wrap a TTS backend with audio broadcasting capability.

    Args:
        backend: The original TTSBackend instance
        broadcaster: An AudioBroadcaster instance

    Returns:
        An AudioStreamInterceptor wrapping the original backend
    """
    return AudioStreamInterceptor(backend, broadcaster)
