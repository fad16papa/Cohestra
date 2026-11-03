"""Manifest-gated correction controller.

This package records simulated correction assignments. It does not call
Cursor, merge pull requests, or deploy. A simulated READY decision is not
LIVE_SCOPED_LOOP_VERIFIED.
"""

from .controller import Controller
from .manifest import Manifest
from .models import Decision

__all__ = ["Controller", "Decision", "Manifest"]
