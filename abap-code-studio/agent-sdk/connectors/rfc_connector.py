"""SAP RFC Connector via PyRFC.

Fallback connector for ECC systems when ADT is not available.
Uses SAP NetWeaver RFC SDK for direct function module calls.
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from shared.models.base import SystemConfig, SourceCode, ObjectType

logger = logging.getLogger(__name__)


class RFCConnector:
    """Connector for SAP ECC via RFC (PyRFC).

    Used as fallback when ADT services are not activated in ECC.
    Provides access to function modules, table contents, and source code reading.

    Requires: pyrfc package + SAP NetWeaver RFC SDK installed on the client machine.
    """

    def __init__(self, config: SystemConfig):
        self.config = config
        self._connection = None

    async def connect(self) -> None:
        """Establish RFC connection to SAP ECC."""
        try:
            from pyrfc import Connection
        except ImportError:
            raise RuntimeError(
                "pyrfc not installed. Install SAP NW RFC SDK and run: pip install pyrfc"
            )

        from .credential_store import get_credentials
        username, password = await get_credentials(self.config.name)

        rfc_config = self.config.rfc
        if not rfc_config:
            raise ValueError(f"No RFC config for system {self.config.name}")

        conn_params = {
            "user": username,
            "passwd": password,
            "ashost": rfc_config.ashost,
            "sysnr": rfc_config.sysnr,
            "client": self.config.client,
            "lang": "EN",
        }

        # Multi-host (message server) support
        if rfc_config.mshost:
            conn_params["mshost"] = rfc_config.mshost
            conn_params["group"] = rfc_config.group or "PUBLIC"
            del conn_params["ashost"]
            del conn_params["sysnr"]

        self._connection = Connection(**conn_params)
        logger.info(f"RFC connected to {self.config.name} ({rfc_config.ashost})")

    async def disconnect(self) -> None:
        """Close RFC connection."""
        if self._connection:
            self._connection.close()
            self._connection = None

    # ─── READ SOURCE (via RFC_READ_REPORT) ──────────────────

    async def read_report_source(self, report_name: str) -> SourceCode:
        """Read source code of an ABAP report/program via RFC.

        Uses function module: RFC_READ_REPORT
        """
        result = self._call("RFC_READ_REPORT", PROGRAM=report_name)
        lines = [line["LINE"] for line in result.get("QTAB", [])]
        source = "\n".join(lines)

        return SourceCode(
            object_name=report_name,
            object_type=ObjectType.PROG,
            source=source,
            line_count=len(lines),
        )

    async def read_function_source(self, funcname: str) -> SourceCode:
        """Read source code of a function module.

        Uses: RFC_GET_FUNCTION_INTERFACE + ENQUEUE/READ
        """
        result = self._call(
            "RFC_GET_FUNCTION_INTERFACE",
            FUNCNAME=funcname,
        )
        # The actual source code reading requires additional FM calls
        # In practice, ADT is preferred for source code reading
        return SourceCode(
            object_name=funcname,
            object_type=ObjectType.FUNC,
            source="* Source available via ADT only for function modules",
            line_count=0,
        )

    # ─── TABLE CONTENTS ─────────────────────────────────────

    async def read_table(
        self,
        table_name: str,
        fields: Optional[list[str]] = None,
        where_clause: str = "",
        max_rows: int = 100,
    ) -> list[dict[str, Any]]:
        """Read contents of a database table via RFC.

        Uses function module: RFC_READ_TABLE
        """
        options = []
        if where_clause:
            # Split long WHERE clauses into 72-char chunks (RFC limitation)
            for i in range(0, len(where_clause), 72):
                options.append({"TEXT": where_clause[i : i + 72]})

        field_list = [{"FIELDNAME": f} for f in fields] if fields else []

        result = self._call(
            "RFC_READ_TABLE",
            QUERY_TABLE=table_name,
            DELIMITER="|",
            ROWCOUNT=max_rows,
            OPTIONS=options,
            FIELDS=field_list,
        )

        # Parse results
        field_names = [f["FIELDNAME"].strip() for f in result.get("FIELDS", [])]
        rows = []
        for data_row in result.get("DATA", []):
            values = data_row["WA"].split("|")
            row = dict(zip(field_names, [v.strip() for v in values]))
            rows.append(row)

        return rows

    # ─── TABLE STRUCTURE ────────────────────────────────────

    async def get_table_structure(self, table_name: str) -> list[dict]:
        """Get the structure (field definitions) of a table.

        Uses: DDIF_FIELDINFO_GET
        """
        result = self._call(
            "DDIF_FIELDINFO_GET",
            TABNAME=table_name,
            FIELDNAME="",
            LANGU="E",
        )
        fields = []
        for field in result.get("DFIES_TAB", []):
            fields.append({
                "name": field.get("FIELDNAME", ""),
                "type": field.get("DATATYPE", ""),
                "length": field.get("LENG", 0),
                "decimals": field.get("DECIMALS", 0),
                "description": field.get("FIELDTEXT", ""),
                "key": field.get("KEYFLAG", "") == "X",
            })
        return fields

    # ─── CALL FUNCTION MODULE ───────────────────────────────

    async def call_function(self, funcname: str, **params) -> dict:
        """Call any function module via RFC.

        This is the generic entry point for BAPI calls, custom FMs, etc.
        """
        return self._call(funcname, **params)

    # ─── BAPI WRAPPER ───────────────────────────────────────

    async def call_bapi(self, bapi_name: str, commit: bool = True, **params) -> dict:
        """Call a BAPI with automatic BAPI_TRANSACTION_COMMIT.

        Standard pattern for BAPI calls:
        1. Call the BAPI
        2. Check RETURN for errors
        3. If OK: BAPI_TRANSACTION_COMMIT
        4. If error: BAPI_TRANSACTION_ROLLBACK
        """
        result = self._call(bapi_name, **params)

        # Check for errors in RETURN table/structure
        ret = result.get("RETURN", [])
        if isinstance(ret, dict):
            ret = [ret]

        errors = [r for r in ret if r.get("TYPE") in ("E", "A")]

        if errors and commit:
            self._call("BAPI_TRANSACTION_ROLLBACK")
            logger.warning(f"BAPI {bapi_name} rolled back: {errors[0].get('MESSAGE', '')}")
        elif commit:
            self._call("BAPI_TRANSACTION_COMMIT", WAIT="X")
            logger.info(f"BAPI {bapi_name} committed successfully")

        return result

    # ─── TRANSPORT ──────────────────────────────────────────

    async def get_transport_requests(self, user: str = "") -> list[dict]:
        """Get open transport requests.

        Uses: BAPI_CTREQUEST_GETLIST or custom wrapper
        """
        # Note: There's no standard BAPI for a clean transport list.
        # Many ECC systems have custom wrappers or use CTS_API_*
        try:
            result = self._call(
                "CTS_API_READ_CHANGE_REQUEST",
                IV_REQUEST="",
                IV_USER=user,
            )
            return result.get("ET_REQUESTS", [])
        except Exception:
            logger.warning("CTS_API not available, using fallback")
            return []

    # ─── INTERNAL ───────────────────────────────────────────

    def _call(self, func_name: str, **params) -> dict:
        """Execute RFC function call."""
        if not self._connection:
            raise RuntimeError("Not connected. Call connect() first.")

        logger.debug(f"RFC call: {func_name}")
        try:
            result = self._connection.call(func_name, **params)
            return result
        except Exception as e:
            logger.error(f"RFC error in {func_name}: {e}")
            raise
