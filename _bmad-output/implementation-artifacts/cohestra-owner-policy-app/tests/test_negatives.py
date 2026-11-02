#!/usr/bin/env python3
"""Fail-closed negative cases for the Owner-Policy evaluator.

No case may conclude success/neutral/skipped when authorization is missing.
"""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from owner_policy.attestation import Comment, compute_mac  # noqa: E402
from owner_policy.check_run import github_check_body  # noqa: E402
from owner_policy.conclusions import CheckConclusion  # noqa: E402
from owner_policy.evaluate import EvaluationRequest, evaluate  # noqa: E402
from owner_policy.policy import load_policy  # noqa: E402

SECRET = "owner-held-hmac-secret-not-in-cursor"
REPO = "fad16papa/Cohestra"
HEAD = "ade3c8281e8a2ec82ef45771bc5b68df64901a41"
PARENT = "6e8388eef944a0fe95f1218502cac49681a60dd2"
OWNER_APP_ID = 999001
FAKE_BLOB = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def _mac(sha: str = HEAD, pr: int = 542, base: str = "release/uat") -> str:
    policy = load_policy()
    return compute_mac(
        SECRET,
        repo=REPO,
        pull_number=pr,
        sha=sha,
        base_ref=base,
        version=policy.hmac_canonical_version,
    )


def _owner_comment(sha: str = HEAD, pr: int = 542, base: str = "release/uat") -> Comment:
    return Comment(
        login="fad16papa",
        user_type="User",
        body=f"OWNER_APPROVE_CONTROL_PLANE sha={sha} mac={_mac(sha, pr, base)}",
    )


def _blobs(paths: tuple[str, ...]) -> dict[str, str]:
    return {p: FAKE_BLOB for p in paths}


def _req(**overrides: object) -> EvaluationRequest:
    policy = load_policy()
    approved = tuple(sorted(policy.sync_approved_paths))
    base = {
        "repo": REPO,
        "pull_number": 542,
        "head_sha": HEAD,
        "base_ref": "release/uat",
        "dest_parent_sha": PARENT,
        "changed_paths": (".github/workflows/ci.yml",),
        "source_blobs": _blobs(approved),
        "dest_blobs": _blobs(approved),
        "comments": (_owner_comment(),),
        "hmac_secret": SECRET,
        "posting_integration_id": OWNER_APP_ID,
        "expected_integration_id": OWNER_APP_ID,
        "check_name": "AD25-Owner-Policy",
        "merge_base_sha": PARENT,
        "source_ref": "9ccca77e7297dc28b0a843d3435e9603dc803da7",
        "dest_ref": HEAD,
    }
    base.update(overrides)
    return EvaluationRequest(**base)  # type: ignore[arg-type]


def _assert_failure(test: unittest.TestCase, result, needle: str) -> None:
    test.assertEqual(result.conclusion, CheckConclusion.FAILURE)
    test.assertNotIn(result.conclusion.value, {"neutral", "skipped", "success"})
    body = github_check_body(result, HEAD)
    test.assertEqual(body["conclusion"], "failure")
    test.assertEqual(body["name"], "AD25-Owner-Policy")
    joined = " ".join(result.reasons)
    test.assertIn(needle, joined)


