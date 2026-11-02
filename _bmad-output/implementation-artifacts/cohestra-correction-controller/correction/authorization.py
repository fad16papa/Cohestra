"""Owner-signature verification.

This module stores no private key and exposes no signing function. A matching
content digest is not authorization. `owner_manifest_authorized` becomes true
only when this verifier accepts an Ed25519 signature for the canonical story
body against a public key the host supplied.
"""

from __future__ import annotations

import base64
import hashlib
import json

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

from .manifest import Manifest


class OwnerKeyError(Exception):
    pass


class OwnerKeyring:
    """Public keys only. The controller cannot mint an owner signature."""

    def __init__(self, keys: dict[str, bytes]) -> None:
        checked: dict[str, bytes] = {}
        for key_id, raw in keys.items():
            if not isinstance(key_id, str) or not key_id or not isinstance(raw, bytes) or len(raw) != 32:
                raise OwnerKeyError("owner public key is invalid")
            try:
                Ed25519PublicKey.from_public_bytes(raw)
            except ValueError as exc:
                raise OwnerKeyError("owner public key is invalid") from exc
            checked[key_id] = raw
        self._keys = checked

    def public_key(self, key_id: str) -> bytes | None:
        return self._keys.get(key_id)


def signing_payload(manifest: Manifest) -> bytes:
    """Canonical story bytes. The signature field itself is outside the payload."""
    body = manifest.to_dict()
    if manifest.manifest_version == 2:
        body["authorization"] = {
            "key_id": manifest.owner_key_id,
            "public_key_sha256": manifest.public_key_sha256,
        }
    return json.dumps(body, sort_keys=True, separators=(",", ":")).encode("utf-8")


def verify_owner_authorization(manifest: Manifest, keyring: OwnerKeyring | None) -> bool:
    if manifest.manifest_version != 2 or keyring is None:
        return False
    if not manifest.owner_key_id or len(manifest.owner_signature) != 64:
        return False
    public_key = keyring.public_key(manifest.owner_key_id)
    if public_key is None:
        return False
    if hashlib.sha256(public_key).hexdigest() != manifest.public_key_sha256:
        return False
    try:
        Ed25519PublicKey.from_public_bytes(public_key).verify(manifest.owner_signature, signing_payload(manifest))
    except (InvalidSignature, ValueError):
        return False
    return True


def decode_signature(value: str) -> bytes:
    try:
        raw = base64.b64decode(value, validate=True)
    except (ValueError, TypeError) as exc:
        raise ValueError("signature") from exc
    if len(raw) != 64:
        raise ValueError("signature")
    return raw
