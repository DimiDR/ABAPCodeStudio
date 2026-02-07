"""ABAP Code Studio — Client Agent.

Main entry point for the client-side agent that runs in the customer's network.

Responsibilities:
  1. Load system configurations from local YAML
  2. Connect to SAP systems (ADT + RFC)
  3. Start local MCP server (for Claude Code / VS Code / Cline)
  4. Start WebSocket tunnel to cloud platform (for Web UI)
  5. Handle commands from cloud, execute locally, return results

Usage:
  # Docker
  docker run -d -e CLOUD_URL=wss://api.abap-studio.de -e AGENT_TOKEN=xxx abap-studio/agent

  # Python
  abap-studio-agent start --config /opt/agent/config/systems.yaml
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

import yaml

from shared.models.base import (
    AuthMethod, ConnectionMethod, RFCConfig, SystemConfig, SystemType,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("abap-studio-agent")


def load_config(config_path: str = None) -> list[SystemConfig]:
    """Load system configurations from YAML file.

    Example systems.yaml:
    ```yaml
    systems:
      ecc_production:
        type: ecc
        url: https://ecc-prod.company.com:8443
        client: "100"
        auth_method: basic
        connection_primary: adt
        connection_fallback: rfc
        adt_activated: true
        abapgit_installed: true
        rfc:
          sysnr: "00"
          ashost: 10.0.1.50

      btp_dev:
        type: btp_abap_cloud
        url: https://dev.abap.eu10.hana.ondemand.com
        auth_method: jwt_xsuaa
        xsuaa_url: https://dev.authentication.eu10.hana.ondemand.com
        principal_propagation: true
        ai_sdk_available: true
    ```
    """
    if not config_path:
        config_path = os.getenv(
            "AGENT_CONFIG",
            str(Path.home() / ".abap-studio" / "systems.yaml"),
        )

    path = Path(config_path)
    if not path.exists():
        logger.error(f"Config not found: {path}")
        logger.info("Run 'abap-studio-agent init' to create a config template")
        sys.exit(1)

    with open(path) as f:
        raw = yaml.safe_load(f)

    configs = []
    for name, data in raw.get("systems", {}).items():
        rfc_data = data.pop("rfc", None)
        rfc = RFCConfig(**rfc_data) if rfc_data else None

        configs.append(SystemConfig(
            name=name,
            type=SystemType(data["type"]),
            url=data["url"],
            client=data.get("client", "100"),
            auth_method=AuthMethod(data["auth_method"]),
            connection_primary=ConnectionMethod(data.get("connection_primary", "adt")),
            connection_fallback=ConnectionMethod(data["connection_fallback"]) if data.get("connection_fallback") else None,
            rfc=rfc,
            principal_propagation=data.get("principal_propagation", False),
            xsuaa_url=data.get("xsuaa_url"),
            adt_activated=data.get("adt_activated", True),
            abapgit_installed=data.get("abapgit_installed", False),
            gcts_enabled=data.get("gcts_enabled", False),
            ai_sdk_available=data.get("ai_sdk_available", False),
            min_basis_version=data.get("min_basis_version"),
        ))
        logger.info(f"Loaded config: {name} ({data['type']})")

    return configs


async def start_mcp_server():
    """Start the local MCP server for direct IDE integration."""
    from tools.mcp_server import mcp, initialize_systems

    configs = load_config()
    await initialize_systems(configs)

    logger.info(f"MCP server starting with {len(configs)} system(s)")
    # mcp.run() handles stdio transport for Claude Code / Cline
    mcp.run()


async def start_tunnel():
    """Start WebSocket tunnel to cloud platform.

    The tunnel:
    - Connects to the cloud via secure WebSocket (TLS 1.3)
    - Receives commands (search, read, write, etc.)
    - Executes them locally via MCP tools
    - Returns only diffs/metadata to the cloud (never full source)
    """
    cloud_url = os.getenv("CLOUD_URL", "wss://api.abap-studio.de/agent/ws")
    agent_token = os.getenv("AGENT_TOKEN")

    if not agent_token:
        logger.error("AGENT_TOKEN not set. Get one from the Cloud UI.")
        return

    logger.info(f"Connecting tunnel to {cloud_url}")

    try:
        import websockets
    except ImportError:
        logger.error("websockets not installed: pip install websockets")
        return

    # Reconnection loop
    while True:
        try:
            async with websockets.connect(
                cloud_url,
                additional_headers={"Authorization": f"Bearer {agent_token}"},
                ping_interval=30,
                ping_timeout=10,
            ) as ws:
                logger.info("Tunnel connected to cloud")

                # Send agent status
                import json
                await ws.send(json.dumps({
                    "type": "agent_status",
                    "systems": [
                        {"name": name, "type": sys["config"].type.value, "connected": True}
                        for name, sys in _get_systems().items()
                    ],
                }))

                # Listen for commands
                async for message in ws:
                    data = json.loads(message)
                    response = await _handle_cloud_command(data)
                    await ws.send(json.dumps(response))

        except Exception as e:
            logger.warning(f"Tunnel disconnected: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)


def _get_systems():
    """Get connected systems from MCP server module."""
    from tools.mcp_server import _systems
    return _systems


async def _handle_cloud_command(command: dict) -> dict:
    """Handle a command from the cloud platform.

    Commands are executed locally — only results/diffs go back to the cloud.
    """
    from tools import mcp_server

    cmd_type = command.get("type")
    params = command.get("params", {})
    session_id = command.get("session_id", "")

    try:
        if cmd_type == "search":
            result = await mcp_server.sap_search(**params)
        elif cmd_type == "read":
            result = await mcp_server.sap_read(**params)
        elif cmd_type == "write":
            result = await mcp_server.sap_write(**params)
        elif cmd_type == "activate":
            result = await mcp_server.sap_activate(**params)
        elif cmd_type == "syntax_check":
            result = await mcp_server.sap_syntax_check(**params)
        elif cmd_type == "atc":
            result = await mcp_server.sap_atc(**params)
        elif cmd_type == "ping":
            result = "pong"
        else:
            result = f"Unknown command: {cmd_type}"

        return {"type": "result", "session_id": session_id, "data": result}
    except Exception as e:
        return {"type": "error", "session_id": session_id, "error": str(e)}


# ─── CLI Entry Points ──────────────────────────────────────

def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="ABAP Code Studio Agent")
    sub = parser.add_subparsers(dest="command")

    # start command
    start_cmd = sub.add_parser("start", help="Start the agent")
    start_cmd.add_argument("--config", help="Path to systems.yaml")
    start_cmd.add_argument("--mode", choices=["mcp", "tunnel", "both"], default="both",
                           help="Run mode: mcp (local only), tunnel (cloud only), both")

    # init command
    init_cmd = sub.add_parser("init", help="Initialize agent configuration")
    init_cmd.add_argument("--token", help="Agent token from cloud UI")

    # test command
    test_cmd = sub.add_parser("test", help="Test system connections")
    test_cmd.add_argument("--system", help="Test specific system")

    args = parser.parse_args()

    if args.command == "start":
        if args.mode == "mcp":
            asyncio.run(start_mcp_server())
        elif args.mode == "tunnel":
            asyncio.run(start_tunnel())
        else:
            # Run both MCP server and tunnel
            asyncio.run(start_mcp_server())

    elif args.command == "init":
        _init_config(args.token)

    elif args.command == "test":
        asyncio.run(_test_connections(args.system))

    else:
        parser.print_help()


def _init_config(token: str = None):
    """Create initial configuration template."""
    config_dir = Path.home() / ".abap-studio"
    config_dir.mkdir(exist_ok=True)

    template = """# ABAP Code Studio — Agent Configuration
