"""Parser and judge tests for trusted evidence. No network."""

from __future__ import annotations

import json
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
    CheckPin,
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
from trust_support import BASE, BMAD_CHECK, BMAD_ID, HEAD, OTHER, REPO, World, default_runs, run


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
        mapped["tdd"] = CheckPin("TDD", 15368)
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

    def test_actions_provenance_rejects_forged_stale_skipped_duplicate_and_untrusted(self) -> None:
        world = World()
        manifest, _reason = parse_manifest_bytes(world.manifest_bytes())
        assert manifest is not None
        config = _actions_config(world, manifest)
        trusted = _ci_workflow_bytes()
        proof = _actions_proof(trusted)
        self.assertIsNone(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=proof)
        )
        pushed = _actions_proof(trusted, event="push")
        self.assertIsNone(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=pushed)
        )

        forged = _actions_proof(trusted, suite=99)
        self.assertEqual(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=forged),
            CHECKS_UNTRUSTED,
        )
        forged_url = _actions_rows(details_repo="attacker/Cohestra")
        self.assertEqual(
            required_checks_hold(forged_url, manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=proof),
            CHECKS_UNTRUSTED,
        )
        stale_run = _actions_proof(trusted, run_head=OTHER)
        self.assertEqual(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=stale_run),
            CHECKS_UNTRUSTED,
        )
        stale = _actions_rows(tdd_head=OTHER)
        self.assertEqual(
            required_checks_hold(stale, manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=proof),
            CHECKS_UNTRUSTED,
        )
        skipped = _actions_rows(conclusion="skipped")
        self.assertEqual(
            required_checks_hold(skipped, manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=proof),
            CHECKS_UNTRUSTED,
        )
        duplicate = _actions_rows() + _actions_rows(run_id=78, suite=89, conclusion="failure")
        self.assertEqual(
            required_checks_hold(duplicate, manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=proof),
            CHECKS_UNTRUSTED,
        )
        wrong = _actions_proof(trusted, path=".github/workflows/other.yml")
        self.assertEqual(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=wrong),
            CHECKS_UNTRUSTED,
        )
        reused = _actions_proof(trusted, referenced=[{"path": ".github/workflows/other.yml", "sha": HEAD}])
        self.assertEqual(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=reused),
            CHECKS_UNTRUSTED,
        )
        dispatched = _actions_proof(trusted, event="workflow_dispatch")
        self.assertEqual(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=dispatched),
            CHECKS_UNTRUSTED,
        )
        changed = _actions_proof(trusted, head_file=trusted + b"\n")
        self.assertEqual(
            required_checks_hold(_actions_rows(), manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=changed),
            CHECKS_UNTRUSTED,
        )
        writable = trusted.replace(b"contents: read", b"checks: write")
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(writable, head_file=writable),
            ),
            CHECKS_UNTRUSTED,
        )
        quoted = trusted.replace(b"contents: read", b'"checks": write')
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(quoted, head_file=quoted),
            ),
            CHECKS_UNTRUSTED,
        )
        aliased = b"x: &level write-all\npermissions: *level\n"
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(aliased, head_file=aliased),
            ),
            CHECKS_UNTRUSTED,
        )
        quoted_block = (
            b"name: ci\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  test:\n"
            b"    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n    \"permissions\":\n      checks: write\n"
        )
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(quoted_block, head_file=quoted_block),
            ),
            CHECKS_UNTRUSTED,
        )
        escaped = (
            b"name: ci\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  test:\n"
            b"    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n"
            b"    \"permiss\\u0069ons\":\n      checks: \"\\u0077rite\"\n"
        )
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(escaped, head_file=escaped),
            ),
            CHECKS_UNTRUSTED,
        )
        spaced = trusted.replace(b"permissions:", b"permissions :")
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(spaced, head_file=spaced),
            ),
            CHECKS_UNTRUSTED,
        )
        job_write = trusted.replace(
            b"    runs-on: ubuntu-latest\n",
            b"    permissions:\n      checks: write\n    runs-on: ubuntu-latest\n",
        )
        self.assertNotEqual(job_write, trusted)
        self.assertEqual(
            required_checks_hold(
                _actions_rows(),
                manifest,
                config,
                HEAD,
                repository=REPO,
                base_sha=BASE,
                proof=_actions_proof(job_write, head_file=job_write),
            ),
            CHECKS_UNTRUSTED,
        )
        foreign = _actions_rows() + _parsed([run("TDD", 9001, "cohestra-ci")])
        self.assertEqual(
            required_checks_hold(foreign, manifest, config, HEAD, repository=REPO, base_sha=BASE, proof=proof),
            CHECKS_UNTRUSTED,
        )
        bare = world.env()
        mapped = json.loads(bare["COHESTRA_REQUIRED_CHECKS_MAP"])
        mapped["tdd"]["workflow"] = ".github/workflows/../ci.yml"
        bare["COHESTRA_REQUIRED_CHECKS_MAP"] = json.dumps(mapped)
        self.assertEqual(parse_config(bare)[1], MATERIAL_INVALID)
        other_app = world.env()
        mapped = json.loads(other_app["COHESTRA_REQUIRED_CHECKS_MAP"])
        mapped["tdd"]["workflow"] = ".github/workflows/ci.yml"
        other_app["COHESTRA_REQUIRED_CHECKS_MAP"] = json.dumps(mapped)
        self.assertEqual(parse_config(other_app)[1], MATERIAL_INVALID)
        accepted = world.env()
        mapped = json.loads(accepted["COHESTRA_REQUIRED_CHECKS_MAP"])
        mapped["tdd"] = {"name": "TDD", "app_id": 15368, "workflow": _ACTIONS_WORKFLOW}
        accepted["COHESTRA_REQUIRED_CHECKS_MAP"] = json.dumps(mapped)
        parsed, accepted_reason = parse_config(accepted)
        self.assertIsNone(accepted_reason)
        assert parsed is not None
        self.assertEqual(parsed.checks_map["tdd"].workflow, _ACTIONS_WORKFLOW)
        self.assertIsNone(parsed.checks_map["gitguardian"].workflow)

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


