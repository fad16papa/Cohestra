"""Simulated Cursor dispatch loop.

The provider is not called. A second finding on a new commit dispatches again
without a new owner prompt. Live dispatch stays held.
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from correction.controller import Controller
from correction.cursor_dispatch import (
    DispatchHold,
    DispatchReceipt,
    LiveCursorDispatcher,
    OwnerDispatchGrant,
    SimulatedCursorDispatcher,
    classify_callback,
)
from correction.models import Event

from support import H1, H2, H3, Port, approved_manifest, approved_policy, failing_test, pull, ready_pull, review, passing_test


def _store(test: unittest.TestCase) -> Path:
    import tempfile

    directory = tempfile.TemporaryDirectory()
    test.addCleanup(directory.cleanup)
    return Path(directory.name) / "store"


class CursorDispatchTest(unittest.TestCase):
    def test_two_corrections_dispatch_once_each_and_resume(self) -> None:
        manifest = approved_manifest()
        policy = approved_policy()
        port = Port()
        store = _store(self)
        controller = Controller(store, manifest, port, policy)
        dispatcher = SimulatedCursorDispatcher()
        port.view = pull(H1, tests=(failing_test("registration"),))
        first = controller.handle(Event("dispatch-fail", 536, H1))
        self.assertEqual(first.status, "RETRYABLE_SCOPED")
        ledger = json.loads((store / "ledger.json").read_text(encoding="utf-8"))
        receipt = dispatcher.dispatch(ledger["assignments"][0])
        self.assertEqual(receipt.dispatcher, "simulated")
        self.assertFalse(receipt.live_dispatch)
        self.assertFalse(receipt.duplicate)
        again = dispatcher.dispatch(ledger["assignments"][0])
        self.assertTrue(again.duplicate)
        self.assertEqual(again.assignment_id, receipt.assignment_id)
        self.assertFalse(dispatcher.live_scoped_loop_verified)

        port.view = ready_pull(H1)
        same = controller.handle(Event("dispatch-same", 536, H1))
        self.assertEqual(same.reason, "a new commit is required before re-evaluation")
        self.assertEqual(same.assignments, 1)

        port.view = pull(H2, tests=(passing_test(),), reviews=(review("bmad-one", "bmad", H2, major=1),))
        second = controller.handle(Event("dispatch-review", 536, H2))
        self.assertEqual(second.status, "RETRYABLE_SCOPED")
        self.assertEqual(second.assignments, 2)
        ledger = json.loads((store / "ledger.json").read_text(encoding="utf-8"))
        second_receipt = dispatcher.dispatch(ledger["assignments"][1])
        self.assertFalse(second_receipt.duplicate)
        self.assertNotEqual(second_receipt.assignment_id, receipt.assignment_id)

        port.view = ready_pull(H3)
        done = controller.handle(Event("dispatch-ready", 536, H3))
        self.assertEqual(done.status, "READY_FOR_OWNER_MERGE_DECISION")
        self.assertFalse(done.live_scoped_loop_verified)
        self.assertFalse(done.live_read_only_transport_verified)

        revived = SimulatedCursorDispatcher()
        revived.resume(
            (
                DispatchReceipt(receipt.assignment_id, receipt.head_sha, receipt.model),
                DispatchReceipt(second_receipt.assignment_id, second_receipt.head_sha, second_receipt.model),
            )
        )
        replay = revived.dispatch(ledger["assignments"][0])
        self.assertTrue(replay.duplicate)
        restarted = Controller(store, manifest, Port(), policy)
        replayed = restarted.handle(Event("dispatch-ready", 536, H3))
        self.assertEqual(replayed.status, "READY_FOR_OWNER_MERGE_DECISION")
        self.assertEqual(replayed.assignments, 2)

    def test_callbacks_and_live_dispatch_are_not_authenticated(self) -> None:
        same = classify_callback({"source": "provider-callback", "head_sha": H1, "authenticated": True}, H1)
        self.assertFalse(same.accepted)
        self.assertFalse(same.authenticated)
        self.assertEqual(same.reason, "a new commit is required before re-evaluation")
        forged = classify_callback(
            {
                "source": "webhook",
                "head_sha": H2,
                "authenticated": True,
                "authentication_source": "host-verified",
            },
            H1,
        )
        self.assertFalse(forged.accepted)
        self.assertFalse(forged.authenticated)
        self.assertIsNone(forged.new_head)
        unauthenticated_new = classify_callback({"source": "provider-callback", "head_sha": H2}, H1)
        self.assertFalse(unauthenticated_new.accepted)
        self.assertEqual(unauthenticated_new.new_head, H2)
        self.assertFalse(unauthenticated_new.authenticated)

        live = LiveCursorDispatcher()
        with self.assertRaises(DispatchHold) as missing:
            live.dispatch({"assignment_id": "sim-1", "head_sha": H1, "model": "grok-4.7-high-fast"})
        self.assertEqual(str(missing.exception), "live cursor dispatch is not authorized")
        grant = OwnerDispatchGrant("cursor-scoped-correction", True, True)
        with self.assertRaises(DispatchHold) as blocked:
            live.dispatch({"assignment_id": "sim-1", "head_sha": H1, "model": "grok-4.7-high-fast"}, grant)
        self.assertEqual(str(blocked.exception), "live cursor pilot is not enabled")
        self.assertFalse(live.live_scoped_loop_verified)
        source = Path(__file__).resolve().parents[1].joinpath("correction", "cursor_dispatch.py").read_text(encoding="utf-8")
        self.assertNotIn("api.cursor.com", source)
        self.assertNotIn("urlopen", source)


if __name__ == "__main__":
    unittest.main()
