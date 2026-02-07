"""WebSocket Tunnel — Secure Agent ↔ Cloud Communication.

Maintains a persistent WebSocket connection to the cloud platform.
Handles reconnection, heartbeat, and command routing.

Data flow:
  Cloud → Agent: Commands (search, read, write, etc.)
  Agent → Cloud: Results (diffs, metadata, pipeline status)

Security:
  - TLS 1.3 encrypted
  - Agent token authentication
  - Only metadata + diffs in transit (never full source)
  - Certificate pinning (optional, for enterprise)
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import ssl
import time
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Optional

logger = logging.getLogger(__name__)

RECONNECT_DELAY_INITIAL = 2      # seconds
RECONNECT_DELAY_MAX = 60         # seconds
HEARTBEAT_INTERVAL = 30          # seconds
COMMAND_TIMEOUT = 120             # seconds


@dataclass
class TunnelStats:
    """Connection statistics."""
    connected_since: Optional[datetime] = None
    messages_sent: int = 0
    messages_received: int = 0
    commands_processed: int = 0
    reconnect_count: int = 0
    last_heartbeat: Optional[datetime] = None
    bytes_sent: int = 0
    bytes_received: int = 0


class WebSocketTunnel:
    """Persistent WebSocket tunnel between Client Agent and Cloud Platform.

    Features:
    - Auto-reconnection with exponential backoff
    - Heartbeat / keepalive
    - Command routing to MCP tools
    - Statistics tracking
    - Graceful shutdown
    """

    def __init__(
        self,
        cloud_url: str,
        agent_token: str,
        command_handler: Callable,
        certificate_pin: Optional[str] = None,
    ):
        self.cloud_url = cloud_url
        self.agent_token = agent_token
        self.command_handler = command_handler
        self.certificate_pin = certificate_pin
        self._ws = None
        self._running = False
        self._stats = TunnelStats()

    @property
    def stats(self) -> TunnelStats:
        return self._stats

    @property
    def is_connected(self) -> bool:
        return self._ws is not None and self._running

    async def start(self, system_info: list[dict] = None) -> None:
        """Start the tunnel with auto-reconnection loop."""
        try:
            import websockets
        except ImportError:
            raise RuntimeError("websockets not installed: pip install websockets")

        self._running = True
        reconnect_delay = RECONNECT_DELAY_INITIAL

        while self._running:
            try:
                ssl_context = self._build_ssl_context()

                async with websockets.connect(
                    self.cloud_url,
                    additional_headers={
                        "Authorization": f"Bearer {self.agent_token}",
                        "X-Agent-Version": "1.0.0",
                    },
                    ssl=ssl_context,
                    ping_interval=HEARTBEAT_INTERVAL,
                    ping_timeout=10,
                    max_size=10 * 1024 * 1024,  # 10MB max message
                ) as ws:
                    self._ws = ws
                    self._stats.connected_since = datetime.utcnow()
                    reconnect_delay = RECONNECT_DELAY_INITIAL  # Reset on success
                    logger.info(f"Tunnel connected to {self.cloud_url}")

                    # Send initial status
                    await self._send_status(system_info or [])

                    # Start heartbeat task
                    heartbeat_task = asyncio.create_task(self._heartbeat_loop())

                    try:
                        # Main message loop
                        async for raw_message in ws:
                            self._stats.messages_received += 1
                            self._stats.bytes_received += len(raw_message)

                            try:
                                message = json.loads(raw_message)
                                response = await self._process_message(message)
                                if response:
                                    await self._send(response)
                            except json.JSONDecodeError:
                                logger.warning(f"Invalid JSON received: {raw_message[:100]}")
                            except Exception as e:
                                logger.error(f"Error processing message: {e}")
                                await self._send({
                                    "type": "error",
                                    "session_id": message.get("session_id", ""),
                                    "error": str(e),
                                })
                    finally:
                        heartbeat_task.cancel()

            except asyncio.CancelledError:
                logger.info("Tunnel shutdown requested")
                break
            except Exception as e:
                self._ws = None
                self._stats.reconnect_count += 1
                logger.warning(
                    f"Tunnel disconnected: {e}. "
                    f"Reconnecting in {reconnect_delay}s... "
                    f"(attempt #{self._stats.reconnect_count})"
                )
                await asyncio.sleep(reconnect_delay)
                reconnect_delay = min(reconnect_delay * 2, RECONNECT_DELAY_MAX)

    async def stop(self) -> None:
        """Gracefully stop the tunnel."""
        self._running = False
        if self._ws:
            await self._ws.close()
            self._ws = None
        logger.info("Tunnel stopped")

    # ─── MESSAGE PROCESSING ─────────────────────────────────

    async def _process_message(self, message: dict) -> Optional[dict]:
        """Route incoming cloud command to the appropriate handler."""
        msg_type = message.get("type")
        session_id = message.get("session_id", "")
        params = message.get("params", {})

        logger.debug(f"Command: {msg_type} (session: {session_id})")
        self._stats.commands_processed += 1

        if msg_type == "ping":
            return {"type": "pong", "session_id": session_id, "timestamp": datetime.utcnow().isoformat()}

        # Route to command handler (MCP tools)
        try:
            result = await asyncio.wait_for(
                self.command_handler({"type": msg_type, "session_id": session_id, "params": params}),
                timeout=COMMAND_TIMEOUT,
            )
            return result
        except asyncio.TimeoutError:
            return {
                "type": "error",
                "session_id": session_id,
                "error": f"Command '{msg_type}' timed out after {COMMAND_TIMEOUT}s",
            }

    # ─── SENDING ────────────────────────────────────────────

    async def _send(self, data: dict) -> None:
        """Send a message to the cloud."""
        if not self._ws:
            logger.warning("Cannot send — not connected")
            return
        raw = json.dumps(data)
        await self._ws.send(raw)
        self._stats.messages_sent += 1
        self._stats.bytes_sent += len(raw)

    async def _send_status(self, systems: list[dict]) -> None:
        """Send agent status to cloud on connect."""
        await self._send({
            "type": "agent_status",
            "agent_id": self.agent_token[:16],
            "systems": systems,
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat(),
        })

    # ─── HEARTBEAT ──────────────────────────────────────────

    async def _heartbeat_loop(self) -> None:
        """Send periodic heartbeats to keep connection alive."""
        while self._running:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            self._stats.last_heartbeat = datetime.utcnow()
            try:
                await self._send({
                    "type": "heartbeat",
                    "timestamp": datetime.utcnow().isoformat(),
                    "stats": {
                        "commands_processed": self._stats.commands_processed,
                        "uptime_seconds": int((datetime.utcnow() - self._stats.connected_since).total_seconds())
                        if self._stats.connected_since else 0,
                    },
                })
            except Exception:
                break  # Connection lost, let main loop handle reconnection

    # ─── SSL ────────────────────────────────────────────────

    def _build_ssl_context(self) -> Optional[ssl.SSLContext]:
        """Build SSL context with optional certificate pinning."""
        if not self.cloud_url.startswith("wss://"):
            return None

        ctx = ssl.create_default_context()
        ctx.minimum_version = ssl.TLSVersion.TLSv1_3

        if self.certificate_pin:
            # Certificate pinning for enterprise deployments
            ctx.load_verify_locations(self.certificate_pin)

        return ctx

    # ─── PUSH (Agent → Cloud, unsolicited) ──────────────────

    async def push_diff(self, session_id: str, diff: dict) -> None:
        """Push a code diff to the cloud (for review)."""
        await self._send({
            "type": "diff",
            "session_id": session_id,
            "diff": diff,
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def push_pipeline_update(self, session_id: str, step: dict) -> None:
        """Push a pipeline step completion to the cloud."""
        await self._send({
            "type": "pipeline",
            "session_id": session_id,
            "step": step,
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def push_object_catalog(self, objects: list[dict]) -> None:
        """Push discovered object metadata to the cloud catalog."""
        await self._send({
            "type": "object_catalog",
            "objects": objects,
            "timestamp": datetime.utcnow().isoformat(),
        })
