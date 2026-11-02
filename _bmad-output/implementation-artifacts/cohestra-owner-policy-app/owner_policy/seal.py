"""Request-bound marker for snapshots built by the verifier.

The ticket is an in-process guard. It is not a live GitHub proof.
mint() refuses callers other than owner_policy.evidence. ok() fails when
the request bytes change after the ticket is minted.
"""

from __future__ import annotations

import hmac
import sys


class _Ticket:
    __slots__ = ("digest",)

    def __init__(self, digest: bytes) -> None:
        self.digest = digest


class _Seal:
    def mint(self, digest: bytes) -> _Ticket:
        caller = sys._getframe(1).f_globals.get("__name__", "")
        if caller != "owner_policy.evidence":
            raise RuntimeError("seal mint refused")
        if not isinstance(digest, bytes) or len(digest) != 32:
            raise RuntimeError("seal mint refused")
        return _Ticket(digest)

    def ok(self, token: object, digest: bytes) -> bool:
        if not isinstance(token, _Ticket) or not isinstance(digest, bytes):
            return False
        return hmac.compare_digest(token.digest, digest)


SEAL = _Seal()
