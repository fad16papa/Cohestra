"""Evaluator negatives and the simulated-controller boundary. No live GitHub read."""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from io import StringIO
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from correction.controller import open_controller
from correction.cursor_dispatch import DispatchHold, LiveCursorDispatcher, OwnerDispatchGrant
from correction.github_readonly import LiveReadOnlyClient, OwnerTransportGrant, TransportHold
from correction.release_gate import ReleaseHold, assess, deploy_production, deploy_uat, merge_feature
from correction.trust_evaluator import (
    LIVE_FLAGS,
    TrustDecision,
    consult_simulated_controller,
    evaluate,
    main,
    side_effect_gate,
)
from correction.trust_evidence import (
    ACTIONS_UNCONFIRMED,
    API_FAILURE,
    BINDING_MISMATCH,
    CHECKS_UNTRUSTED,
    CLOSING_MISMATCH,
    MANIFEST_INVALID,
    MANIFEST_MISSING,
    NOT_ENABLED,
    NOT_SAME_REPO,
    PASS_REASON,
    REVIEW_MISSING,
    REVIEW_UNTRUSTED,
    SCOPE_OUTSIDE,
    SIGNATURE_REJECTED,
    STALE_CLAIM,
    WORKFLOW_PATH,
    check_runs_url,
    contents_url,
    workflow_run_url,
)
from support import H1, Port, approved_policy, pull
from trust_support import BASE, BMAD_CHECK, BMAD_ID, HEAD, REPO, World, contents_body, run

PACKAGE = Path(__file__).resolve().parents[1]


