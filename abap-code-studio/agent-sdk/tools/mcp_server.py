"""ABAP Code Studio — Local MCP Server.

This MCP server runs on the CLIENT AGENT in the customer's network.
It exposes SAP operations as MCP tools that can be called by AI agents.

Tools:
  - sap_search: Search for ABAP objects across connected systems
  - sap_read: Read source code of an ABAP object
  - sap_write: Write/modify source code (with lock/unlock)
  - sap_activate: Activate an ABAP object
  - sap_syntax_check: Run syntax check on source code
  - sap_atc: Run ATC (ABAP Test Cockpit) checks
  - sap_transport: Get transport info / create transport
  - sap_table_read: Read table contents (ECC only, via RFC)
  - sap_table_structure: Get table field definitions
  - git_commit: Commit changes to git with AI metadata
  - git_push: Push to remote + create PR
"""
from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Optional

from mcp.server.fastmcp import FastMCP

from connectors.adt_connector import ADTConnector
from connectors.rfc_connector import RFCConnector
from shared.models.base import (
    AIModel, CodeDiff, CommitMetadata, ObjectType, ReviewStatus, SystemConfig, SystemType,
)

logger = logging.getLogger(__name__)

# Initialize FastMCP server
mcp = FastMCP(
    "ABAP Code Studio Agent",
    description="Local MCP server for SAP ABAP development — connects to ECC and BTP systems",
)

# System connections (populated on startup)
_systems: dict[str, dict] = {}  # name → {"config": SystemConfig, "adt": ADTConnector, "rfc": RFCConnector}


# ═══════════════════════════════════════════════════════════════
# LIFECYCLE
# ═══════════════════════════════════════════════════════════════

async def initialize_systems(configs: list[SystemConfig]) -> None:
    """Connect to all configured SAP systems on agent startup."""
    for config in configs:
        entry = {"config": config, "adt": None, "rfc": None}

        # ADT connection (primary for both ECC and BTP)
        if config.adt_activated:
            adt = ADTConnector(config)
            try:
                await adt.connect()
                entry["adt"] = adt
                logger.info(f"ADT connected: {config.name}")
            except Exception as e:
                logger.warning(f"ADT failed for {config.name}: {e}")

        # RFC connection (fallback for ECC only)
        if config.type == SystemType.ECC and config.rfc:
            rfc = RFCConnector(config)
            try:
                await rfc.connect()
                entry["rfc"] = rfc
                logger.info(f"RFC connected: {config.name}")
            except Exception as e:
                logger.warning(f"RFC failed for {config.name}: {e}")

        _systems[config.name] = entry


def _get_connector(system_name: str) -> tuple[Optional[ADTConnector], Optional[RFCConnector]]:
    """Get the best available connector for a system."""
    sys = _systems.get(system_name)
    if not sys:
        raise ValueError(f"System '{system_name}' not configured. Available: {list(_systems.keys())}")
    return sys.get("adt"), sys.get("rfc")


def _resolve_system(system_name: Optional[str] = None) -> str:
    """Resolve system name — if not specified, use the first available."""
    if system_name:
        return system_name
    if _systems:
        return next(iter(_systems))
    raise ValueError("No SAP systems connected")


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — SEARCH
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def sap_search(
    query: str,
    system: Optional[str] = None,
    max_results: int = 25,
) -> str:
    """Search for ABAP objects in the SAP system repository.

    Searches across reports, classes, function modules, CDS views, tables, etc.

    Args:
        query: Search term (e.g. "Z_SALES", "ZCL_*", "BAPI_SALESORDER*")
        system: Target system name. If not specified, searches all connected systems.
        max_results: Maximum number of results (default 25)
    """
    results = []

    systems_to_search = [system] if system else list(_systems.keys())

    for sys_name in systems_to_search:
        adt, rfc = _get_connector(sys_name)
        if adt:
            objects = await adt.search_objects(query, max_results)
            for obj in objects:
                results.append({
                    "name": obj.name,
                    "type": obj.type.value,
                    "package": obj.package,
                    "description": obj.description,
                    "system": sys_name,
                    "system_type": obj.system_type.value,
                    "uri": obj.uri,
                })

    if not results:
        return f"No objects found matching '{query}'"

    return json.dumps(results, indent=2)


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — READ
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def sap_read(
    object_name: str,
    object_type: str,
    system: Optional[str] = None,
) -> str:
    """Read the source code of an ABAP object.

    Supports: PROG, CLAS, INTF, FUGR, DDLS, BDEF, SRVD, DCLS, TABL, DTEL

    Args:
        object_name: Name of the ABAP object (e.g. "ZCL_SALES_ORDER")
        object_type: Type code (e.g. "CLAS", "DDLS", "PROG", "TABL")
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, rfc = _get_connector(sys_name)
    otype = ObjectType(object_type.upper())

    if adt:
        source = await adt.read_source(object_name, otype)
        return f"=== {object_name} ({object_type}) from {sys_name} ===\n" \
               f"Lines: {source.line_count}\n" \
               f"ETag: {source.etag}\n\n" \
               f"{source.source}"

    elif rfc and otype == ObjectType.PROG:
        source = await rfc.read_report_source(object_name)
        return f"=== {object_name} (PROG via RFC) from {sys_name} ===\n" \
               f"Lines: {source.line_count}\n\n" \
               f"{source.source}"

    raise ValueError(f"Cannot read {object_type} from {sys_name} — no suitable connector")


@mcp.tool()
async def sap_table_structure(
    table_name: str,
    system: Optional[str] = None,
) -> str:
    """Get the field definitions of a database table.

    Args:
        table_name: Name of the table (e.g. "ZSALES_DATA", "VBAK")
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, rfc = _get_connector(sys_name)

    if rfc:
        fields = await rfc.get_table_structure(table_name)
        return json.dumps(fields, indent=2)
    elif adt:
        source = await adt.read_source(table_name, ObjectType.TABL)
        return source.source

    raise ValueError(f"Cannot read table structure from {sys_name}")


