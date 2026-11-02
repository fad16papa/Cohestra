"""Story-acceptance gates for a version-2 owner-signed manifest.

The private key is generated in memory for these tests. It is not written
to the repository, and the controller package has no signing function.
A matching content digest is not owner authorization. Host-supplied usage
numbers exercise the gate only. live_usage_verified stays false.
"""

from __future__ import annotations

import base64
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from correction.authorization import OwnerKeyring, signing_payload, verify_owner_authorization
from correction.controller import HOLD, NOT_VERIFIED, READY, RETRY, SIMULATED_PASS, Controller
from correction.manifest import Manifest, ManifestError
from correction.models import Check, Event, RequirementEvidence, UsageEvidence

from support import (
    BASE,
    H1,
    H2,
    H3,
    MODEL,
    Port,
    approved_policy,
    failing_test,
    manifest_raw,
    passing_test,
    pull,
    review,
)

KEY_ID = "owner-story-2026"
PACKAGE = Path(__file__).resolve().parents[1] / "correction"


def story_raw(**overrides: object) -> dict[str, object]:
    raw = manifest_raw()
    raw["manifest_version"] = 2
    raw["budget"] = {
        "max_corrections": 3,
        "max_elapsed_seconds": 3600,
        "max_tokens": 100_000,
        "max_cost_cents": 500,
        "max_no_progress": 2,
        "max_repeated_failures": 2,
    }
    raw["required_checks"] = ["gitguardian", "integration", "regression", "security", "tdd"]
    raw["requirements"] = [
        {
            "evidence_kind": "test",
            "evidence_name": "registration",
            "expected_behavior": "A visitor registration is stored once for the same phone.",
            "mandatory": True,
            "requirement_id": "REQ-REG",
        },
        {
            "evidence_kind": "review",
            "evidence_name": "notification-review",
            "expected_behavior": "The organiser receives one notification after registration.",
            "mandatory": True,
            "requirement_id": "REQ-NOTIFY",
        },
    ]
    raw["authorization"] = {
        "key_id": KEY_ID,
        "public_key_sha256": "ab" * 32,
        "signature": base64.b64encode(b"\x11" * 64).decode("ascii"),
    }
    raw.update(overrides)
    return raw


def signed_story(private: Ed25519PrivateKey, **overrides: object) -> tuple[Manifest, OwnerKeyring]:
    public = private.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
    raw = story_raw(**overrides)
    authorization = raw["authorization"]
    assert isinstance(authorization, dict)
    authorization["public_key_sha256"] = hashlib.sha256(public).hexdigest()
    draft = Manifest.from_dict(raw)
    signature = private.sign(signing_payload(draft))
    authorization = raw["authorization"]
    assert isinstance(authorization, dict)
    authorization["signature"] = base64.b64encode(signature).decode("ascii")
    manifest = Manifest.from_dict(raw)
    return manifest, OwnerKeyring({KEY_ID: public})


def baseline(head: str, **conclusions: str) -> tuple[Check, ...]:
    names = ("gitguardian", "integration", "regression", "security", "tdd")
    return tuple(Check(name, conclusions.get(name, "success"), head) for name in names)


def evidence(
    requirement_id: str,
    name: str,
    head: str,
    result: str,
    source: str = "bmad",
    authentication_source: str = "host-verified",
) -> RequirementEvidence:
    return RequirementEvidence(requirement_id, name, head, result, source, authentication_source)


def usage(
    head: str,
    elapsed: int | None = 10,
    tokens: int | None = 100,
    cost: int | None = 5,
    source: str = "host-verified",
) -> UsageEvidence:
    return UsageEvidence(head, elapsed, tokens, cost, source)


def both_reviews(head: str) -> tuple:
    return (
        review("bmad-one", "bmad", head),
        review("catsec-one", "catsec", head),
    )


def open_store(test: unittest.TestCase) -> Path:
    directory = tempfile.TemporaryDirectory()
    test.addCleanup(directory.cleanup)
    return Path(directory.name) / "store"


class StoryAcceptanceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.private = Ed25519PrivateKey.generate()
        self.manifest, self.keyring = signed_story(self.private)
        self.policy = approved_policy()

    def test_signed_manifest_binds_scope_and_digest_is_not_authorization(self) -> None:
        payload = json.loads(signing_payload(self.manifest))
        self.assertEqual(payload["repo"], "fad16papa/Cohestra")
        self.assertEqual(payload["task_id"], "issue-536")
        self.assertEqual(payload["pull_number"], 536)
        self.assertEqual(payload["base_sha"], BASE)
        self.assertEqual(payload["base_ref"], "main")
        self.assertEqual(payload["allowed_paths"], ["correction/"])
        self.assertEqual(payload["model"], MODEL)
        self.assertEqual(payload["manifest_version"], 2)
        self.assertIn("security", payload["required_checks"])
        self.assertEqual(set(payload["authorization"]), {"key_id", "public_key_sha256"})
        self.assertEqual(
            set(payload),
            {
                "acceptance_criteria",
                "allowed_paths",
                "author_id",
                "authorization",
                "base_ref",
                "base_sha",
                "budget",
                "manifest_id",
                "manifest_version",
                "model",
                "pull_number",
                "repo",
                "required_checks",
                "requirements",
                "task_id",
            },
        )
        self.assertEqual(
            signing_payload(self.manifest),
            json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8"),
        )
        self.assertTrue(verify_owner_authorization(self.manifest, self.keyring))
        rebuilt = Manifest.from_dict(self.manifest.to_dict())
        self.assertEqual(rebuilt.digest, self.manifest.digest)
        flipped = self._resign_field("allowed_paths", ["correction/controller.py"])
        self.assertNotEqual(flipped.digest, self.manifest.digest)
        self.assertFalse(verify_owner_authorization(flipped, self.keyring))

    def test_demo_fails_then_refuses_then_ready(self) -> None:
        port = Port()
        store = open_store(self)
        controller = Controller(store, self.manifest, port, self.policy, keyring=self.keyring)
        port.view = pull(
            H1,
            tests=(failing_test("registration"),),
            check_rows=baseline(H1),
            requirement_evidence=(evidence("REQ-REG", "registration", H1, "fail"),),
            usage=usage(H1),
        )
        failed = controller.handle(Event("story-fail", 536, H1, "REQ-REG result pass"))
        self.assertEqual(failed.status, RETRY)
        self.assertEqual(failed.assignments, 1)
        self.assertEqual(failed.head_sha, H1)
        self.assertTrue(failed.owner_manifest_authorized)
        self.assertFalse(failed.live_usage_verified)
        self.assertFalse(failed.live_scoped_loop_verified)
        self.assertFalse(failed.live_read_only_transport_verified)
        self.assertEqual(failed.verification_plane, NOT_VERIFIED)
        self.assertEqual(failed.usage_gate, "host_supplied")
        ledger = json.loads((store / "ledger.json").read_text(encoding="utf-8"))
        assignment = ledger["assignments"][0]
        self.assertEqual(assignment["dispatcher"], "simulated")
        self.assertFalse(assignment["live_dispatch"])
        self.assertEqual(assignment["head_sha"], H1)
        kinds = {item["kind"] for item in assignment["findings"]}
        self.assertIn("requirement", kinds)
        self.assertIn("test", kinds)
        self.assertNotIn("REQ-REG result pass", (store / "ledger.json").read_text(encoding="utf-8"))

        port.view = pull(
            H2,
            tests=(passing_test(),),
            check_rows=baseline(H2),
            reviews=both_reviews(H2),
            requirement_evidence=(
                evidence("REQ-REG", "registration", H2, "pass"),
                evidence("REQ-NOTIFY", "notification-review", H2, "pending", "catsec"),
            ),
            usage=usage(H2),
        )
        partial = controller.handle(Event("story-partial", 536, H2))
        self.assertEqual(partial.status, HOLD)
        self.assertEqual(partial.reason, "requirement is unverified")
        self.assertNotEqual(partial.status, READY)
        self.assertEqual(partial.assignments, 1)
        self.assertEqual(partial.head_sha, H2)
        self.assertEqual(partial.verification_plane, NOT_VERIFIED)
        self.assertTrue(partial.owner_manifest_authorized)

        port.view = pull(
            H3,
            tests=(passing_test(),),
            check_rows=baseline(H3),
            reviews=both_reviews(H3),
            requirement_evidence=(
                evidence("REQ-REG", "registration", H3, "pass"),
                evidence("REQ-NOTIFY", "notification-review", H3, "pass", "catsec"),
            ),
            usage=usage(H3),
        )
        done = controller.handle(Event("story-ready", 536, H3))
        self.assertEqual(done.status, READY)
        self.assertEqual(done.reason, "acceptance criteria satisfied in simulation")
        self.assertEqual(done.head_sha, H3)
        self.assertEqual(done.assignments, 1)
        self.assertEqual(done.verification_plane, SIMULATED_PASS)
        self.assertTrue(done.owner_manifest_authorized)
        self.assertFalse(done.live_usage_verified)
        self.assertFalse(done.live_scoped_loop_verified)
        self.assertFalse(done.live_read_only_transport_verified)
        self.assertEqual(done.usage_gate, "host_supplied")
        final = json.loads((store / "ledger.json").read_text(encoding="utf-8"))
        self.assertEqual(final["current_head"], H3)
        self.assertEqual(final["assigned_heads"], [H1])
        recorded = final["trace"][-1]["requirement_results"]
        self.assertEqual(
            [(item["requirement_id"], item["result"], item["head_sha"], item["source"]) for item in recorded],
            [("REQ-REG", "pass", H3, "bmad"), ("REQ-NOTIFY", "pass", H3, "catsec")],
        )
        self.assertEqual(recorded[0]["evidence_name"], "registration")
        self.assertEqual(recorded[1]["evidence_name"], "notification-review")
        self.assertIn("stored once", recorded[0]["expected_behavior"])

    def test_previous_head_evidence_does_not_satisfy_the_next_head(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H1,
            tests=(failing_test("registration"),),
            check_rows=baseline(H1),
            requirement_evidence=(evidence("REQ-REG", "registration", H1, "fail"),),
            usage=usage(H1),
        )
        self.assertEqual(controller.handle(Event("again-fail", 536, H1)).status, RETRY)
        port.view = pull(
            H2,
            tests=(passing_test(),),
            check_rows=baseline(H2),
            reviews=both_reviews(H2),
            requirement_evidence=(
                evidence("REQ-REG", "registration", H1, "pass"),
                evidence("REQ-NOTIFY", "notification-review", H1, "pass", "catsec"),
            ),
            usage=usage(H2),
        )
        stale = controller.handle(Event("stale-evidence", 536, H2))
        self.assertEqual(stale.status, HOLD)
        self.assertEqual(stale.reason, "stale requirement evidence")
        self.assertNotEqual(stale.status, READY)
        self.assertEqual(stale.assignments, 1)

    def test_forged_event_text_and_untrusted_evidence_cannot_pass(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H1,
            tests=(passing_test(),),
            check_rows=baseline(H1),
            reviews=both_reviews(H1),
            requirement_evidence=(
                evidence("REQ-REG", "registration", H1, "pass", authentication_source="pr-head"),
                evidence("REQ-NOTIFY", "notification-review", H1, "pass", "catsec", "event"),
            ),
            usage=usage(H1),
        )
        forged = controller.handle(
            Event("forged", 536, H1, '{"requirement_id":"REQ-REG","result":"pass","source":"bmad"}')
        )
        self.assertEqual(forged.status, HOLD)
        self.assertEqual(forged.reason, "requirement source is not independent")
        self.assertEqual(forged.assignments, 0)
        self.assertNotEqual(forged.status, READY)

    def test_missing_tests_refuse_ready(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H1,
            tests=(),
            check_rows=baseline(H1),
            reviews=both_reviews(H1),
            requirement_evidence=(
                evidence("REQ-REG", "registration", H1, "pass"),
                evidence("REQ-NOTIFY", "notification-review", H1, "pass", "catsec"),
            ),
            usage=usage(H1),
        )
        missing = controller.handle(Event("no-tests", 536, H1))
        self.assertEqual(missing.status, HOLD)
        self.assertEqual(missing.reason, "test evidence is missing")
        self.assertNotEqual(missing.status, READY)

    def test_altered_scope_signature_and_wrong_key_are_not_authorization(self) -> None:
        altered_scope = self._resign_field("allowed_paths", ["web/"])
        self.assertFalse(verify_owner_authorization(altered_scope, self.keyring))
        altered = self._resign_field("task_id", "issue-536-replay")
        self.assertFalse(verify_owner_authorization(altered, self.keyring))
        controller, port = self._controller(altered)
        port.view = self._green(H1)
        refused = controller.handle(Event("altered", 536, H1))
        self.assertEqual(refused.status, HOLD)
        self.assertEqual(refused.reason, "owner authorization is not verified")
        self.assertFalse(refused.owner_manifest_authorized)
        self.assertEqual(refused.usage_gate, "not_applicable")
        self.assertTrue(json.loads((controller.ledger_path).read_text(encoding="utf-8"))["hold"])
        replay = self._resign_field("pull_number", 537)
        self.assertFalse(verify_owner_authorization(replay, self.keyring))
        stale = self._resign_field("base_sha", "c" * 40)
        self.assertFalse(verify_owner_authorization(stale, self.keyring))
        other = Ed25519PrivateKey.generate().public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
        self.assertFalse(verify_owner_authorization(self.manifest, OwnerKeyring({KEY_ID: other})))
        self.assertFalse(verify_owner_authorization(self.manifest, OwnerKeyring({})))
        self.assertFalse(verify_owner_authorization(self.manifest, None))
        unknown = self.manifest.to_dict()
        unknown_auth = unknown["authorization"]
        assert isinstance(unknown_auth, dict)
        unknown_auth["key_id"] = "retired-key"
        parsed = Manifest.from_dict(unknown)
        self.assertFalse(verify_owner_authorization(parsed, self.keyring))

    def test_invalid_signature_and_omitted_security_check(self) -> None:
        body = self.manifest.to_dict()
        authorization = body["authorization"]
        assert isinstance(authorization, dict)
        raw = bytearray(base64.b64decode(str(authorization["signature"])))
        raw[0] ^= 0xFF
        authorization["signature"] = base64.b64encode(bytes(raw)).decode("ascii")
        tampered = Manifest.from_dict(body)
        self.assertEqual(tampered.digest, Manifest.from_dict(tampered.to_dict()).digest)
        self.assertFalse(verify_owner_authorization(tampered, self.keyring))
        with self.assertRaises(ManifestError) as invalid:
            Manifest.from_dict(
                story_raw(
                    authorization={
                        "key_id": KEY_ID,
                        "public_key_sha256": "ab" * 32,
                        "signature": "not-a-signature",
                    }
                )
            )
        self.assertEqual(str(invalid.exception), "owner signature is invalid")
        checks = ["gitguardian", "integration", "regression", "tdd"]
        with self.assertRaises(ManifestError) as removed:
            Manifest.from_dict(story_raw(required_checks=checks))
        self.assertEqual(str(removed.exception), "manifest removes a baseline check")
        added = signed_story(self.private, required_checks=[*checks, "security", "ci"])
        self.assertIn("ci", added[0].required_checks)
        self.assertTrue(verify_owner_authorization(added[0], added[1]))

    def test_unknown_usage_is_not_zero_and_budgets_exhaust(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H1,
            tests=(passing_test(),),
            check_rows=baseline(H1),
            reviews=both_reviews(H1),
            requirement_evidence=self._passes(H1),
            usage=usage(H1, tokens=None),
        )
        unknown = controller.handle(Event("unknown-usage", 536, H1))
        self.assertEqual(unknown.status, HOLD)
        self.assertEqual(unknown.reason, "usage evidence is unknown")
        self.assertEqual(unknown.usage_gate, "unknown")
        self.assertFalse(unknown.live_usage_verified)
        self.assertEqual(unknown.assignments, 0)
        self.assertNotEqual(unknown.status, READY)

        port.view = pull(
            H2,
            tests=(passing_test(),),
            check_rows=baseline(H2),
            reviews=both_reviews(H2),
            requirement_evidence=self._passes(H2),
            usage=usage(H2, tokens=0),
        )
        known_zero = controller.handle(Event("known-zero", 536, H2))
        self.assertEqual(known_zero.status, READY)
        self.assertEqual(known_zero.usage_gate, "host_supplied")
        self.assertFalse(known_zero.live_usage_verified)

    def test_token_time_and_cost_budgets_exhaust_without_sticking(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H1,
            tests=(passing_test(),),
            check_rows=baseline(H1),
            reviews=both_reviews(H1),
            requirement_evidence=self._passes(H1),
            usage=usage(H1, tokens=100_001),
        )
        exhausted = controller.handle(Event("tokens", 536, H1))
        self.assertEqual(exhausted.reason, "token budget exhausted")
        self.assertEqual(exhausted.usage_gate, "exceeded")
        self.assertFalse(exhausted.live_usage_verified)
        self.assertNotEqual(exhausted.status, READY)
        port.view = pull(
            H2,
            tests=(failing_test("registration"),),
            check_rows=baseline(H2),
            requirement_evidence=(evidence("REQ-REG", "registration", H2, "fail"),),
            usage=usage(H2, elapsed=3601),
        )
        self.assertEqual(controller.handle(Event("elapsed", 536, H2)).reason, "elapsed time budget exhausted")
        port.view = pull(
            H3,
            tests=(failing_test("registration"),),
            check_rows=baseline(H3),
            requirement_evidence=(evidence("REQ-REG", "registration", H3, "fail"),),
            usage=usage(H3, cost=501),
        )
        cost = controller.handle(Event("cost", 536, H3))
        self.assertEqual(cost.reason, "cost budget exhausted")
        self.assertEqual(cost.assignments, 0)
        self.assertFalse(json.loads(controller.ledger_path.read_text(encoding="utf-8"))["hold"])

    def test_no_progress_and_repeated_requirement_failure_stick(self) -> None:
        manifest, keyring = signed_story(
            self.private,
            budget={
                "max_corrections": 3,
                "max_elapsed_seconds": 3600,
                "max_tokens": 100_000,
                "max_cost_cents": 500,
                "max_no_progress": 1,
                "max_repeated_failures": 1,
            },
        )
        controller, port = self._controller(manifest, keyring)
        port.view = pull(
            H1,
            tests=(failing_test("registration"),),
            check_rows=baseline(H1),
            requirement_evidence=(evidence("REQ-REG", "registration", H1, "fail"),),
            usage=usage(H1),
        )
        self.assertEqual(controller.handle(Event("np-1", 536, H1)).status, RETRY)
        port.view = pull(
            H2,
            tests=(failing_test("registration"),),
            check_rows=baseline(H2),
            requirement_evidence=(evidence("REQ-REG", "registration", H2, "fail"),),
            usage=usage(H2),
        )
        stalled = controller.handle(Event("np-2", 536, H2))
        self.assertEqual(stalled.reason, "no material progress")
        port.view = pull(
            H3,
            tests=(failing_test("registration"),),
            check_rows=baseline(H3),
            requirement_evidence=(evidence("REQ-REG", "registration", H3, "fail"),),
            usage=usage(H3),
        )
        stuck = controller.handle(Event("np-3", 536, H3))
        self.assertEqual(stuck.reason, "no-progress threshold exhausted")
        self.assertTrue(json.loads(controller.ledger_path.read_text(encoding="utf-8"))["hold"])

        # The same fingerprint stops at no-progress before the repeated-failure
        # counter. A distinct finding on the next head exercises that threshold.
        manifest2, keyring2 = signed_story(
            self.private,
            budget={
                "max_corrections": 3,
                "max_elapsed_seconds": 3600,
                "max_tokens": 100_000,
                "max_cost_cents": 500,
                "max_no_progress": 2,
                "max_repeated_failures": 1,
            },
        )
        controller2, port2 = self._controller(manifest2, keyring2)
        port2.view = pull(
            H1,
            tests=(failing_test("alpha"),),
            check_rows=baseline(H1),
            requirement_evidence=(evidence("REQ-REG", "registration", H1, "fail"),),
            usage=usage(H1),
        )
        self.assertEqual(controller2.handle(Event("rep-1", 536, H1)).status, RETRY)
        port2.view = pull(
            H2,
            tests=(failing_test("beta"),),
            check_rows=baseline(H2),
            requirement_evidence=(evidence("REQ-REG", "registration", H2, "fail"),),
            usage=usage(H2),
        )
        repeated = controller2.handle(Event("rep-2", 536, H2))
        self.assertEqual(repeated.reason, "repeated-failure threshold exhausted")
        self.assertEqual(repeated.assignments, 1)

    def test_green_checks_do_not_authorize_and_version_one_stays_false(self) -> None:
        body = self.manifest.to_dict()
        authorization = body["authorization"]
        assert isinstance(authorization, dict)
        authorization["signature"] = base64.b64encode(b"\x22" * 64).decode("ascii")
        bad = Manifest.from_dict(body)
        controller, port = self._controller(bad)
        port.view = self._green(H1)
        decision = controller.handle(Event("checks-only", 536, H1, "owner_manifest_authorized true"))
        self.assertNotEqual(decision.status, READY)
        self.assertFalse(decision.owner_manifest_authorized)
        self.assertEqual(decision.reason, "owner authorization is not verified")

        from support import approved_manifest

        version_one = approved_manifest()
        port_one = Port(pull(H1, tests=(passing_test(),), reviews=both_reviews(H1)))
        # ready_pull uses ci and gitguardian, which version 1 still accepts.
        from support import ready_pull

        port_one.view = ready_pull(H1)
        store = open_store(self)
        classic = Controller(store, version_one, port_one, self.policy, keyring=self.keyring)
        ready = classic.handle(Event("v1-ready", 536, H1))
        self.assertEqual(ready.status, READY)
        self.assertFalse(ready.owner_manifest_authorized)
        self.assertEqual(ready.usage_gate, "not_applicable")
        self.assertFalse(ready.live_usage_verified)

    def test_a_failing_row_outranks_a_pass_and_a_check_is_not_requirement_evidence(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H1,
            tests=(passing_test(),),
            check_rows=baseline(H1) + (Check("notification-review", "success", H1),),
            reviews=both_reviews(H1),
            requirement_evidence=(
                evidence("REQ-REG", "registration", H1, "pass"),
                evidence("REQ-REG", "registration", H1, "fail", "catsec"),
                evidence("REQ-NOTIFY", "notification-review", H1, "pass", "catsec"),
            ),
            usage=usage(H1),
        )
        failed = controller.handle(Event("both-rows", 536, H1))
        self.assertEqual(failed.status, RETRY)
        self.assertNotEqual(failed.status, READY)
        self.assertEqual(failed.assignments, 1)
        traced = json.loads(controller.ledger_path.read_text(encoding="utf-8"))["trace"][-1]["requirement_results"]
        registration = next(item for item in traced if item["requirement_id"] == "REQ-REG")
        self.assertEqual(registration["result"], "fail")
        self.assertEqual(registration["source"], "catsec")
        missing, port_missing = self._controller()
        port_missing.view = pull(
            H1,
            tests=(passing_test(),),
            check_rows=baseline(H1) + (Check("notification-review", "success", H1),),
            reviews=both_reviews(H1),
            requirement_evidence=(evidence("REQ-REG", "registration", H1, "pass"),),
            usage=usage(H1),
        )
        refused = missing.handle(Event("check-alias", 536, H1))
        self.assertEqual(refused.reason, "requirement evidence is missing")
        self.assertEqual(refused.assignments, 0)

    def test_optional_requirement_failure_does_not_block_ready(self) -> None:
        requirements = list(story_raw()["requirements"])  # type: ignore[arg-type]
        requirements.append(
            {
                "evidence_kind": "review",
                "evidence_name": "optional-note",
                "expected_behavior": "An optional note is recorded when present.",
                "mandatory": False,
                "requirement_id": "NOTE-OPT",
            }
        )
        manifest, keyring = signed_story(self.private, requirements=requirements)
        controller, port = self._controller(manifest, keyring)
        port.view = pull(
            H1,
            tests=(passing_test(),),
            check_rows=baseline(H1),
            reviews=both_reviews(H1),
            requirement_evidence=(
                *self._passes(H1),
                evidence("NOTE-OPT", "optional-note", H1, "fail", "catsec"),
            ),
            usage=usage(H1),
        )
        done = controller.handle(Event("optional", 536, H1))
        self.assertEqual(done.status, READY)
        self.assertEqual(done.assignments, 0)

    def test_a_different_public_key_does_not_rewrite_a_stored_decision(self) -> None:
        controller, port = self._controller()
        port.view = self._green(H1)
        done = controller.handle(Event("stored-ready", 536, H1))
        self.assertEqual(done.status, READY)
        self.assertTrue(done.owner_manifest_authorized)
        other_public = Ed25519PrivateKey.generate().public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)
        revived = Controller(
            controller.store,
            self.manifest,
            Port(),
            self.policy,
            keyring=OwnerKeyring({KEY_ID: other_public}),
        )
        replayed = revived.handle(Event("stored-ready", 536, H1))
        self.assertEqual(replayed.status, READY)
        self.assertTrue(replayed.owner_manifest_authorized)
        self.assertFalse(replayed.live_usage_verified)
        self.assertEqual(replayed.usage_gate, "host_supplied")
        blocked = revived.handle(Event("other-key", 536, H1))
        self.assertEqual(blocked.reason, "owner public key does not match the store")
        self.assertEqual(blocked.assignments, 0)
        ledger = json.loads(controller.ledger_path.read_text(encoding="utf-8"))
        self.assertFalse(ledger["hold"])
        self.assertEqual(ledger["status"], READY)
        self.assertEqual(len(ledger["trace"]), 1)

    def test_a_secret_hold_does_not_claim_accepted_usage(self) -> None:
        controller, _port = self._controller()
        # Split so the fixture does not contain one contiguous credential literal.
        secret = "gh" + "p_" + ("a" * 36)
        decision = controller.handle(Event("secret-usage", 536, H1, secret))
        self.assertEqual(decision.status, HOLD)
        self.assertEqual(decision.usage_gate, "not_applicable")
        self.assertNotEqual(decision.usage_gate, "host_supplied")
        ledger = controller.ledger_path.read_text(encoding="utf-8")
        self.assertNotIn(secret, ledger)

    def test_controller_package_does_not_mint_signatures(self) -> None:
        text = "\n".join(path.read_text(encoding="utf-8") for path in PACKAGE.glob("*.py"))
        self.assertNotIn("Ed25519PrivateKey", text)
        self.assertNotIn("PrivateKey", text)
        self.assertNotIn(".generate(", text)

    def test_manifest_rejects_unknown_budget_and_out_of_range_usage(self) -> None:
        budget = dict(story_raw()["budget"])  # type: ignore[arg-type]
        budget["elapsed_seconds"] = 10
        with self.assertRaises(ManifestError):
            Manifest.from_dict(story_raw(budget=budget))
        budget = dict(story_raw()["budget"])  # type: ignore[arg-type]
        budget["max_tokens"] = 0
        with self.assertRaises(ManifestError) as caught:
            Manifest.from_dict(story_raw(budget=budget))
        self.assertEqual(str(caught.exception), "execution budget is outside its allowed range")

    def test_stale_usage_evidence_is_unknown_rather_than_zero(self) -> None:
        controller, port = self._controller()
        port.view = pull(
            H2,
            tests=(passing_test(),),
            check_rows=baseline(H2),
            reviews=both_reviews(H2),
            requirement_evidence=self._passes(H2),
            usage=usage(H1),
        )
        stale = controller.handle(Event("stale-usage", 536, H2))
        self.assertEqual(stale.reason, "stale usage evidence")
        self.assertEqual(stale.usage_gate, "unknown")
        self.assertFalse(stale.live_usage_verified)

    def _green(self, head: str):
        return pull(
            head,
            tests=(passing_test(),),
            check_rows=baseline(head),
            reviews=both_reviews(head),
            requirement_evidence=self._passes(head),
            usage=usage(head),
        )

    def _passes(self, head: str) -> tuple[RequirementEvidence, RequirementEvidence]:
        return (
            evidence("REQ-REG", "registration", head, "pass"),
            evidence("REQ-NOTIFY", "notification-review", head, "pass", "catsec"),
        )

    def _resign_field(self, key: str, value: object) -> Manifest:
        body = self.manifest.to_dict()
        body[key] = value
        return Manifest.from_dict(body)

    def _controller(
        self,
        manifest: Manifest | None = None,
        keyring: OwnerKeyring | None = None,
    ) -> tuple[Controller, Port]:
        port = Port()
        store = open_store(self)
        controller = Controller(
            store,
            manifest or self.manifest,
            port,
            self.policy,
            keyring=self.keyring if keyring is None else keyring,
        )
        return controller, port


if __name__ == "__main__":
    unittest.main()
