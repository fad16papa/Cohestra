"""Parser and judge tests for trusted evidence. No network."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from urllib import request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from correction.trust_evidence import (
    ACTIONS_UNCONFIRMED,
    BINDING_MISMATCH,
    CHECKS_UNTRUSTED,
    COMPARE_INCOMPLETE,
    MATERIAL_INVALID,
    MATERIAL_MISSING,
    NOT_ENABLED,
    REVIEW_MISSING,
    REVIEW_UNTRUSTED,
    SCOPE_OUTSIDE,
    WORKFLOW_PATH,
    TrustConfig,
    parse_check_page,
    parse_compare,
    parse_config,
    parse_event,
    parse_manifest_bytes,
    required_checks_hold,
    reviewer_hold,
    scope_holds,
    signature_holds,
)
from correction.trust_evaluator import GitHubReadTransport
from trust_support import BASE, BMAD_CHECK, BMAD_ID, HEAD, World, default_runs


def _runs():
    _total, rows, reason = parse_check_page({"total_count": 7, "check_runs": default_runs()})
    assert reason is None
    return rows


class TrustEvidenceTest(unittest.TestCase):
    def test_event_and_config_reject_bad_material(self) -> None:
        claim, reason = parse_event({"EVENT_NAME": "pull_request", "EVENT_ID": "1", "REPOSITORY": "a/b", "PULL_NUMBER": "1", "CLAIMED_HEAD_SHA": HEAD})
        self.assertIsNone(claim)
        self.assertEqual(reason, "event fields are invalid")
        world = World()
        parsed, config_reason = parse_config(world.env())
        self.assertIsNone(config_reason)
        assert parsed is not None
        self.assertEqual(parsed.bmad_app_id, BMAD_ID)
        disabled = world.env()
        disabled["COHESTRA_TRUST_EVALUATOR_ENABLED"] = "True"
        self.assertEqual(parse_config(disabled)[1], NOT_ENABLED)
        missing = world.env()
        del missing["COHESTRA_OWNER_PUBLIC_KEY"]
        self.assertEqual(parse_config(missing)[1], MATERIAL_MISSING)
        bad_key = world.env()
        bad_key["COHESTRA_OWNER_PUBLIC_KEY_SHA256"] = "ab" * 32
        self.assertEqual(parse_config(bad_key)[1], MATERIAL_INVALID)
        same = world.env()
        same["COHESTRA_REVIEW_APP_CATSEC_ID"] = same["COHESTRA_REVIEW_APP_BMAD_ID"]
        self.assertEqual(parse_config(same)[1], MATERIAL_INVALID)
        actions = world.env()
        actions["COHESTRA_REVIEW_APP_BMAD_ID"] = "15368"
        self.assertEqual(parse_config(actions)[1], MATERIAL_INVALID)
        named = world.env()
        named["COHESTRA_REVIEW_CATSEC_CHECK_NAME"] = named["COHESTRA_REVIEW_BMAD_CHECK_NAME"]
        self.assertEqual(parse_config(named)[1], MATERIAL_INVALID)

    def test_manifest_rejects_duplicates_nonfinite_and_oversize(self) -> None:
        world = World()
        manifest, reason = parse_manifest_bytes(world.manifest_bytes())
        self.assertIsNone(reason)
        assert manifest is not None
        raw = world.manifest_bytes().decode("utf-8")
        duplicate = raw.replace('"task_id":', '"task_id":"other","task_id":', 1)
        self.assertEqual(parse_manifest_bytes(duplicate.encode("utf-8"))[1], "manifest is invalid")
        nan = raw.replace('"max_corrections":3', '"max_corrections":NaN', 1)
        self.assertEqual(parse_manifest_bytes(nan.encode("utf-8"))[1], "manifest is invalid")
        self.assertEqual(parse_manifest_bytes(b"{" + b" " * 70000)[1], "manifest is invalid")
        self.assertIsNone(signature_holds(manifest, _config(world)))

    def test_reviewers_and_checks_reject_untrusted_rows(self) -> None:
        world = World()
        manifest, _reason = parse_manifest_bytes(world.manifest_bytes())
        assert manifest is not None
        config = _config(world, manifest)
        runs = _runs()
        self.assertIsNone(reviewer_hold(runs, config, HEAD, "owner-author"))
        self.assertEqual(reviewer_hold(runs, config, HEAD, "cohestra-bmad[bot]"), REVIEW_UNTRUSTED)
        stale = tuple(run for run in runs if run.name != BMAD_CHECK)
        self.assertEqual(reviewer_hold(stale, config, HEAD, "owner-author"), REVIEW_MISSING)
        hidden = list(runs)
        hidden.append(type(runs[0])(BMAD_CHECK, BMAD_ID, "cohestra-bmad", HEAD, "completed", "failure"))
        self.assertEqual(reviewer_hold(tuple(hidden), config, HEAD, "owner-author"), REVIEW_UNTRUSTED)
        self.assertIsNone(required_checks_hold(runs, manifest, config, HEAD))
        mapped = dict(config.checks_map)
        mapped["tdd"] = ("TDD", 15368)
        pinned = TrustConfig(
            config.key_id,
            config.public_key,
            config.fingerprint,
            config.task_id,
            config.bmad_app_id,
            config.catsec_app_id,
            config.bmad_check_name,
            config.catsec_check_name,
            mapped,
        )
        self.assertEqual(required_checks_hold(runs, manifest, pinned, HEAD), ACTIONS_UNCONFIRMED)
        foreign = list(runs)
        foreign.append(type(runs[0])("TDD", 15368, "github-actions", HEAD, "completed", "success"))
        self.assertEqual(required_checks_hold(tuple(foreign), manifest, config, HEAD), CHECKS_UNTRUSTED)
        skipped = [run if run.name != "TDD" else type(run)(run.name, run.app_id, run.slug, run.head_sha, "completed", "skipped") for run in runs]
        self.assertEqual(required_checks_hold(tuple(skipped), manifest, config, HEAD), CHECKS_UNTRUSTED)

    def test_compare_scope_and_transport_guard(self) -> None:
        world = World()
        manifest, _reason = parse_manifest_bytes(world.manifest_bytes())
        assert manifest is not None
        files, reason = parse_compare(
            {"status": "ahead", "behind_by": 0, "merge_base_commit": {"sha": BASE}, "files": world.files},
            _facts(),
        )
        self.assertIsNone(reason)
        self.assertIsNone(scope_holds(files, manifest))
        outside, _outside_reason = parse_compare(
            {"status": "ahead", "behind_by": 0, "merge_base_commit": {"sha": BASE}, "files": [{"filename": "src/App.tsx", "status": "modified"}]},
            _facts(),
        )
        self.assertEqual(scope_holds(outside, manifest), SCOPE_OUTSIDE)
        workflow, _workflow_reason = parse_compare(
            {
                "status": "ahead",
                "behind_by": 0,
                "merge_base_commit": {"sha": BASE},
                "files": [{"filename": ".github/workflows/ci.yml", "status": "modified"}],
            },
            _facts(),
        )
        self.assertEqual(scope_holds(workflow, manifest), WORKFLOW_PATH)
        renamed, rename_reason = parse_compare(
            {
                "status": "ahead",
                "behind_by": 0,
                "merge_base_commit": {"sha": BASE},
                "files": [{"filename": "correction/new.py", "status": "renamed", "previous_filename": "src/old.py"}],
            },
            _facts(),
        )
        self.assertIsNone(rename_reason)
        self.assertEqual(scope_holds(renamed, manifest), SCOPE_OUTSIDE)
        _missing, missing_reason = parse_compare(
            {
                "status": "ahead",
                "behind_by": 0,
                "merge_base_commit": {"sha": BASE},
                "files": [{"filename": "correction/new.py", "status": "renamed"}],
            },
            _facts(),
        )
        self.assertEqual(missing_reason, COMPARE_INCOMPLETE)
        capped = [{"filename": f"correction/{index}.py", "status": "modified"} for index in range(300)]
        _ignored, cap_reason = parse_compare(
            {"status": "ahead", "behind_by": 0, "merge_base_commit": {"sha": BASE}, "files": capped},
            _facts(300),
        )
        self.assertEqual(cap_reason, COMPARE_INCOMPLETE)
        _renamed, rename_reason = parse_compare(
            {
                "status": "diverged",
                "behind_by": 1,
                "merge_base_commit": {"sha": BASE},
                "files": [{"filename": "correction/a.py", "status": "renamed"}],
            },
            _facts(),
        )
        self.assertEqual(rename_reason, COMPARE_INCOMPLETE)
        with self.assertRaises(Exception):
            from correction.trust_evidence import refuse_unless_get

            refuse_unless_get("https://example.com/repos/a/b/pulls/1")
        opened: list[str] = []

        class Opener(request.OpenerDirector):
            def open(self, req: request.Request, timeout: float | None = None) -> object:
                opened.append(req.full_url)
                raise AssertionError("network")

        transport = GitHubReadTransport("token", Opener())
        with self.assertRaises(Exception):
            transport.get("http://127.0.0.1/repos/a/b/pulls/1")
        self.assertEqual(opened, [])
        self.assertNotIn("host-verified", Path(trust_source("trust_evidence.py")).read_text(encoding="utf-8"))
        self.assertNotIn("Ed25519PrivateKey", Path(trust_source("trust_evidence.py")).read_text(encoding="utf-8"))

    def test_uppercase_role_token_is_not_a_reviewer_name(self) -> None:
        payload = {"total_count": 1, "check_runs": [{"name": "BMAD", "head_sha": HEAD, "status": "completed", "conclusion": "success", "app": {"id": BMAD_ID, "slug": "cohestra-bmad"}, "output": {"summary": "CAT-SEC"}}]}
        _total, rows, reason = parse_check_page(payload)
        self.assertIsNone(reason)
        world = World()
        manifest, _parsed = parse_manifest_bytes(world.manifest_bytes())
        assert manifest is not None
        self.assertEqual(reviewer_hold(rows, _config(world, manifest), HEAD, "owner-author"), REVIEW_MISSING)


def _config(world: World, manifest: object | None = None) -> TrustConfig:
    parsed, reason = parse_config(world.env())
    assert parsed is not None and reason is None
    if manifest is not None:
        self_check = signature_holds(manifest, parsed)  # type: ignore[arg-type]
        assert self_check is None
    return parsed


def _facts(changed: int = 1):
    from correction.trust_evidence import PullFacts

    return PullFacts(536, "open", changed, "owner-author", HEAD, "fad16papa/Cohestra", BASE, "main", "fad16papa/Cohestra")


def trust_source(name: str) -> Path:
    return Path(__file__).resolve().parents[1] / "correction" / name


class BindingTest(unittest.TestCase):
    def test_binding_is_exact(self) -> None:
        from correction.trust_evidence import PullFacts, binding_holds

        world = World()
        manifest, reason = parse_manifest_bytes(world.manifest_bytes())
        assert manifest is not None and reason is None
        facts = PullFacts(536, "open", 1, "other-author", HEAD, "fad16papa/Cohestra", BASE, "main", "fad16papa/Cohestra")
        self.assertEqual(binding_holds(manifest, facts, _config(world)), BINDING_MISMATCH)
        self.assertIsNone(signature_holds(manifest, _config(world)))


if __name__ == "__main__":
    unittest.main()
