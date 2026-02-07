"""SAP ADT REST API Connector.

Handles all HTTP communication with SAP systems via ADT (ABAP Development Tools) APIs.
Supports both ECC (Basic Auth) and BTP ABAP Cloud (JWT/XSUAA).
"""
from __future__ import annotations

import base64
import logging
from typing import Optional
from xml.etree import ElementTree as ET

import httpx

from shared.models.base import (
    ABAPObject, AuthMethod, ObjectStatus, ObjectType, SourceCode, SystemConfig,
)

logger = logging.getLogger(__name__)

# ADT XML namespaces
NS = {
    "adtcore": "http://www.sap.com/adt/core",
    "search": "http://www.sap.com/adt/repository/search",
    "atom": "http://www.w3.org/2005/Atom",
}

# ADT endpoints
ENDPOINTS = {
    "search": "/sap/bc/adt/repository/informationsystem/search",
    "programs": "/sap/bc/adt/programs/programs",
    "classes": "/sap/bc/adt/oo/classes",
    "interfaces": "/sap/bc/adt/oo/interfaces",
    "function_groups": "/sap/bc/adt/functions/groups",
    "tables": "/sap/bc/adt/ddic/tables",
    "data_elements": "/sap/bc/adt/ddic/dataelements",
    "domains": "/sap/bc/adt/ddic/domains",
    "structures": "/sap/bc/adt/ddic/structures",
    "cds_views": "/sap/bc/adt/ddic/ddl/sources",
    "behavior_defs": "/sap/bc/adt/bo/behaviordefinitions",
    "service_defs": "/sap/bc/adt/businessservices/servicedefinitions",
    "service_bindings": "/sap/bc/adt/businessservices/servicebindings",
    "access_controls": "/sap/bc/adt/acm/dcl/sources",
    "activation": "/sap/bc/adt/activation",
    "atc_checks": "/sap/bc/adt/atc/runs",
    "discovery": "/sap/bc/adt/discovery",
}

# Map ObjectType to ADT endpoint + source suffix
OBJECT_TYPE_MAP = {
    ObjectType.PROG: ("programs", "/{name}/source/main"),
    ObjectType.CLAS: ("classes", "/{name}/source/main"),
    ObjectType.INTF: ("interfaces", "/{name}/source/main"),
    ObjectType.FUGR: ("function_groups", "/{name}/source/main"),
    ObjectType.DDLS: ("cds_views", "/{name}/source/main"),
    ObjectType.BDEF: ("behavior_defs", "/{name}/source/main"),
    ObjectType.SRVD: ("service_defs", "/{name}/source/main"),
    ObjectType.SRVB: ("service_bindings", "/{name}"),
    ObjectType.TABL: ("tables", "/{name}"),
    ObjectType.DTEL: ("data_elements", "/{name}"),
    ObjectType.DOMA: ("domains", "/{name}"),
    ObjectType.DCLS: ("access_controls", "/{name}/source/main"),
}