@mcp.tool()
async def sap_table_read(
    table_name: str,
    fields: Optional[list[str]] = None,
    where: str = "",
    max_rows: int = 100,
    system: Optional[str] = None,
) -> str:
    """Read contents of a database table (ECC only, via RFC).

    Args:
        table_name: Name of the table (e.g. "ZSALES_DATA")
        fields: List of field names to read (default: all)
        where: WHERE clause (e.g. "SALES_ORDER = '100001'")
        max_rows: Maximum rows to return
        system: Target system name
    """
    sys_name = _resolve_system(system)
    _, rfc = _get_connector(sys_name)

    if not rfc:
        return f"Table read via RFC not available for {sys_name}. " \
               "RFC is only supported for ECC systems."

    rows = await rfc.read_table(table_name, fields, where, max_rows)
    return json.dumps(rows, indent=2)


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — WRITE
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def sap_write(
    object_name: str,
    object_type: str,
    source: str,
    transport: Optional[str] = None,
    system: Optional[str] = None,
) -> str:
    """Write/modify the source code of an ABAP object.

    Workflow: Lock → Write → Unlock
    The object is NOT automatically activated — use sap_activate afterwards.

    Args:
        object_name: Name of the ABAP object
        object_type: Type code (PROG, CLAS, DDLS, BDEF, etc.)
        source: The complete new source code
        transport: Transport request number (e.g. "DEVK900123")
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, _ = _get_connector(sys_name)

    if not adt:
        return f"Write requires ADT — not available for {sys_name}"

    otype = ObjectType(object_type.upper())

    # Lock → Write → Unlock
    lock_handle = await adt.lock_object(object_name, otype)
    try:
        await adt.write_source(object_name, otype, source, lock_handle, transport)
        return f"✓ Source written: {object_name} ({object_type}) on {sys_name}" \
               + (f"\n  Transport: {transport}" if transport else "")
    finally:
        await adt.unlock_object(object_name, otype, lock_handle)


@mcp.tool()
async def sap_activate(
    object_name: str,
    object_type: str,
    system: Optional[str] = None,
) -> str:
    """Activate an ABAP object after writing source code.

    Args:
        object_name: Name of the ABAP object
        object_type: Type code
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, _ = _get_connector(sys_name)

    if not adt:
        return f"Activation requires ADT — not available for {sys_name}"

    otype = ObjectType(object_type.upper())
    result = await adt.activate(object_name, otype)
    return f"✓ Activated: {object_name} ({object_type}) on {sys_name}"


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — QUALITY CHECKS
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def sap_syntax_check(
    source: str,
    object_uri: str,
    system: Optional[str] = None,
) -> str:
    """Run syntax check on ABAP source code.

    Args:
        source: The ABAP source code to check
        object_uri: ADT URI of the object (from sap_search result)
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, _ = _get_connector(sys_name)

    if not adt:
        return "Syntax check requires ADT"

    issues = await adt.syntax_check(source, object_uri)
    if not issues:
        return "✓ Syntax check passed — no errors"

    lines = [f"Syntax check: {len(issues)} issue(s) found:"]
    for issue in issues:
        lines.append(f"  [{issue['severity']}] Line {issue['line']}: {issue['message']}")
    return "\n".join(lines)


@mcp.tool()
async def sap_atc(
    object_name: str,
    object_type: str,
    system: Optional[str] = None,
) -> str:
    """Run ATC (ABAP Test Cockpit) checks on an object.

    Args:
        object_name: Name of the ABAP object
        object_type: Type code
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, _ = _get_connector(sys_name)

    if not adt:
        return "ATC requires ADT"

    otype = ObjectType(object_type.upper())
    result = await adt.run_atc(object_name, otype)
    return f"ATC run started: {result.get('run_id', 'unknown')}\nPoll for results..."


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — TRANSPORT
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def sap_transport_info(
    object_uri: str,
    system: Optional[str] = None,
) -> str:
    """Get transport information for an ABAP object.

    Args:
        object_uri: ADT URI of the object
        system: Target system name
    """
    sys_name = _resolve_system(system)
    adt, _ = _get_connector(sys_name)

    if not adt:
        return "Transport info requires ADT"

    info = await adt.get_transport_info(object_uri)
    return json.dumps(info, indent=2)


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — GIT
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def git_commit(
    message: str,
    files: list[str],
    ai_model: str = "claude-opus-4-6",
    confidence: float = 0.0,
    prompt: str = "",
    transport: str = "",
    mcp_tools_used: Optional[list[str]] = None,
) -> str:
    """Commit changes to git with AI metadata in the commit message.

    Args:
        message: Commit message (conventional commits format)
        files: List of file paths to commit
        ai_model: AI model used for code generation
        confidence: AI confidence score (0-1)
        prompt: The original user prompt
        transport: SAP transport request number
        mcp_tools_used: List of MCP tools used during generation
    """
    import subprocess

    # Build extended commit message with AI metadata
    tools_str = ", ".join(mcp_tools_used or [])
    extended_message = f"""{message}

[AI-GENERATED]
Model:      {ai_model}
Prompt:     "{prompt}"
Confidence: {confidence:.2f}
MCP-Tools:  {tools_str}
Transport:  {transport}
Review:     PENDING
Timestamp:  {datetime.utcnow().isoformat()}Z
"""

    # Stage and commit
    for f in files:
        subprocess.run(["git", "add", f], check=True)

    result = subprocess.run(
        ["git", "commit", "-m", extended_message],
        capture_output=True, text=True,
    )

    if result.returncode == 0:
        # Get SHA
        sha = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True,
        ).stdout.strip()
        return f"✓ Committed: {sha} — {message}"
    else:
        return f"✗ Commit failed: {result.stderr}"


