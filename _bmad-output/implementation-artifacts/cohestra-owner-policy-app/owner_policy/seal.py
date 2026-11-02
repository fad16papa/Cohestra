"""In-process marker for requests built by the snapshot verifier.

This is not a cryptographic boundary and it does not prove a live GitHub
read. mint() refuses callers other than owner_policy.evidence so tests and
hosts cannot build a successful EvaluationRequest by hand.
"""

from __future__ import annotations

import sys


class _Seal:
    def __init__(self) -> None:
        self._token = object()

    def mint(self) -> object:
        caller = sys._getframe(1).f_globals.get("__name__", "")
        if caller != "owner_policy.evidence":
            raise RuntimeError("seal mint refused")
        return self._token

    def ok(self, token: object) -> bool:
        return token is self._token


SEAL = _Seal()
