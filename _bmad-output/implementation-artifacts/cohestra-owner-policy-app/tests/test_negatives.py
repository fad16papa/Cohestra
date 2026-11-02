#!/usr/bin/env python3
"""Fail-closed cases for the Owner-Policy evaluator.

Snapshots are simulated GitHub reads. They do not prove a live ruleset pin.
No case may conclude success, neutral, or skipped when authorization is missing.
A valid HMAC is account binding, not proof of human presence.
"""

from __future__ import annotations

import io
import os
import sys
import unittest
from contextlib import redirect_stdout
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from owner_policy.attestation import Comment, compute_mac  # noqa: E402
from owner_policy.check_run import CheckPostError, github_check_body  # noqa: E402
from owner_policy.conclusions import CheckConclusion  # noqa: E402
from owner_policy.evidence import GitHubSnapshot, confirm_published_check, evaluate_snapshot  # noqa: E402
from owner_policy.evidence import EvidenceError  # noqa: E402
from owner_policy.mac import main as mac_main  # noqa: E402
from owner_policy.policy import load_policy  # noqa: E402

SECRET = "owner-held-hmac-secret-not-in-cursor"
NEXT_SECRET = "owner-held-hmac-secret-rotated-value"
REPO = "fad16papa/Cohestra"
HEAD = "ade3c8281e8a2ec82ef45771bc5b68df64901a41"
PARENT = "6e8388eef944a0fe95f1218502cac49681a60dd2"
SOURCE = "9ccca77e7297dc28b0a843d3435e9603dc803da7"
OWNER_APP_ID = 999001
FAKE_BLOB = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
NOW = 1_700_000_000


def _mac(
    sha: str = HEAD,
    pr: int = 542,
    base: str = "release/uat",
    ts: int = NOW,
    secret: str = SECRET,
    repo: str = REPO,
) -> str:
    policy = load_policy()
    return compute_mac(
        secret,
        repo=repo,
        pull_number=pr,
        sha=sha,
        base_ref=base,
        ts=ts,
        version=policy.hmac_canonical_version,
    )


def _owner_comment(
    sha: str = HEAD,
    pr: int = 542,
    base: str = "release/uat",
    ts: int = NOW,
    secret: str = SECRET,
    repo: str = REPO,
    created_at: int | None = None,
    updated_at: int | None = None,
    deleted: bool = False,
    body: str | None = None,
) -> Comment:
    stamp = ts if created_at is None else created_at
    revised = stamp if updated_at is None else updated_at
    text = body or f"OWNER_APPROVE_CONTROL_PLANE sha={sha} ts={ts} mac={_mac(sha, pr, base, ts, secret, repo)}"
    return Comment(
        login="fad16papa",
        user_type="User",
        body=text,
        created_at=stamp,
        updated_at=revised,
        deleted=deleted,
    )


def _blobs(paths: tuple[str, ...]) -> dict[str, str]:
    return {path: FAKE_BLOB for path in paths}


def _snap(**overrides: object) -> GitHubSnapshot:
    policy = load_policy()
    approved = tuple(sorted(policy.sync_approved_paths))
    base: dict[str, object] = {
        "repo": REPO,
        "pull_number": 542,
        "head_sha": HEAD,
        "base_ref": "release/uat",
        "files": (".github/workflows/ci.yml",),
        "files_complete": True,
        "comments": (_owner_comment(),),
        "comments_complete": True,
        "app_integration_id": OWNER_APP_ID,
        "ruleset_checks": (("AD25-Owner-Policy", OWNER_APP_ID),),
        "ruleset_strict": True,
        "ruleset_bypass_empty": True,
        "event_head_sha": HEAD,
        "active_hmac_secrets": (SECRET,),
        "now_unix": NOW,
        "pulls_api_base_sha": PARENT,
        "compare_merge_base_sha": PARENT,
        "source_commit_sha": SOURCE,
        "head_blobs": _blobs(approved),
        "source_blobs": _blobs(approved),
    }
    base.update(overrides)
    return GitHubSnapshot(**base)  # type: ignore[arg-type]


def _assert_failure(test: unittest.TestCase, result, needle: str) -> None:
    test.assertEqual(result.conclusion, CheckConclusion.FAILURE)
    test.assertNotIn(result.conclusion.value, {"neutral", "skipped", "success"})
    body = github_check_body(result, result.head_sha)
    test.assertEqual(body["conclusion"], "failure")
    test.assertEqual(body["name"], "AD25-Owner-Policy")
    joined = " ".join(result.reasons)
    test.assertIn(needle, joined)
    test.assertNotIn(SECRET, joined)
    test.assertNotIn(NEXT_SECRET, joined)
    test.assertNotIn("human presence", joined.lower())


