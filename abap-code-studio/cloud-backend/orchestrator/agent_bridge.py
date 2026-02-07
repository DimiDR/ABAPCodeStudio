"""Agent Bridge — Cloud-side interface for communicating with Client Agents.

Sends commands to the Client Agent via WebSocket and awaits responses.
Implements request-response pattern over the persistent WebSocket connection.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# Timeout for agent commands
COMMAND_TIMEOUT = 60  # seconds


class AgentBridge:
    """Interface for sending commands to a specific Client Agent.

    Usage:
        bridge = AgentBridge(websocket, agent_id)
        result = await bridge.send_command("search", {"query": "Z_SALES*"})
    """

    def __init__(self, ws: WebSocket, agent_id: str):
        self.ws = ws
        self.agent_id = agent_id
        self._pending: dict[str, asyncio.Future] = {}

    async def send_command(self, command_type: str, params: dict) -> Optional[str]:
        """Send a command to the agent and wait for the response.

        Args:
            command_type: "search", "read", "write", "activate", "syntax_check",
                         "atc", "transport_info", "table_structure", "table_read",
                         "systems", "ai_generate"
            params: Command-specific parameters

        Returns:
            Result string from the agent, or None on timeout/error.
        """
        session_id = str(uuid.uuid4())
        future: asyncio.Future = asyncio.get_event_loop().create_future()
        self._pending[session_id] = future

        try:
            # Send command to agent
            await self.ws.send_json({
                "type": command_type,
                "session_id": session_id,
                "params": params,
                "timestamp": datetime.utcnow().isoformat(),
            })

            # Wait for response with timeout
            result = await asyncio.wait_for(future, timeout=COMMAND_TIMEOUT)
            return result

        except asyncio.TimeoutError:
            logger.warning(f"Agent {self.agent_id} command timed out: {command_type}")
            return None
        except Exception as e:
            logger.error(f"Agent {self.agent_id} command failed: {e}")
            return None
        finally:
            self._pending.pop(session_id, None)

    def resolve_response(self, session_id: str, data: str) -> bool:
        """Resolve a pending command with the agent's response.

        Called by the WebSocket handler when the agent sends back a result.
        """
        future = self._pending.get(session_id)
        if future and not future.done():
            future.set_result(data)
            return True
        return False

    @property
    def pending_count(self) -> int:
        return len(self._pending)


class AgentPool:
    """Manages all connected Client Agents.

    Maps agent_id → AgentBridge for routing commands to the right agent.
    """

    def __init__(self):
        self._agents: dict[str, AgentBridge] = {}
        self._system_map: dict[str, str] = {}  # system_name → agent_id

    def register(self, agent_id: str, ws: WebSocket) -> AgentBridge:
        """Register a new agent connection."""
        bridge = AgentBridge(ws, agent_id)
        self._agents[agent_id] = bridge
        logger.info(f"Agent registered: {agent_id} (total: {len(self._agents)})")
        return bridge

    def unregister(self, agent_id: str) -> None:
        """Remove a disconnected agent."""
        self._agents.pop(agent_id, None)
        # Clean up system map
        self._system_map = {k: v for k, v in self._system_map.items() if v != agent_id}
        logger.info(f"Agent unregistered: {agent_id} (total: {len(self._agents)})")

    def map_system(self, system_name: str, agent_id: str) -> None:
        """Map a system name to an agent."""
        self._system_map[system_name] = agent_id

    def get_by_agent_id(self, agent_id: str) -> Optional[AgentBridge]:
        """Get bridge by agent ID."""
        return self._agents.get(agent_id)

    def get_by_system(self, system_name: str) -> Optional[AgentBridge]:
        """Get bridge by system name."""
        agent_id = self._system_map.get(system_name)
        if agent_id:
            return self._agents.get(agent_id)
        return None

    def get_any(self) -> Optional[AgentBridge]:
        """Get any connected agent (for system discovery)."""
        if self._agents:
            return next(iter(self._agents.values()))
        return None

    @property
    def connected_count(self) -> int:
        return len(self._agents)

    @property
    def connected_agents(self) -> list[str]:
        return list(self._agents.keys())


# Global agent pool instance
agent_pool = AgentPool()