@mcp.tool()
async def git_push(
    branch: str = "",
    create_pr: bool = True,
    pr_title: str = "",
) -> str:
    """Push current branch to remote and optionally create a pull request.

    Args:
        branch: Branch name (default: current branch)
        create_pr: Whether to create a pull request
        pr_title: PR title (default: last commit message)
    """
    import subprocess

    if not branch:
        branch = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True,
        ).stdout.strip()

    # Push
    result = subprocess.run(
        ["git", "push", "-u", "origin", branch],
        capture_output=True, text=True,
    )

    output = f"Pushed to origin/{branch}\n"

    if create_pr:
        output += "PR creation: Would use GitHub/GitLab API here\n"
        output += f"PR Title: {pr_title or 'AI-generated changes'}\n"
        output += "Note: PR requires human review before merge"

    return output


# ═══════════════════════════════════════════════════════════════
# MCP TOOLS — SYSTEM INFO
# ═══════════════════════════════════════════════════════════════

@mcp.tool()
async def sap_systems() -> str:
    """List all connected SAP systems and their status.

    Returns system names, types, connection methods, and available features.
    """
    info = []
    for name, sys in _systems.items():
        config = sys["config"]
        info.append({
            "name": name,
            "type": config.type.value,
            "auth": config.auth_method.value,
            "connection": config.connection_primary.value,
            "adt_connected": sys.get("adt") is not None,
            "rfc_connected": sys.get("rfc") is not None,
            "features": {
                "abapgit": config.abapgit_installed,
                "gcts": config.gcts_enabled,
                "ai_sdk": config.ai_sdk_available,
                "principal_propagation": config.principal_propagation,
            },
        })
    return json.dumps(info, indent=2)


# ═══════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    mcp.run()