class FailClosedNegatives(unittest.TestCase):
    def test_happy_dest_sync(self) -> None:
        result = evaluate(_req())
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "dest_sync")

    def test_happy_feature(self) -> None:
        result = evaluate(
            _req(
                changed_paths=("docs/readme.md",),
                comments=(),
                hmac_secret=None,
                dest_parent_sha=None,
                merge_base_sha=None,
                source_ref=None,
                dest_ref=None,
                source_blobs={},
                dest_blobs={},
                base_ref="main",
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "feature")

    def test_cursor_installation_token_does_not_mint_success(self) -> None:
        # Evaluator never grants merge. A cursor[bot] comment is ignored;
        # without owner HMAC the check stays failure, so a pinned ruleset
        # blocks the installation-token merge.
        result = evaluate(
            _req(
                comments=(
                    Comment(
                        login="cursor[bot]",
                        user_type="Bot",
                        body=f"OWNER_APPROVE_CONTROL_PLANE sha={HEAD} mac={_mac()}",
                    ),
                ),
                requesting_merge_actor="cursor[bot]",
                requesting_merge_actor_type="Bot",
            )
        )
        _assert_failure(self, result, "missing owner HMAC attestation")

    def test_user_authorized_token_comment_without_hmac(self) -> None:
        result = evaluate(
            _req(
                comments=(
                    Comment(
                        login="fad16papa",
                        user_type="User",
                        body=f"OWNER_APPROVE_CONTROL_PLANE sha={HEAD}",
                    ),
                )
            )
        )
        _assert_failure(self, result, "without HMAC")

    def test_pr_head_workflow_check_name_spoof(self) -> None:
        result = evaluate(_req(spoof_integration_id=15368, check_name="AD25-Owner-Policy"))
        _assert_failure(self, result, "15368")

    def test_cursor_app_check_name_spoof(self) -> None:
        result = evaluate(_req(spoof_integration_id=1210556))
        _assert_failure(self, result, "1210556")

    def test_incorrect_integration_id(self) -> None:
        result = evaluate(_req(posting_integration_id=15368))
        _assert_failure(self, result, "does not match the pinned")

    def test_unpinned_integration_id(self) -> None:
        result = evaluate(_req(expected_integration_id=None))
        _assert_failure(self, result, "not pinned")

    def test_missing_attestation(self) -> None:
        result = evaluate(_req(comments=()))
        _assert_failure(self, result, "missing owner HMAC")

    def test_stale_attestation_sha(self) -> None:
        old = "9ccca77e7297dc28b0a843d3435e9603dc803da7"
        result = evaluate(
            _req(
                comments=(_owner_comment(sha=old),),
            )
        )
        _assert_failure(self, result, "does not match current HEAD")

    def test_changed_pr_head_invalidates_mac(self) -> None:
        new_head = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        result = evaluate(_req(head_sha=new_head, comments=(_owner_comment(sha=HEAD),)))
        _assert_failure(self, result, "does not match current HEAD")

    def test_modified_allowlist_outside_approved_set(self) -> None:
        result = evaluate(
            _req(changed_paths=(".github/workflows/deploy-production.yml",))
        )
        _assert_failure(self, result, "forbidden control-plane path")

    def test_missing_destination_parent(self) -> None:
        result = evaluate(_req(dest_parent_sha=None))
        _assert_failure(self, result, "destination parent SHA")

    def test_stale_destination_parent_not_ancestor(self) -> None:
        result = evaluate(_req(merge_base_sha="ffffffffffffffffffffffffffffffffffffffff"))
        _assert_failure(self, result, "not a descendant")

    def test_unexpected_control_plane_paths(self) -> None:
        result = evaluate(_req(changed_paths=("deploy/evil-sync.sh",)))
        _assert_failure(self, result, "unexpected control-plane paths")

    def test_missing_blob_evidence(self) -> None:
        result = evaluate(_req(source_blobs={}, dest_blobs={}))
        _assert_failure(self, result, "missing blob evidence")

    def test_blob_mismatch(self) -> None:
        policy = load_policy()
        dest = _blobs(tuple(policy.sync_approved_paths))
        dest[".github/workflows/ci.yml"] = "cccccccccccccccccccccccccccccccccccccccc"
        result = evaluate(_req(dest_blobs=dest))
        _assert_failure(self, result, "blob mismatch")

    def test_app_failure_unknown_exception_is_failure(self) -> None:
        result = evaluate(_req(check_name=""))  # type: ignore[arg-type]
        self.assertEqual(result.conclusion, CheckConclusion.FAILURE)

    def test_missing_hmac_secret_fails_closed(self) -> None:
        result = evaluate(_req(hmac_secret=None))
        _assert_failure(self, result, "attestation secret missing")

    def test_production_environment_access_refused(self) -> None:
        result = evaluate(_req(requested_environments=("production", "uat")))
        _assert_failure(self, result, "must not access Environments")

    def test_secret_access_refused(self) -> None:
        result = evaluate(_req(requested_secret_names=("DROPLET_SSH_KEY", "PROD_TOKEN")))
        _assert_failure(self, result, "must not access secrets")

    def test_wrong_check_name_refused(self) -> None:
        result = evaluate(_req(check_name="CI"))
        _assert_failure(self, result, "check name mismatch")

    def test_policy_expansion_on_uat_without_being_dest_sync_blobs(self) -> None:
        # Expansion files on release/uat still require dest-sync exact-tree.
        policy = load_policy()
        paths = tuple(sorted(policy.sync_approved_paths | policy.expansion_paths))
        result = evaluate(
            _req(
                changed_paths=("deploy/ad25-owner-policy.json",),
                source_blobs=_blobs(paths),
                dest_blobs=_blobs(paths),
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "dest_sync")

    def test_application_feature_pr_succeeds(self) -> None:
        result = evaluate(
            _req(
                base_ref="main",
                changed_paths=("src/Api/Program.cs", "web/package.json"),
                comments=(),
                hmac_secret=None,
                dest_parent_sha=None,
                merge_base_sha=None,
                source_ref=None,
                dest_ref=None,
                source_blobs={},
                dest_blobs={},
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "feature")

    def test_mixed_control_plane_and_application_fails(self) -> None:
        result = evaluate(
            _req(changed_paths=(".github/workflows/ci.yml", "src/Api/Program.cs"))
        )
        _assert_failure(self, result, "mixed control-plane")

    def test_hmac_base_mismatch_fails(self) -> None:
        result = evaluate(_req(comments=(_owner_comment(base="main"),)))
        _assert_failure(self, result, "attestation MAC is invalid")

    def test_policy_expansion_on_main(self) -> None:
        result = evaluate(
            _req(
                base_ref="main",
                dest_parent_sha=None,
                merge_base_sha=None,
                dest_ref=None,
                source_ref=None,
                comments=(_owner_comment(base="main"),),
                changed_paths=("deploy/ad25-owner-policy.json",),
                source_blobs={},
                dest_blobs={},
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "policy_expansion")


if __name__ == "__main__":
    os.chdir(ROOT)
    unittest.main()