class FailClosedNegatives(unittest.TestCase):
    def test_happy_dest_sync(self) -> None:
        result = evaluate_snapshot(_snap())
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "dest_sync")
        self.assertNotIn("human", " ".join(result.reasons).lower())

    def test_happy_feature(self) -> None:
        result = evaluate_snapshot(
            _snap(
                files=("docs/readme.md",),
                comments=(),
                active_hmac_secrets=(),
                pulls_api_base_sha=None,
                compare_merge_base_sha=None,
                source_commit_sha=None,
                head_blobs={},
                source_blobs={},
                base_ref="main",
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "feature")

    def test_cursor_installation_token_does_not_mint_success(self) -> None:
        result = evaluate_snapshot(
            _snap(
                comments=(
                    Comment(
                        login="cursor[bot]",
                        user_type="Bot",
                        body=f"OWNER_APPROVE_CONTROL_PLANE sha={HEAD} ts={NOW} mac={_mac()}",
                        created_at=NOW,
                        updated_at=NOW,
                    ),
                )
            )
        )
        _assert_failure(self, result, "missing owner HMAC attestation")

    def test_user_authorized_token_comment_without_hmac(self) -> None:
        result = evaluate_snapshot(
            _snap(
                comments=(
                    _owner_comment(body=f"OWNER_APPROVE_CONTROL_PLANE sha={HEAD}"),
                )
            )
        )
        _assert_failure(self, result, "without HMAC")

    def test_pr_head_workflow_check_name_spoof(self) -> None:
        result = evaluate_snapshot(
            _snap(
                app_integration_id=15368,
                ruleset_checks=(("AD25-Owner-Policy", 15368),),
            )
        )
        _assert_failure(self, result, "15368")

    def test_cursor_app_check_name_spoof(self) -> None:
        result = evaluate_snapshot(
            _snap(
                app_integration_id=1210556,
                ruleset_checks=(("AD25-Owner-Policy", 1210556),),
            )
        )
        _assert_failure(self, result, "1210556")

    def test_gitguardian_check_name_spoof(self) -> None:
        result = evaluate_snapshot(
            _snap(
                app_integration_id=46505,
                ruleset_checks=(("AD25-Owner-Policy", 46505),),
            )
        )
        _assert_failure(self, result, "46505")

    def test_incorrect_integration_id(self) -> None:
        result = evaluate_snapshot(
            _snap(
                app_integration_id=888002,
                ruleset_checks=(("AD25-Owner-Policy", OWNER_APP_ID),),
            )
        )
        _assert_failure(self, result, "does not match the pinned")

    def test_unpinned_integration_id(self) -> None:
        result = evaluate_snapshot(
            _snap(ruleset_checks=(("AD25-Owner-Policy", None),))
        )
        _assert_failure(self, result, "not pinned")

    def test_missing_attestation(self) -> None:
        result = evaluate_snapshot(_snap(comments=()))
        _assert_failure(self, result, "missing owner HMAC")

    def test_stale_attestation_sha(self) -> None:
        old = SOURCE
        result = evaluate_snapshot(_snap(comments=(_owner_comment(sha=old),)))
        _assert_failure(self, result, "does not match current HEAD")

    def test_changed_pr_head_invalidates_mac(self) -> None:
        new_head = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
        result = evaluate_snapshot(
            _snap(
                head_sha=new_head,
                event_head_sha=new_head,
                comments=(_owner_comment(sha=HEAD),),
            )
        )
        _assert_failure(self, result, "does not match current HEAD")

    def test_modified_allowlist_outside_approved_set(self) -> None:
        result = evaluate_snapshot(
            _snap(files=(".github/workflows/deploy-production.yml",))
        )
        _assert_failure(self, result, "forbidden control-plane path")

    def test_missing_destination_parent(self) -> None:
        result = evaluate_snapshot(_snap(pulls_api_base_sha=None))
        _assert_failure(self, result, "destination parent SHA")

    def test_stale_destination_parent_not_ancestor(self) -> None:
        result = evaluate_snapshot(
            _snap(compare_merge_base_sha="ffffffffffffffffffffffffffffffffffffffff")
        )
        _assert_failure(self, result, "not a descendant")

    def test_unexpected_control_plane_paths(self) -> None:
        result = evaluate_snapshot(_snap(files=("deploy/evil-sync.sh",)))
        _assert_failure(self, result, "unexpected control-plane paths")

    def test_missing_blob_evidence(self) -> None:
        result = evaluate_snapshot(_snap(source_blobs={}, head_blobs={}))
        _assert_failure(self, result, "missing blob evidence")

    def test_blob_mismatch(self) -> None:
        policy = load_policy()
        dest = _blobs(tuple(policy.sync_approved_paths))
        dest[".github/workflows/ci.yml"] = "cccccccccccccccccccccccccccccccccccccccc"
        result = evaluate_snapshot(_snap(head_blobs=dest))
        _assert_failure(self, result, "blob mismatch")

    def test_app_failure_unknown_exception_is_failure(self) -> None:
        from dataclasses import replace

        from owner_policy.evidence import seal_request
        from owner_policy.evaluate import evaluate

        sealed = seal_request(_snap(), load_policy())
        result = evaluate(replace(sealed, comments=5))  # type: ignore[arg-type]
        self.assertEqual(result.conclusion, CheckConclusion.FAILURE)
        self.assertNotIn(result.conclusion.value, {"neutral", "skipped", "success"})

    def test_missing_hmac_secret_fails_closed(self) -> None:
        result = evaluate_snapshot(_snap(active_hmac_secrets=()))
        _assert_failure(self, result, "attestation secret missing")

    def test_production_environment_access_refused(self) -> None:
        result = evaluate_snapshot(_snap(requested_environments=("production", "uat")))
        _assert_failure(self, result, "must not access Environments")

    def test_secret_access_refused(self) -> None:
        result = evaluate_snapshot(
            _snap(requested_secret_names=("DROPLET_SSH_KEY", "PROD_TOKEN"))
        )
        _assert_failure(self, result, "must not access secrets")

    def test_wrong_check_name_refused(self) -> None:
        from dataclasses import replace

        from owner_policy.evidence import seal_request
        from owner_policy.evaluate import evaluate

        sealed = seal_request(_snap(), load_policy())
        result = evaluate(replace(sealed, check_name="CI"))
        _assert_failure(self, result, "unverified evidence")

    def test_policy_expansion_on_uat_without_being_dest_sync_blobs(self) -> None:
        policy = load_policy()
        paths = tuple(sorted(policy.sync_approved_paths | policy.expansion_paths))
        result = evaluate_snapshot(
            _snap(
                files=("deploy/ad25-owner-policy.json",),
                source_blobs=_blobs(paths),
                head_blobs=_blobs(paths),
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "dest_sync")

    def test_application_feature_pr_succeeds(self) -> None:
        result = evaluate_snapshot(
            _snap(
                base_ref="main",
                files=("src/Api/Program.cs", "web/package.json"),
                comments=(),
                active_hmac_secrets=(),
                pulls_api_base_sha=None,
                compare_merge_base_sha=None,
                source_commit_sha=None,
                head_blobs={},
                source_blobs={},
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "feature")

    def test_mixed_control_plane_and_application_fails(self) -> None:
        result = evaluate_snapshot(
            _snap(files=(".github/workflows/ci.yml", "src/Api/Program.cs"))
        )
        _assert_failure(self, result, "mixed control-plane")

    def test_hmac_base_mismatch_fails(self) -> None:
        result = evaluate_snapshot(_snap(comments=(_owner_comment(base="main"),)))
        _assert_failure(self, result, "attestation MAC is invalid")

    def test_policy_expansion_on_main(self) -> None:
        result = evaluate_snapshot(
            _snap(
                base_ref="main",
                pulls_api_base_sha=None,
                compare_merge_base_sha=None,
                source_commit_sha=None,
                comments=(_owner_comment(base="main"),),
                files=("deploy/ad25-owner-policy.json",),
                source_blobs={},
                head_blobs={},
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "policy_expansion")

    def test_hmac_replay_across_pull_requests(self) -> None:
        result = evaluate_snapshot(_snap(comments=(_owner_comment(pr=541),)))
        _assert_failure(self, result, "attestation MAC is invalid")

    def test_hmac_replay_across_repos(self) -> None:
        result = evaluate_snapshot(
            _snap(comments=(_owner_comment(repo="fad16papa/other"),))
        )
        _assert_failure(self, result, "attestation MAC is invalid")

    def test_expired_and_future_attestation(self) -> None:
        expired = evaluate_snapshot(
            _snap(comments=(_owner_comment(ts=NOW - 86401),))
        )
        _assert_failure(self, expired, "expired")
        future = evaluate_snapshot(
            _snap(comments=(_owner_comment(ts=NOW + 121),))
        )
        _assert_failure(self, future, "future")
        edge = evaluate_snapshot(
            _snap(comments=(_owner_comment(ts=NOW - 86400),))
        )
        self.assertEqual(edge.conclusion, CheckConclusion.SUCCESS)
        skew = evaluate_snapshot(
            _snap(comments=(_owner_comment(ts=NOW + 120),))
        )
        self.assertEqual(skew.conclusion, CheckConclusion.SUCCESS)

    def test_edited_and_deleted_attestation(self) -> None:
        edited = evaluate_snapshot(
            _snap(comments=(_owner_comment(updated_at=NOW + 1),))
        )
        _assert_failure(self, edited, "edited attestation")
        deleted = evaluate_snapshot(_snap(comments=(_owner_comment(deleted=True),)))
        _assert_failure(self, deleted, "deleted attestation")
        missing_stamps = evaluate_snapshot(
            _snap(comments=(_owner_comment(created_at=0, updated_at=0),))
        )
        _assert_failure(self, missing_stamps, "timestamps missing")

    def test_conflicting_attestations_fail_closed(self) -> None:
        valid = _owner_comment()
        stale = _owner_comment(sha=SOURCE)
        comment_only = _owner_comment(body=f"OWNER_APPROVE_CONTROL_PLANE sha={HEAD}")
        _assert_failure(
            self,
            evaluate_snapshot(_snap(comments=(valid, stale))),
            "does not match current HEAD",
        )
        _assert_failure(
            self,
            evaluate_snapshot(_snap(comments=(comment_only, valid))),
            "without HMAC",
        )

    def test_hmac_rotation_window(self) -> None:
        during = evaluate_snapshot(
            _snap(
                active_hmac_secrets=(SECRET, NEXT_SECRET),
                comments=(_owner_comment(secret=NEXT_SECRET),),
            )
        )
        self.assertEqual(during.conclusion, CheckConclusion.SUCCESS)
        retired = evaluate_snapshot(
            _snap(
                active_hmac_secrets=(NEXT_SECRET,),
                comments=(_owner_comment(secret=SECRET),),
            )
        )
        _assert_failure(self, retired, "attestation MAC is invalid")

    def test_one_hex_mac_difference_fails(self) -> None:
        mac = _mac()
        flipped = mac[:-1] + ("0" if mac[-1] != "0" else "1")
        result = evaluate_snapshot(
            _snap(
                comments=(
                    _owner_comment(
                        body=f"OWNER_APPROVE_CONTROL_PLANE sha={HEAD} ts={NOW} mac={flipped}"
                    ),
                )
            )
        )
        _assert_failure(self, result, "attestation MAC is invalid")

    def test_case_variant_control_plane_is_not_feature(self) -> None:
        result = evaluate_snapshot(_snap(files=(".GitHub/workflows/ci.yml",)))
        _assert_failure(self, result, "unexpected control-plane paths")

    def test_incomplete_timeout_truncation_and_stale_event(self) -> None:
        _assert_failure(
            self,
            evaluate_snapshot(_snap(files=("src/Api/Program.cs",), files_complete=False, comments=(), active_hmac_secrets=())),
            "file list is incomplete",
        )
        _assert_failure(
            self,
            evaluate_snapshot(_snap(comments_complete=False)),
            "comment list is incomplete",
        )
        _assert_failure(self, evaluate_snapshot(_snap(timed_out=True)), "timed out")
        _assert_failure(
            self,
            evaluate_snapshot(_snap(trees_truncated=True)),
            "truncated",
        )
        _assert_failure(
            self,
            evaluate_snapshot(_snap(event_head_sha=SOURCE)),
            "stale event sha",
        )

    def test_ruleset_strict_and_bypass(self) -> None:
        _assert_failure(
            self,
            evaluate_snapshot(_snap(ruleset_strict=False)),
            "strict required status checks",
        )
        _assert_failure(
            self,
            evaluate_snapshot(_snap(ruleset_bypass_empty=False)),
            "bypass list is not empty",
        )
        _assert_failure(
            self,
            evaluate_snapshot(_snap(ruleset_checks=())),
            "not pinned",
        )

    def test_malformed_head_sha(self) -> None:
        result = evaluate_snapshot(
            _snap(head_sha="ADE3C8281E8A2EC82EF45771BC5B68DF64901A41", event_head_sha="ADE3C8281E8A2EC82EF45771BC5B68DF64901A41")
        )
        _assert_failure(self, result, "not 40-char lowercase hex")

    def test_idempotent_and_recovers(self) -> None:
        good = _snap()
        first = evaluate_snapshot(good)
        second = evaluate_snapshot(good)
        self.assertEqual(first, second)
        self.assertEqual(first.conclusion, CheckConclusion.SUCCESS)
        bad = evaluate_snapshot(_snap(timed_out=True))
        self.assertEqual(bad.conclusion, CheckConclusion.FAILURE)
        again = evaluate_snapshot(good)
        self.assertEqual(again.conclusion, CheckConclusion.SUCCESS)

    def test_published_check_identity(self) -> None:
        with self.assertRaises(EvidenceError):
            confirm_published_check(published_app_id=15368, installation_app_id=OWNER_APP_ID)
        with self.assertRaises(EvidenceError):
            confirm_published_check(published_app_id=None, installation_app_id=OWNER_APP_ID)
        confirm_published_check(published_app_id=OWNER_APP_ID, installation_app_id=OWNER_APP_ID)
        success = evaluate_snapshot(_snap())
        with self.assertRaises(CheckPostError):
            github_check_body(success, HEAD)
        with self.assertRaises(CheckPostError):
            github_check_body(
                success,
                HEAD,
                published_app_id=15368,
                installation_app_id=OWNER_APP_ID,
            )
        posted = github_check_body(
            success,
            HEAD,
            published_app_id=OWNER_APP_ID,
            installation_app_id=OWNER_APP_ID,
        )
        self.assertEqual(posted["conclusion"], "success")
        self.assertEqual(posted["head_sha"], HEAD)
        with self.assertRaises(CheckPostError):
            github_check_body(
                success,
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                published_app_id=OWNER_APP_ID,
                installation_app_id=OWNER_APP_ID,
            )

    def test_seal_binds_request_fields(self) -> None:
        from dataclasses import replace

        from owner_policy.evidence import seal_request
        from owner_policy.evaluate import evaluate

        sealed = seal_request(_snap(), load_policy())
        tampered = evaluate(
            replace(sealed, changed_paths=("docs/readme.md",), comments=(), hmac_secrets=())
        )
        _assert_failure(self, tampered, "unverified evidence")
        ancestry = evaluate(
            replace(sealed, merge_base_sha="ffffffffffffffffffffffffffffffffffffffff")
        )
        _assert_failure(self, ancestry, "unverified evidence")

    def test_rename_keeps_previous_secret_path(self) -> None:
        result = evaluate_snapshot(
            _snap(
                base_ref="main",
                files=("notes.txt",),
                previous_paths=(".env",),
                comments=(),
                active_hmac_secrets=(),
                pulls_api_base_sha=None,
                compare_merge_base_sha=None,
                source_commit_sha=None,
                head_blobs={},
                source_blobs={},
            )
        )
        _assert_failure(self, result, "secret-like path")

    def test_codeowners_and_local_action_are_not_feature(self) -> None:
        _assert_failure(
            self,
            evaluate_snapshot(_snap(files=("CODEOWNERS",))),
            "forbidden control-plane path",
        )
        _assert_failure(
            self,
            evaluate_snapshot(_snap(files=("src/actions/checkout/action.yml",))),
            "forbidden control-plane path",
        )

    def test_reposted_mac_on_a_new_comment_fails(self) -> None:
        stale_comment = _owner_comment(ts=NOW - 600, created_at=NOW, updated_at=NOW)
        result = evaluate_snapshot(_snap(comments=(stale_comment,)))
        _assert_failure(self, result, "does not match the comment")

    def test_whitespace_secret_and_malformed_snapshot_fail_closed(self) -> None:
        _assert_failure(
            self,
            evaluate_snapshot(_snap(active_hmac_secrets=("   ",))),
            "attestation secret missing",
        )
        broken = evaluate_snapshot(_snap(head_blobs=5))  # type: ignore[arg-type]
        self.assertEqual(broken.conclusion, CheckConclusion.FAILURE)
        self.assertIn("evaluator error", " ".join(broken.reasons))

    def test_mac_cli_does_not_print_secret(self) -> None:
        os.environ["OWNER_ATTESTATION_SECRET"] = SECRET
        buf = io.StringIO()
        with redirect_stdout(buf):
            code = mac_main(
                [
                    "--repo",
                    REPO,
                    "--pr",
                    "542",
                    "--sha",
                    HEAD,
                    "--base",
                    "release/uat",
                    "--ts",
                    str(NOW),
                ]
            )
        self.assertEqual(code, 0)
        printed = buf.getvalue()
        self.assertNotIn(SECRET, printed)
        self.assertIn(f"ts={NOW}", printed)
        self.assertTrue(printed.startswith("OWNER_APPROVE_CONTROL_PLANE "))


if __name__ == "__main__":
    os.chdir(ROOT)
    unittest.main()