class TrustEvaluatorTest(unittest.TestCase):
    def _actions_world(self, event_id: str, workflow: str) -> World:
        world = World(event_id)
        mapped = json.loads(world.map_text)
        mapped["tdd"] = {"app_id": 15368, "name": "TDD", "workflow": workflow}
        world.map_text = json.dumps(mapped, sort_keys=True, separators=(",", ":"))
        world.runs = [
            row
            if row["name"] != "TDD"
            else run(
                "TDD",
                15368,
                "github-actions",
                details_url=f"https://github.com/{REPO}/actions/runs/77/job/90",
                suite=88,
            )
            for row in world.runs
        ]
        return world

    def setUp(self) -> None:
        self._store = tempfile.TemporaryDirectory()
        self.store = Path(self._store.name)
        self.addCleanup(self._store.cleanup)

    def test_matching_evidence_is_pass_without_live_authority(self) -> None:
        world = World("1001")
        transport = world.transport()
        decision = evaluate(world.env(), transport, self.store)
        self.assertEqual(decision.status, "PASS")
        self.assertEqual(decision.reason, PASS_REASON)
        self.assertEqual(decision.head_sha, HEAD)
        self.assertFalse(decision.replayed)
        self.assertFalse(decision.execution_authorized)
        body = decision.to_dict()
        for name in LIVE_FLAGS:
            self.assertIs(body[name], False)
        self.assertFalse(body["execution_authorized"])
        self.assertEqual(transport.calls[0], transport.calls[-1])
        self.assertEqual(sum(1 for url in transport.calls if "/pulls/" in url), 2)
        self.assertTrue(any("filter=all" in url and "per_page=100" in url for url in transport.calls))
        self.assertFalse(any("/pulls/536/files" in url for url in transport.calls))
        forced = TrustDecision("PASS", PASS_REASON, HEAD, False, True)
        self.assertFalse(forced.execution_authorized)

    def test_forged_missing_stale_self_approved_and_untrusted(self) -> None:
        forged = World("1002")
        forged.break_signature = True
        forged_transport = forged.transport()
        forged_decision = evaluate(forged.env(), forged_transport, self.store)
        self.assertEqual(forged_decision.status, "HOLD")
        self.assertEqual(forged_decision.reason, SIGNATURE_REJECTED)
        self.assertFalse(any("/compare/" in url or "/check-runs" in url for url in forged_transport.calls))

        missing = World("1003")
        missing.contents_status = 404
        self.assertEqual(evaluate(missing.env(), missing.transport(), self.store).reason, MANIFEST_MISSING)

        stale = World("1004")
        stale.claimed = "2" * 40
        stale_transport = stale.transport()
        self.assertEqual(evaluate(stale.env(), stale_transport, self.store).reason, STALE_CLAIM)
        self.assertEqual(stale_transport.calls, [stale_transport.calls[0]])

        approved = World("1005")
        approved.author = "cohestra-bmad[bot]"
        self.assertEqual(evaluate(approved.env(), approved.transport(), self.store).reason, REVIEW_UNTRUSTED)

        untrusted = World("1006")
        untrusted.runs = [run("BMAD", BMAD_ID, "cohestra-bmad", output="independent true CAT-SEC")]
        self.assertEqual(evaluate(untrusted.env(), untrusted.transport(), self.store).reason, REVIEW_MISSING)

        hidden = World("1007")
        hidden.runs = hidden.runs + [run(BMAD_CHECK, BMAD_ID, "cohestra-bmad", conclusion="failure")]
        self.assertEqual(evaluate(hidden.env(), hidden.transport(), self.store).reason, REVIEW_UNTRUSTED)

    def test_scope_binding_workflow_and_actions_producer(self) -> None:
        outside = World("1008")
        outside.files = [{"filename": "src/App.tsx", "status": "modified"}]
        self.assertEqual(evaluate(outside.env(), outside.transport(), self.store).reason, SCOPE_OUTSIDE)

        workflow = World("1009")
        workflow.files = [{"filename": ".github/workflows/ci.yml", "status": "modified"}]
        workflow.manifest_overrides = {"allowed_paths": [".github/", "correction/"]}
        self.assertEqual(evaluate(workflow.env(), workflow.transport(), self.store).reason, WORKFLOW_PATH)

        bound = World("1010")
        bound.manifest_overrides = {"task_id": "other-task"}
        bound.task_id = "issue-536"
        self.assertEqual(evaluate(bound.env(), bound.transport(), self.store).reason, BINDING_MISMATCH)

        fork = World("1011")
        fork.pull_changes = {"head": {"sha": HEAD, "repo": {"full_name": "attacker/Cohestra"}}}
        self.assertEqual(evaluate(fork.env(), fork.transport(), self.store).reason, NOT_SAME_REPO)

        actions = World("1012")
        mapped = json.loads(actions.map_text)
        mapped["tdd"] = {"name": "TDD", "app_id": 15368}
        actions.map_text = json.dumps(mapped, sort_keys=True, separators=(",", ":"))
        self.assertEqual(evaluate(actions.env(), actions.transport(), self.store).reason, ACTIONS_UNCONFIRMED)

        wrong_app = World("1013")
        wrong_app.runs = [row if row["name"] != "TDD" else run("TDD", 15368, "github-actions") for row in wrong_app.runs]
        self.assertEqual(evaluate(wrong_app.env(), wrong_app.transport(), self.store).reason, CHECKS_UNTRUSTED)

    def test_actions_check_needs_the_workflow_run_and_unchanged_file(self) -> None:
        workflow = ".github/workflows/correction-controller-tests.yml"
        raw = (PACKAGE.parents[2] / ".github" / "workflows" / "correction-controller-tests.yml").read_bytes()
        missing = self._actions_world("1100", workflow)
        missing_decision = evaluate(missing.env(), missing.transport(), self.store)
        self.assertEqual(missing_decision.status, "HOLD")
        self.assertEqual(missing_decision.reason, CHECKS_UNTRUSTED)
        self.assertFalse(missing_decision.execution_authorized)

        matched = self._actions_world("1101", workflow)
        proof = {
            "check_suite_id": 88,
            "conclusion": "success",
            "event": "pull_request",
            "head_repository": {"full_name": REPO},
            "head_sha": HEAD,
            "id": 77,
            "path": workflow,
            "referenced_workflows": [],
            "status": "completed",
        }
        matched.extra[workflow_run_url(REPO, 77)] = (200, proof)
        matched.extra[contents_url(REPO, workflow, HEAD)] = (200, contents_body(raw))
        matched.extra[contents_url(REPO, workflow, BASE)] = (200, contents_body(raw))
        transport = matched.transport()
        decision = evaluate(matched.env(), transport, self.store)
        self.assertEqual(decision.status, "PASS")
        self.assertEqual(decision.reason, PASS_REASON)
        self.assertFalse(decision.execution_authorized)
        self.assertFalse(decision.to_dict()["live_identity_verified"])
        self.assertIn(workflow_run_url(REPO, 77), transport.calls)
        self.assertIn(contents_url(REPO, workflow, HEAD), transport.calls)
        self.assertIn(contents_url(REPO, workflow, BASE), transport.calls)

        changed = self._actions_world("1102", workflow)
        changed.extra[workflow_run_url(REPO, 77)] = (200, proof)
        changed.extra[contents_url(REPO, workflow, HEAD)] = (200, contents_body(raw + b"\n"))
        changed.extra[contents_url(REPO, workflow, BASE)] = (200, contents_body(raw))
        self.assertEqual(evaluate(changed.env(), changed.transport(), self.store).reason, CHECKS_UNTRUSTED)

    def test_pagination_sees_an_earlier_non_success(self) -> None:
        world = World("1014")
        noise = [run(f"noise-{index}", 1, "other-app") for index in range(100)]
        failure = run(BMAD_CHECK, BMAD_ID, "cohestra-bmad", conclusion="skipped")
        world.check_pages = [
            {"total_count": 108, "check_runs": noise},
            {"total_count": 108, "check_runs": world.runs + [failure]},
        ]
        transport = world.transport()
        decision = evaluate(world.env(), transport, self.store)
        self.assertEqual(decision.reason, REVIEW_UNTRUSTED)
        self.assertIn(check_runs_url(REPO, HEAD, 2), transport.calls)

        short = World("1015")
        short.check_pages = [
            {"total_count": 150, "check_runs": noise},
            {"total_count": 150, "check_runs": noise[:10]},
        ]
        self.assertEqual(evaluate(short.env(), short.transport(), self.store).reason, REVIEW_UNTRUSTED)

    def test_replay_returns_the_stored_result_and_a_mismatch_does_not(self) -> None:
        world = World("1016")
        transport = world.transport()
        first = evaluate(world.env(), transport, self.store)
        self.assertEqual(first.status, "PASS")
        calls = len(transport.calls)
        second = evaluate(world.env(), transport, self.store)
        self.assertEqual(second.status, "PASS")
        self.assertTrue(second.replayed)
        self.assertEqual(len(transport.calls), calls)
        stored = (self.store / "replay.json").read_bytes()
        world.claimed = "3" * 40
        mismatch = evaluate(world.env(), transport, self.store)
        self.assertEqual(mismatch.reason, "replay fingerprint does not match")
        self.assertEqual(len(transport.calls), calls)
        self.assertEqual((self.store / "replay.json").read_bytes(), stored)
        gate = side_effect_gate(second, current_head=second.head_sha)
        self.assertEqual(gate.status, "HOLD")
        self.assertEqual(gate.reason, "execution authority is not granted")
        self.assertTrue(gate.replayed)
        self.assertFalse(gate.execution_authorized)

    def test_disabled_duplicate_manifest_and_closing_read(self) -> None:
        disabled = World("1017")
        disabled.enabled = "false"
        transport = disabled.transport()
        self.assertEqual(evaluate(disabled.env(), transport, self.store).reason, NOT_ENABLED)
        self.assertEqual(transport.calls, [])

        duplicate = World("1018")
        raw = duplicate.manifest_bytes().decode("utf-8")
        duplicate.raw_manifest = raw.replace('"repo":', '"repo":"other/repo","repo":', 1).encode("utf-8")
        self.assertEqual(evaluate(duplicate.env(), duplicate.transport(), self.store).reason, MANIFEST_INVALID)

        closing = World("1019")
        closing.closing_changes = {"changed_files": 2}
        self.assertEqual(evaluate(closing.env(), closing.transport(), self.store).reason, CLOSING_MISMATCH)

        absent = World("1020")
        self.assertEqual(evaluate(absent.env(), None, self.store).reason, "trusted verification is unavailable")

    def test_pass_does_not_grant_simulated_controller_execution(self) -> None:
        world = World("1021")
        decision = evaluate(world.env(), world.transport(), self.store)
        self.assertEqual(decision.status, "PASS")
        manifest, _encoded = __import__("trust_support", fromlist=["signed_manifest"]).signed_manifest(world.private)
        port = Port(pull(H1))
        controller = open_controller(self.store / "controller", manifest, port, approved_policy(), keyring=__import__(
            "correction.authorization", fromlist=["OwnerKeyring"]
        ).OwnerKeyring({manifest.owner_key_id: world.public}))
        self.assertTrue(controller.owner_authorized)
        offered = consult_simulated_controller(decision, controller)
        self.assertEqual(offered["status"], "HOLD")
        self.assertFalse(offered["execution_authorized"])
        self.assertFalse(offered["live_dispatch"])
        self.assertFalse(offered["owner_manifest_authorized"])
        self.assertEqual(offered["authentication_source"], "")
        self.assertEqual(offered["corrections"], 0)
        self.assertEqual(controller.ledger.corrections, 0)
        self.assertEqual(port.calls, 0)
        with self.assertRaises(DispatchHold):
            LiveCursorDispatcher().dispatch({}, OwnerDispatchGrant("cursor-scoped-correction", True, True))
        with self.assertRaises(TransportHold):
            LiveReadOnlyClient().fetch(OwnerTransportGrant("github-read-only", True, True), REPO, 536)
        gate = assess(
            verification_plane="SIMULATED_PASS",
            changed_paths=("correction/controller.py",),
            owner_manifest_authorized=True,
            policy_activated=True,
        )
        self.assertFalse(gate.eligible)
        self.assertFalse(gate.automerge_ready)
        self.assertFalse(gate.uat_deployment_ready)
        self.assertFalse(gate.production_ready)
        with self.assertRaises(ReleaseHold):
            merge_feature(gate)
        with self.assertRaises(ReleaseHold):
            deploy_uat(gate)
        with self.assertRaises(ReleaseHold):
            deploy_production(gate)
        source = (PACKAGE / "correction" / "trust_evaluator.py").read_text(encoding="utf-8")
        self.assertNotIn("host-verified", source)
        self.assertNotIn("Controller.handle", source)
        for banned in ("Ed25519PrivateKey", "merge_feature", "deploy_uat", "deploy_production", "LiveCursorDispatcher"):
            self.assertNotIn(banned, source)

    def test_cli_hold_exits_nonzero(self) -> None:
        keys = [
            "EVENT_NAME",
            "EVENT_ID",
            "REPOSITORY",
            "PULL_NUMBER",
            "CLAIMED_HEAD_SHA",
            "COHESTRA_TRUST_EVALUATOR_ENABLED",
            "COHESTRA_TRUST_REPLAY_DIR",
            "GITHUB_TOKEN",
        ]
        saved = {key: os.environ.get(key) for key in keys}
        try:
            os.environ["EVENT_NAME"] = "pull_request_target"
            os.environ["EVENT_ID"] = "1023"
            os.environ["REPOSITORY"] = REPO
            os.environ["PULL_NUMBER"] = "536"
            os.environ["CLAIMED_HEAD_SHA"] = HEAD
            os.environ["COHESTRA_TRUST_EVALUATOR_ENABLED"] = "false"
            os.environ["COHESTRA_TRUST_REPLAY_DIR"] = str(self.store / "cli")
            os.environ.pop("GITHUB_TOKEN", None)
            buffer = StringIO()
            with redirect_stdout(buffer):
                code = main([])
            self.assertEqual(code, 1)
            self.assertIn('"status":"HOLD"', buffer.getvalue())
            self.assertIn('"execution_authorized":false', buffer.getvalue())
        finally:
            for key, value in saved.items():
                if value is None:
                    os.environ.pop(key, None)
                else:
                    os.environ[key] = value

    def test_corrupt_store_is_not_rewritten(self) -> None:
        path = self.store / "replay.json"
        path.write_text("{", encoding="utf-8")
        before = path.read_bytes()
        world = World("1022")
        transport = world.transport()
        decision = evaluate(world.env(), transport, self.store)
        self.assertEqual(decision.reason, "replay store is unreadable")
        self.assertEqual(transport.calls, [])
        self.assertEqual(path.read_bytes(), before)
        self.assertNotIn(API_FAILURE, decision.reason)


if __name__ == "__main__":
    unittest.main()