class ADTConnector:
    """Connector for SAP ADT REST APIs.

    Works with both ECC (Basic Auth) and BTP ABAP Cloud (JWT Bearer).
    All operations run locally on the client agent — no data leaves the network.
    """

    def __init__(self, config: SystemConfig):
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None
        self._csrf_token: Optional[str] = None

    async def connect(self) -> None:
        """Initialize HTTP client with appropriate auth."""
        headers = {
            "Accept": "application/xml",
            "Content-Type": "application/xml",
            "X-CSRF-Token": "Fetch",
        }

        if self.config.auth_method == AuthMethod.BASIC:
            # ECC: Basic Auth — credentials from local vault/env
            from .credential_store import get_credentials
            username, password = await get_credentials(self.config.name)
            auth = httpx.BasicAuth(username, password)
            self._client = httpx.AsyncClient(
                base_url=self.config.url,
                auth=auth,
                headers=headers,
                verify=True,
                timeout=httpx.Timeout(45.0, connect=10.0),
                params={"sap-client": self.config.client},
            )
        elif self.config.auth_method in (AuthMethod.JWT_XSUAA, AuthMethod.SERVICE_KEY):
            # BTP: JWT Bearer token
            token = await self._get_jwt_token()
            headers["Authorization"] = f"Bearer {token}"
            self._client = httpx.AsyncClient(
                base_url=self.config.url,
                headers=headers,
                verify=True,
                timeout=httpx.Timeout(45.0, connect=10.0),
            )
        else:
            raise ValueError(f"Unsupported auth method: {self.config.auth_method}")

        # Fetch CSRF token
        await self._fetch_csrf_token()
        logger.info(f"Connected to {self.config.name} ({self.config.type.value}) via ADT")

    async def disconnect(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    # ─── CSRF Token ─────────────────────────────────────────

    async def _fetch_csrf_token(self) -> None:
        """Fetch CSRF token required for write operations."""
        resp = await self._client.get(
            ENDPOINTS["discovery"],
            headers={"X-CSRF-Token": "Fetch"},
        )
        self._csrf_token = resp.headers.get("X-CSRF-Token")
        logger.debug(f"CSRF token fetched: {self._csrf_token[:10]}..." if self._csrf_token else "No CSRF token")

    # ─── JWT / XSUAA Token Exchange ─────────────────────────

    async def _get_jwt_token(self) -> str:
        """Get JWT token via XSUAA client credentials or service key.

        For principal propagation, this exchanges a user JWT for a SAML Bearer assertion.
        """
        from .credential_store import get_service_key
        service_key = await get_service_key(self.config.name)

        client_id = service_key["uaa"]["clientid"]
        client_secret = service_key["uaa"]["clientsecret"]
        token_url = f"{service_key['uaa']['url']}/oauth/token"

        async with httpx.AsyncClient() as token_client:
            resp = await token_client.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": client_id,
                    "client_secret": client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            return resp.json()["access_token"]

    # ─── SEARCH ─────────────────────────────────────────────

    async def search_objects(self, query: str, max_results: int = 50) -> list[ABAPObject]:
        """Search for ABAP objects in the repository.

        Uses: GET /sap/bc/adt/repository/informationsystem/search
        """
        resp = await self._client.get(
            ENDPOINTS["search"],
            params={
                "operation": "quickSearch",
                "query": query,
                "maxResults": max_results,
            },
        )
        resp.raise_for_status()

        objects = []
        root = ET.fromstring(resp.text)
        for entry in root.findall(".//adtcore:objectReference", NS):
            obj_type_str = entry.get("adtcore:type", "")
            obj_name = entry.get("adtcore:name", "")
            obj_uri = entry.get("adtcore:uri", "")
            obj_desc = entry.get("adtcore:description", "")
            obj_package = entry.get("adtcore:packageName", "")

            # Map ADT type string to our enum
            otype = self._map_adt_type(obj_type_str)
            if otype:
                objects.append(ABAPObject(
                    name=obj_name,
                    type=otype,
                    package=obj_package,
                    description=obj_desc,
                    system_id=self.config.name,
                    system_type=self.config.type,
                    uri=obj_uri,
                ))
        return objects

    # ─── READ SOURCE ────────────────────────────────────────

    async def read_source(self, object_name: str, object_type: ObjectType) -> SourceCode:
        """Read the source code of an ABAP object.

        Uses: GET /sap/bc/adt/{type_path}/{name}/source/main
        """
        endpoint, suffix = self._get_endpoint(object_type)
        url = endpoint + suffix.format(name=object_name.lower())

        resp = await self._client.get(
            url,
            headers={"Accept": "text/plain"},
        )
        resp.raise_for_status()
        source = resp.text
        etag = resp.headers.get("ETag")

        return SourceCode(
            object_name=object_name,
            object_type=object_type,
            source=source,
            etag=etag,
            line_count=source.count("\n") + 1,
        )

    # ─── WRITE SOURCE ───────────────────────────────────────

    async def lock_object(self, object_name: str, object_type: ObjectType) -> str:
        """Lock an ABAP object for editing. Returns lock handle."""
        endpoint, _ = self._get_endpoint(object_type)
        url = f"{endpoint}/{object_name.lower()}"

        resp = await self._client.post(
            url,
            headers={
                "X-CSRF-Token": self._csrf_token,
                "X-sap-adt-sessiontype": "stateful",
            },
            params={"_action": "LOCK", "accessMode": "MODIFY"},
        )
        resp.raise_for_status()

        # Lock handle is in the response body (XML)
        root = ET.fromstring(resp.text)
        lock_handle = root.text or root.get("LOCK_HANDLE", "")
        logger.info(f"Locked {object_name} — handle: {lock_handle[:20]}...")
        return lock_handle

    async def write_source(
        self,
        object_name: str,
        object_type: ObjectType,
        source: str,
        lock_handle: str,
        transport: Optional[str] = None,
    ) -> bool:
        """Write source code to an ABAP object.

        Uses: PUT /sap/bc/adt/{type_path}/{name}/source/main
        """
        endpoint, suffix = self._get_endpoint(object_type)
        url = endpoint + suffix.format(name=object_name.lower())

        params = {"lockHandle": lock_handle}
        if transport:
            params["corrNr"] = transport

        resp = await self._client.put(
            url,
            content=source,
            headers={
                "Content-Type": "text/plain; charset=utf-8",
                "X-CSRF-Token": self._csrf_token,
            },
            params=params,
        )
        resp.raise_for_status()
        logger.info(f"Source written: {object_name} ({object_type.value})")
        return True

    async def unlock_object(self, object_name: str, object_type: ObjectType, lock_handle: str) -> None:
        """Unlock a previously locked object."""
        endpoint, _ = self._get_endpoint(object_type)
        url = f"{endpoint}/{object_name.lower()}"

        await self._client.post(
            url,
            headers={"X-CSRF-Token": self._csrf_token},
            params={"_action": "UNLOCK", "lockHandle": lock_handle},
        )
        logger.info(f"Unlocked {object_name}")

    # ─── ACTIVATE ───────────────────────────────────────────

    async def activate(self, object_name: str, object_type: ObjectType) -> dict:
        """Activate an ABAP object.

        Uses: POST /sap/bc/adt/activation
        """
        body = f"""<?xml version="1.0" encoding="UTF-8"?>
<adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
  <adtcore:objectReference adtcore:name="{object_name}" adtcore:type="{object_type.value}"/>
</adtcore:objectReferences>"""

        resp = await self._client.post(
            ENDPOINTS["activation"],
            content=body,
            headers={
                "Content-Type": "application/xml",
                "X-CSRF-Token": self._csrf_token,
            },
        )
        resp.raise_for_status()
        logger.info(f"Activated: {object_name}")
        return {"status": "activated", "object": object_name}

    # ─── SYNTAX CHECK ───────────────────────────────────────

    async def syntax_check(self, source: str, object_uri: str) -> list[dict]:
        """Run syntax check on ABAP source code.

        Uses: POST /sap/bc/adt/checkruns
        """
        body = f"""<?xml version="1.0" encoding="UTF-8"?>
<chkrun:checkRun xmlns:chkrun="http://www.sap.com/adt/checkruns">
  <chkrun:checkObject chkrun:uri="{object_uri}"/>
</chkrun:checkRun>"""

        resp = await self._client.post(
            "/sap/bc/adt/checkruns",
            content=body,
            headers={
                "Content-Type": "application/vnd.sap.adt.checkruns+xml",
                "X-CSRF-Token": self._csrf_token,
            },
        )
        resp.raise_for_status()

        # Parse results
        issues = []
        root = ET.fromstring(resp.text)
        for finding in root.findall(".//{http://www.sap.com/adt/checkruns}finding"):
            issues.append({
                "severity": finding.get("severity", "info"),
                "message": finding.get("messageText", ""),
                "line": finding.get("line", ""),
            })
        return issues

    # ─── ATC CHECKS ─────────────────────────────────────────

    async def run_atc(self, object_name: str, object_type: ObjectType) -> dict:
        """Run ATC (ABAP Test Cockpit) checks.

        Uses: POST /sap/bc/adt/atc/runs
        """
        body = f"""<?xml version="1.0" encoding="UTF-8"?>
<atc:run xmlns:atc="http://www.sap.com/adt/atc">
  <objectSets>
    <objectSet kind="inclusive">
      <adtcore:objectReferences xmlns:adtcore="http://www.sap.com/adt/core">
        <adtcore:objectReference adtcore:name="{object_name}" adtcore:type="{object_type.value}"/>
      </adtcore:objectReferences>
    </objectSet>
  </objectSets>
</atc:run>"""

        resp = await self._client.post(
            ENDPOINTS["atc_checks"],
            content=body,
            headers={
                "Content-Type": "application/vnd.sap.atc.run.parameters.v1+xml",
                "X-CSRF-Token": self._csrf_token,
            },
        )
        resp.raise_for_status()
        # Return run ID for polling results
        return {"run_id": resp.headers.get("Location", ""), "status": "started"}

    # ─── TRANSPORT INFO ─────────────────────────────────────

    async def get_transport_info(self, object_uri: str) -> dict:
        """Get transport information for an object."""
        resp = await self._client.post(
            "/sap/bc/adt/cts/transportchecks",
            content=f"""<?xml version="1.0" encoding="UTF-8"?>
<asx:values xmlns:asx="http://www.sap.com/abapxml">
  <DATA>
    <PGMID>R3TR</PGMID>
    <OBJECT/>
    <OBJ_NAME/>
    <DEVCLASS/>
    <URI>{object_uri}</URI>
  </DATA>
</asx:values>""",
            headers={
                "Content-Type": "application/vnd.sap.as+xml",
                "X-CSRF-Token": self._csrf_token,
            },
        )
        resp.raise_for_status()
        return {"raw": resp.text}

    # ─── HELPERS ────────────────────────────────────────────

    def _get_endpoint(self, object_type: ObjectType) -> tuple[str, str]:
        """Get the ADT endpoint path for an object type."""
        mapping = OBJECT_TYPE_MAP.get(object_type)
        if not mapping:
            raise ValueError(f"Unsupported object type for ADT: {object_type}")
        endpoint_key, suffix = mapping
        return ENDPOINTS[endpoint_key], suffix

    @staticmethod
    def _map_adt_type(adt_type: str) -> Optional[ObjectType]:
        """Map ADT type string to ObjectType enum."""
        mapping = {
            "PROG/P": ObjectType.PROG,
            "CLAS/OC": ObjectType.CLAS,
            "INTF/OI": ObjectType.INTF,
            "FUGR/F": ObjectType.FUGR,
            "FUNC/FF": ObjectType.FUNC,
            "DDLS/DF": ObjectType.DDLS,
            "BDEF/BDO": ObjectType.BDEF,
            "SRVD/SRV": ObjectType.SRVD,
            "SRVB/SVB": ObjectType.SRVB,
            "TABL/DT": ObjectType.TABL,
            "DTEL/DE": ObjectType.DTEL,
            "DOMA/DD": ObjectType.DOMA,
            "DCLS/DL": ObjectType.DCLS,
        }
        return mapping.get(adt_type)
