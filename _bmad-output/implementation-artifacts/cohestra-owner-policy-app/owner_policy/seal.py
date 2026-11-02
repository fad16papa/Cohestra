"""Request-bound marker for snapshots built by the verifier.

The ticket is an in-process guard. It is not a live GitHub proof.
mint() refuses callers other than owner_policy.evidence. A ticket minted
for one request does not validate a different request, and constructing
_Ticket by hand does not pass ok().
"""

from __future__ import annotations

import hmac
import sys
from hashlib import sha256
from os import urandom


class _Ticket:
    __slots__ = ("_digest", "_mac")

    def __init__(self, digest: bytes, mac: bytes) -> None:
        object.__setattr__(self, "_digest", digest)
        object.__setattr__(self, "_mac", mac)

    def __setattr__(self, name: str, value: object) -> None:
        raise AttributeError("seal ticket is frozen")


class _Seal:
    def __init__(self) -> None:
        self._key = urandom(32)

    def mint(self, digest: bytes) -> _Ticket:
        caller = sys._getframe(1).f_globals.get("__name__", "")
        if caller != "owner_policy.evidence":
            raise RuntimeError("seal mint refused")
        if not isinstance(digest, bytes) or len(digest) != 32:
            raise RuntimeError("seal mint refused")
        mac = hmac.new(self._key, digest, sha256).digest()
        return _Ticket(digest, mac)

    def ok(self, token: object, digest: bytes) -> bool:
        if not isinstance(token, _Ticket) or not isinstance(digest, bytes):
            return False
        mac = hmac.new(self._key, digest, sha256).digest()
        return hmac.compare_digest(token._digest, digest) and hmac.compare_digest(token._mac, mac)


SEAL = _Seal()
