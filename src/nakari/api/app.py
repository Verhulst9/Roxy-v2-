"""FastAPI application for nakari Live2D frontend.

Provides HTTP and WebSocket API endpoints for the Live2D frontend.
"""

from __future__ import annotations

import asyncio
import os
import uuid
from contextlib import asynccontextmanager
from typing import AsyncIterator, Awaitable, Callable

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import structlog

from nakari.api.routes import router
from nakari.api.websocket import WebSocketManager

_log = structlog.get_logger("api_app")


# Global WebSocket manager instance
ws_manager: WebSocketManager | None = None

# Global WebSocket input handler (set by main)
ws_input = None


def _get_allowed_origins() -> list[str]:
    """Return CORS origins from env, falling back to development defaults."""
    configured_origins = [
        origin.strip()
        for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    if configured_origins:
        return configured_origins

    if os.getenv("ENVIRONMENT", "development") == "production":
        return []

    return [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5182",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5182",
    ]


def _get_public_websocket_url() -> str:
    """Return the WebSocket URL shown by health checks."""
    configured_url = os.getenv("NAKARI_PUBLIC_WS_URL", "").strip()
    if configured_url:
        return configured_url

    host = os.getenv("NAKARI_API_HOST", "127.0.0.1")
    port = os.getenv("NAKARI_API_PORT", "8002")
    return f"ws://{host}:{port}/api/ws"


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan manager."""
    _log.info("api_starting")
    yield
    _log.info("api_shutting_down")
    if ws_manager:
        await ws_manager.close_all()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title="nakari Live2D API",
        description="API for nakari Live2D virtual avatar frontend",
        version="1.0.0",
        lifespan=lifespan,
    )

    allowed_origins = _get_allowed_origins()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Restrict to needed methods
        allow_headers=["Content-Type", "Authorization", "Accept"],  # Restrict headers
        expose_headers=["Content-Type", "Content-Length"],
        max_age=600,  # Cache preflight requests for 10 minutes
    )

    # Include routes
    app.include_router(router, prefix="/api")

    # Store ws_manager in app state for access in routes
    app.state.ws_manager = ws_manager

    @app.get("/")
    async def root() -> dict[str, str]:
        """Root endpoint."""
        return {"message": "nakari Live2D API", "status": "running"}

    @app.get("/health")
    async def health() -> dict[str, object]:
        """Health check endpoint."""
        return {
            "status": "ok",
            "version": "1.0.0",
            "uptime": asyncio.get_running_loop().time(),
            "connections": ws_manager.connection_count if ws_manager else 0,
            "websocket_url": _get_public_websocket_url(),
        }

    @app.websocket("/api/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        """WebSocket endpoint for real-time communication.

        Query parameters:
            client_id: Optional client identifier (auto-generated if not provided)
        """
        if ws_manager is None:
            await websocket.close(code=1011, reason="Server not initialized")
            return

        # Generate client ID if not provided (use UUID for uniqueness)
        client_id = websocket.query_params.get("client_id", f"client_{uuid.uuid4().hex[:12]}")

        await ws_manager.connect(client_id, websocket)

        try:
            while True:
                # Receive and process messages
                data = await websocket.receive()

                if data.get("type") == "websocket.disconnect":
                    break

                if "text" in data:
                    # Handle message through WebSocketInput adapter
                    if ws_input:
                        await ws_input.handle_message(websocket, data["text"])
                    else:
                        _log.warning("ws_input_not_configured", message=data["text"][:100])

                elif "bytes" in data:
                    # Binary data (audio chunks)
                    _log.debug("received_binary", bytes=len(data["bytes"]))

        except WebSocketDisconnect:
            _log.info("websocket_disconnected", client_id=client_id)
        except Exception as e:
            _log.error("websocket_error", client_id=client_id, error=str(e), exc_info=True)
        finally:
            ws_manager.disconnect(client_id, websocket)

    return app


def get_ws_manager(
    on_last_client_disconnect: Callable[[], Awaitable[None]] | None = None,
    on_client_connect: Callable[[], Awaitable[None]] | None = None,
) -> WebSocketManager:
    """Get the global WebSocket manager instance.

    Args:
        on_last_client_disconnect: Optional callback when last client disconnects
        on_client_connect: Optional callback when a new client connects

    Returns:
        WebSocketManager instance
    """
    global ws_manager
    if ws_manager is None:
        ws_manager = WebSocketManager(
            on_last_client_disconnect=on_last_client_disconnect,
            on_client_connect=on_client_connect,
        )
    return ws_manager
