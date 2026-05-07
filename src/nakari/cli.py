from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path
from typing import Any

import structlog

from nakari.config import Config
from nakari.mailbox import Mailbox
from nakari.models import Attachment, Event, EventType


class CLI:
    def __init__(self, mailbox: Mailbox, config: Config) -> None:
        self._mailbox = mailbox
        self._config = config
        self._log = structlog.get_logger("cli")

    async def input_loop(self) -> None:
        loop = asyncio.get_running_loop()
        while True:
            line = await loop.run_in_executor(None, sys.stdin.readline)
            line = line.strip()
            if not line:
                continue
            if line.lower() in ("exit", "quit"):
                self._log.info("user_requested_exit")
                raise SystemExit(0)

            if line.lower() == "/rec":
                await self._record_and_enqueue(loop)
                continue

            event = Event(
                type=EventType.USER_TEXT,
                content=line,
                max_tool_calls=self._config.default_max_tool_calls,
            )
            await self._mailbox.put(event)

    async def _record_and_enqueue(self, loop: asyncio.AbstractEventLoop) -> None:
        try:
            import sounddevice as sd
            import soundfile as sf
        except ImportError:
            print(
                "\033[31mRecording requires sounddevice and soundfile. "
                "Install with: pip install sounddevice soundfile\033[0m",
                flush=True,
            )
            return

        sample_rate = 16000
        channels = 1
        audio_dir = Path(self._config.audio_dir)
        audio_dir.mkdir(parents=True, exist_ok=True)

        print(
            "\033[33mRecording... Press Enter to stop.\033[0m",
            flush=True,
        )

        frames: list[Any] = []
        stream = sd.InputStream(
            samplerate=sample_rate,
            channels=channels,
            dtype="int16",
            callback=lambda indata, *_: frames.append(indata.copy()),
        )
        stream.start()

        # Wait for Enter in executor to avoid blocking
        await loop.run_in_executor(None, sys.stdin.readline)

        stream.stop()
        stream.close()

        if not frames:
            print("\033[31mNo audio recorded.\033[0m", flush=True)
            return

        import numpy as np

        audio_data = np.concatenate(frames, axis=0)
        filename = f"rec_{int(time.time())}_{os.getpid()}.wav"
        audio_path = audio_dir / filename
        sf.write(str(audio_path), audio_data, sample_rate)

        duration_s = len(audio_data) / sample_rate
        self._log.info(
            "audio_recorded",
            path=str(audio_path),
            duration_s=round(duration_s, 1),
        )
        print(
            f"\033[33mRecorded {duration_s:.1f}s → {audio_path}\033[0m",
            flush=True,
        )

        event = Event(
            type=EventType.ASR_TRANSCRIPT,
            content="",
            attachments=[
                Attachment(
                    mime_type="audio/wav",
                    uri=str(audio_path),
                    metadata={"sample_rate": sample_rate, "duration_s": duration_s},
                )
            ],
            max_tool_calls=self._config.default_max_tool_calls,
        )
        await self._mailbox.put(event)

    @staticmethod
    async def print_reply(message: str) -> None:
        print(f"\033[36mnakari:\033[0m {message}", flush=True)