_CI_WORKFLOW = Path(__file__).resolve().parents[4] / ".github" / "workflows" / "correction-controller-tests.yml"
_ACTIONS_WORKFLOW = ".github/workflows/correction-controller-tests.yml"


class _Proof:
    def __init__(
        self,
        runs: dict[int, dict[str, object]],
        files: dict[tuple[str, str], bytes],
    ) -> None:
        self.runs = runs
        self.files = files

    def workflow_run(self, run_id: int) -> dict[str, object] | None:
        return self.runs.get(run_id)

    def workflow_file(self, path: str, sha: str) -> bytes | None:
        return self.files.get((path, sha))


def _ci_workflow_bytes() -> bytes:
    return _CI_WORKFLOW.read_bytes()


def _parsed(rows: list[dict[str, object]]):
    _total, parsed, reason = parse_check_page({"total_count": len(rows), "check_runs": rows})
    assert reason is None
    return parsed


def _actions_rows(
    *,
    head: str = HEAD,
    conclusion: str = "success",
    run_id: int = 77,
    suite: int = 88,
    details_repo: str = REPO,
    tdd_head: str | None = None,
):
    rows = [row for row in default_runs(head) if row["name"] != "TDD"]
    rows.append(
        run(
            "TDD",
            15368,
            "github-actions",
            head=head if tdd_head is None else tdd_head,
            conclusion=conclusion,
            details_url=f"https://github.com/{details_repo}/actions/runs/{run_id}/job/90",
            suite=suite,
        )
    )
    return _parsed(rows)


def _actions_proof(
    base_file: bytes,
    *,
    head_file: bytes | None = None,
    event: str = "pull_request",
    path: str = _ACTIONS_WORKFLOW,
    suite: int = 88,
    run_id: int = 77,
    run_head: str = HEAD,
    referenced: list[object] | None = None,
) -> _Proof:
    payload = {
        "check_suite_id": suite,
        "conclusion": "success",
        "event": event,
        "head_repository": {"full_name": REPO},
        "head_sha": run_head,
        "id": run_id,
        "path": path,
        "referenced_workflows": [] if referenced is None else referenced,
        "status": "completed",
    }
    files = {(_ACTIONS_WORKFLOW, HEAD): base_file if head_file is None else head_file, (_ACTIONS_WORKFLOW, BASE): base_file}
    return _Proof({run_id: payload}, files)


def _actions_config(world: World, manifest: object) -> TrustConfig:
    config = _config(world, manifest)
    mapped = dict(config.checks_map)
    mapped["tdd"] = CheckPin("TDD", 15368, _ACTIONS_WORKFLOW)
    return TrustConfig(
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
