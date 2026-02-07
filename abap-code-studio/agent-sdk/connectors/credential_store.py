"""Local Credential Store.

Manages SAP credentials on the CLIENT AGENT side.
Credentials NEVER leave the customer network.

Supports:
- Environment variables
- File-based secrets (/secrets mount in Docker)
- HashiCorp Vault integration
- OS Keyring (for desktop installations)
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Priority: Vault → File → Env → Keyring
SECRETS_DIR = Path(os.getenv("AGENT_SECRETS_DIR", "/opt/agent/secrets"))


async def get_credentials(system_name: str) -> tuple[str, str]:
    """Get username/password for a system. Returns (username, password).

    Lookup order:
    1. Environment variables: SAP_{SYSTEM}_USER, SAP_{SYSTEM}_PASS
    2. Secrets file: /secrets/{system_name}.json
    3. HashiCorp Vault (if configured)
    4. OS Keyring (fallback for desktop)
    """
    prefix = system_name.upper().replace("-", "_")

    # 1. Environment variables
    user = os.getenv(f"SAP_{prefix}_USER")
    password = os.getenv(f"SAP_{prefix}_PASS")
    if user and password:
        logger.debug(f"Credentials for {system_name}: from environment")
        return user, password

    # 2. Secrets file
    secrets_file = SECRETS_DIR / f"{system_name}.json"
    if secrets_file.exists():
        data = json.loads(secrets_file.read_text())
        logger.debug(f"Credentials for {system_name}: from file {secrets_file}")
        return data["username"], data["password"]

    # 3. Vault
    vault_addr = os.getenv("VAULT_ADDR")
    if vault_addr:
        return await _get_from_vault(system_name)

    # 4. OS Keyring
    try:
        import keyring
        user = keyring.get_password(f"abap-studio-{system_name}", "username")
        password = keyring.get_password(f"abap-studio-{system_name}", "password")
        if user and password:
            logger.debug(f"Credentials for {system_name}: from keyring")
            return user, password
    except ImportError:
        pass

    raise ValueError(
        f"No credentials found for system '{system_name}'. "
        f"Set SAP_{prefix}_USER/SAP_{prefix}_PASS env vars "
        f"or create {secrets_file}"
    )


async def get_service_key(system_name: str) -> dict:
    """Get BTP service key JSON for a system.

    Lookup order:
    1. File: /secrets/{system_name}_service_key.json
    2. Environment: SAP_{SYSTEM}_SERVICE_KEY (base64 encoded JSON)
    3. Vault
    """
    prefix = system_name.upper().replace("-", "_")

    # 1. File
    key_file = SECRETS_DIR / f"{system_name}_service_key.json"
    if key_file.exists():
        return json.loads(key_file.read_text())

    # 2. Environment (base64 encoded)
    env_key = os.getenv(f"SAP_{prefix}_SERVICE_KEY")
    if env_key:
        import base64
        return json.loads(base64.b64decode(env_key))

    # 3. Vault
    vault_addr = os.getenv("VAULT_ADDR")
    if vault_addr:
        return await _get_service_key_from_vault(system_name)

    raise ValueError(
        f"No service key found for system '{system_name}'. "
        f"Create {key_file} or set SAP_{prefix}_SERVICE_KEY env var."
    )


async def _get_from_vault(system_name: str) -> tuple[str, str]:
    """Fetch credentials from HashiCorp Vault."""
    import hvac

    client = hvac.Client(
        url=os.getenv("VAULT_ADDR"),
        token=os.getenv("VAULT_TOKEN"),
    )
    path = f"secret/data/sap/{system_name}"
    secret = client.secrets.kv.v2.read_secret_version(path=f"sap/{system_name}")
    data = secret["data"]["data"]
    return data["username"], data["password"]


async def _get_service_key_from_vault(system_name: str) -> dict:
    """Fetch BTP service key from HashiCorp Vault."""
    import hvac

    client = hvac.Client(
        url=os.getenv("VAULT_ADDR"),
        token=os.getenv("VAULT_TOKEN"),
    )
    secret = client.secrets.kv.v2.read_secret_version(path=f"sap/{system_name}/service_key")
    return secret["data"]["data"]
