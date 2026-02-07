"""Authentication middleware for tenant isolation.

Every API request must belong to a tenant. This ensures strict data separation.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Header, HTTPException


@dataclass
class TenantContext:
    """Current authenticated tenant + user."""
    tenant_id: str
    user_id: str
    plan: str  # "starter" | "professional" | "enterprise"
    email: str


async def get_current_tenant(
    authorization: str = Header(..., description="Bearer <token>"),
) -> TenantContext:
    """Extract and validate tenant from JWT token.

    In production, this validates the JWT signature, checks expiry,
    and extracts tenant_id + user_id from claims.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing Bearer token")

    token = authorization.replace("Bearer ", "")

    # TODO: Real JWT validation with JWKS
    # For now, decode without verification for development
    tenant = await _decode_token(token)
    if not tenant:
        raise HTTPException(401, "Invalid or expired token")

    return tenant


async def _decode_token(token: str) -> Optional[TenantContext]:
    """Decode JWT token and return tenant context.

    Production implementation would use:
    - PyJWT with RS256 verification
    - JWKS endpoint for key rotation
    - Token expiry validation
    - Tenant plan lookup from DB
    """
    try:
        # Placeholder — replace with real JWT decode
        import jwt
        payload = jwt.decode(token, options={"verify_signature": False})
        return TenantContext(
            tenant_id=payload.get("tenant_id", ""),
            user_id=payload.get("sub", ""),
            plan=payload.get("plan", "starter"),
            email=payload.get("email", ""),
        )
    except Exception:
        return None