# Docs: https://docs.abap-studio.de/agent-setup

agent:
  token: "{token}"
  cloud_url: wss://api.abap-studio.de/agent/ws

systems:
  # Example ECC system (uncomment and configure):
  # ecc_prod:
  #   type: ecc
  #   url: https://ecc-prod.company.com:8443
  #   client: "100"
  #   auth_method: basic
  #   connection_primary: adt
  #   connection_fallback: rfc
  #   adt_activated: true
  #   rfc:
  #     sysnr: "00"
  #     ashost: 10.0.1.50

  # Example BTP system (uncomment and configure):
  # btp_dev:
  #   type: btp_abap_cloud
  #   url: https://dev.abap.eu10.hana.ondemand.com
  #   auth_method: jwt_xsuaa
  #   xsuaa_url: https://dev.authentication.eu10.hana.ondemand.com
  #   principal_propagation: true
""".format(token=token or "<your-agent-token>")

    config_file = config_dir / "systems.yaml"
    config_file.write_text(template)
    logger.info(f"Config created: {config_file}")
    logger.info("Edit the file to add your SAP systems, then run: abap-studio-agent start")


async def _test_connections(system_name: str = None):
    """Test connections to configured systems."""
    configs = load_config()
    for config in configs:
        if system_name and config.name != system_name:
            continue

        logger.info(f"Testing {config.name} ({config.type.value})...")

        from connectors.adt_connector import ADTConnector
        if config.adt_activated:
            try:
                adt = ADTConnector(config)
                await adt.connect()
                objects = await adt.search_objects("Z*", 5)
                logger.info(f"  ADT: ✓ Connected — found {len(objects)} objects")
                await adt.disconnect()
            except Exception as e:
                logger.error(f"  ADT: ✗ {e}")

        if config.type == SystemType.ECC and config.rfc:
            from connectors.rfc_connector import RFCConnector
            try:
                rfc = RFCConnector(config)
                await rfc.connect()
                logger.info("  RFC: ✓ Connected")
                await rfc.disconnect()
            except Exception as e:
                logger.error(f"  RFC: ✗ {e}")


if __name__ == "__main__":
    main()
