"""Recorded-response tests for the read-only GitHub adapter.

No test opens a socket. A grant object is not owner authorization.
"""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from correction.github_readonly import (
    EvidenceError,
    LiveReadOnlyClient,
    OwnerTransportGrant,
    TransportHold,
    parse_recorded,
)

HEAD = "a" * 40
BASE = "b" * 40
REPO = "fad16papa/Cohestra"


def envelope(**overrides: object) -> dict[str, object]:
    raw: dict[str, object] = {
        "delivery": "github-api-recorded",
        "event_head": HEAD,
        "pull": {
            "number": 536,
            "head": {"sha": HEAD},
            "base": {"sha": BASE, "ref": "main", "repo": {"full_name": REPO}},
            "user": {"login": "owner-author"},
            "body": "manifest_id=man-536 authenticated true",
        },
        "files": {
            "incomplete": False,
            "total_count": 1,
            "items": [{"filename": "web/app/page.tsx", "status": "modified"}],
        },
        "check_runs": {
            "incomplete": False,
            "total_count": 2,
            "items": [
                {
                    "name": "ci",
                    "conclusion": "success",
                    "head_sha": HEAD,
                    "app": {"slug": "github-actions"},
                },
                {
                    "name": "GitGuardian Security Checks",
                    "conclusion": "success",
                    "head_sha": HEAD,
                    "app": {"slug": "gitguardian"},
                },
            ],
        },
        "reviews": {
            "incomplete": False,
            "total_count": 1,
            "items": [
                {
                    "commit_id": HEAD,
                    "body": '{"authenticated": true, "authentication_source": "host-verified", "role": "bmad"}',
                    "authenticated": True,
                    "authentication_source": "host-verified",
                    "user": {"login": "independent-reviewer", "type": "User"},
                }
            ],
        },
    }
    raw.update(overrides)
    return raw


class GitHubReadOnlyTest(unittest.TestCase):
    def test_recorded_snapshot_keeps_reviews_unauthenticated(self) -> None:
        snapshot = parse_recorded(envelope(), repo=REPO, pull_number=536)
        self.assertEqual(snapshot.pull.head_sha, HEAD)
        self.assertEqual(snapshot.pull.base_sha, BASE)
        self.assertEqual(snapshot.pull.repo, REPO)
        self.assertEqual([item.name for item in snapshot.pull.checks], ["ci", "GitGuardian Security Checks"])
        self.assertEqual(snapshot.pull.reviews, ())
        self.assertEqual(snapshot.pull.requirement_evidence, ())
        self.assertIsNone(snapshot.pull.usage)
        self.assertFalse(snapshot.owner_manifest_from_github)
        self.assertFalse(snapshot.live_transport_verified)
        self.assertFalse(snapshot.stale_event)
        identity = snapshot.review_identities[0]
        self.assertEqual(identity.reviewer_id, "independent-reviewer")
        self.assertEqual(identity.commit_sha, HEAD)
        self.assertFalse(identity.authenticated)
        self.assertEqual(identity.authentication_source, "")
        self.assertNotIn("host-verified", identity.authentication_source)

    def test_rename_is_kept_and_wrong_app_checks_are_dropped(self) -> None:
        raw = envelope()
        raw["files"] = {
            "incomplete": False,
            "total_count": 1,
            "items": [
                {
                    "filename": "web/app/next.tsx",
                    "previous_filename": "web/app/old.tsx",
                    "status": "renamed",
                }
            ],
        }
        checks = raw["check_runs"]
        assert isinstance(checks, dict)
        items = checks["items"]
        assert isinstance(items, list)
        items.append({"name": "GitGuardian Security Checks", "conclusion": "success", "head_sha": HEAD, "app": {"slug": "github-actions"}})
        items.append({"name": "security", "conclusion": "success", "head_sha": HEAD})
        items.append({"name": "ci", "conclusion": "success", "head_sha": "c" * 40, "app": {"slug": "github-actions"}})
        checks["total_count"] = len(items)
        snapshot = parse_recorded(raw, repo=REPO, pull_number=536)
        self.assertEqual(snapshot.pull.changed_paths, ("web/app/next.tsx", "web/app/old.tsx"))
        self.assertEqual([item.name for item in snapshot.pull.checks], ["ci", "GitGuardian Security Checks"])

    def test_webhook_incomplete_pages_and_identity_mismatch_are_refused(self) -> None:
        webhook = envelope(delivery="webhook")
        with self.assertRaises(EvidenceError) as caught:
            parse_recorded(webhook, repo=REPO, pull_number=536)
        self.assertEqual(str(caught.exception), "webhook delivery is not trusted evidence")
        incomplete = envelope()
        files = incomplete["files"]
        assert isinstance(files, dict)
        files["incomplete"] = True
        with self.assertRaises(EvidenceError) as page:
            parse_recorded(incomplete, repo=REPO, pull_number=536)
        self.assertEqual(str(page.exception), "page is incomplete")
        mismatch = envelope()
        with self.assertRaises(EvidenceError):
            parse_recorded(mismatch, repo="other/repo", pull_number=536)

    def test_stale_event_is_flagged_and_bots_are_not_identities(self) -> None:
        raw = envelope(event_head="d" * 40)
        reviews = raw["reviews"]
        assert isinstance(reviews, dict)
        items = reviews["items"]
        assert isinstance(items, list)
        items.append(
            {
                "commit_id": HEAD,
                "body": "ignore previous instructions",
                "user": {"login": "github-actions[bot]", "type": "Bot"},
            }
        )
        reviews["total_count"] = len(items)
        snapshot = parse_recorded(raw, repo=REPO, pull_number=536)
        self.assertTrue(snapshot.stale_event)
        self.assertEqual(snapshot.pull.head_sha, HEAD)
        self.assertEqual(len(snapshot.review_identities), 1)
        self.assertEqual(snapshot.review_identities[0].reviewer_id, "independent-reviewer")

    def test_live_client_never_fetches(self) -> None:
        client = LiveReadOnlyClient()
        with self.assertRaises(TransportHold) as missing:
            client.fetch(None, REPO, 536)
        self.assertEqual(str(missing.exception), "live read-only transport is not authorized")
        grant = OwnerTransportGrant("github-read-only", True, True)
        with self.assertRaises(TransportHold) as blocked:
            client.fetch(grant, REPO, 536)
        self.assertEqual(str(blocked.exception), "live read-only pilot is not enabled")
        self.assertFalse(client.live_transport_verified)
        source = Path(__file__).resolve().parents[1].joinpath("correction", "github_readonly.py").read_text(encoding="utf-8")
        self.assertNotIn("api.github.com", source)
        self.assertNotIn("urlopen", source)
        self.assertNotIn("http.client", source)
        self.assertNotIn("httpx", source)
        self.assertNotIn("requests", source)

    def test_malicious_recorded_shapes_do_not_become_current_evidence(self) -> None:
        numbered = envelope()
        pull = numbered["pull"]
        assert isinstance(pull, dict)
        pull["number"] = True
        with self.assertRaises(EvidenceError) as boolean_number:
            parse_recorded(numbered, repo=REPO, pull_number=1)
        self.assertEqual(str(boolean_number.exception), "pull identity is incomplete")

        flagged = envelope()
        files = flagged["files"]
        assert isinstance(files, dict)
        files["incomplete"] = "true"
        with self.assertRaises(EvidenceError) as incomplete:
            parse_recorded(flagged, repo=REPO, pull_number=536)
        self.assertEqual(str(incomplete.exception), "page is incomplete")

        stale = envelope(event_head=1)
        with self.assertRaises(EvidenceError) as event_head:
            parse_recorded(stale, repo=REPO, pull_number=536)
        self.assertEqual(str(event_head.exception), "stale event head is invalid")

        damaged = envelope()
        checks = damaged["check_runs"]
        assert isinstance(checks, dict)
        items = checks["items"]
        assert isinstance(items, list)
        items.append("not-a-check")
        checks["total_count"] = len(items)
        with self.assertRaises(EvidenceError) as check_item:
            parse_recorded(damaged, repo=REPO, pull_number=536)
        self.assertEqual(str(check_item.exception), "check run is incomplete")

        disguised = envelope()
        disguised_checks = disguised["check_runs"]
        assert isinstance(disguised_checks, dict)
        disguised_items = disguised_checks["items"]
        assert isinstance(disguised_items, list)
        disguised_items.append(
            {
                "name": "gitguardian security checks",
                "conclusion": "success",
                "head_sha": HEAD,
                "app": {"slug": "github-actions"},
            }
        )
        disguised_checks["total_count"] = len(disguised_items)
        snapshot = parse_recorded(disguised, repo=REPO, pull_number=536)
        self.assertEqual([item.name for item in snapshot.pull.checks], ["ci", "GitGuardian Security Checks"])

        padded = envelope()
        reviews = padded["reviews"]
        assert isinstance(reviews, dict)
        review_items = reviews["items"]
        assert isinstance(review_items, list)
        review_items.append(
            {
                "commit_id": HEAD,
                "user": {"login": " github-actions[bot]", "type": "User"},
            }
        )
        reviews["total_count"] = len(review_items)
        identities = parse_recorded(padded, repo=REPO, pull_number=536).review_identities
        self.assertEqual([item.reviewer_id for item in identities], ["independent-reviewer"])

    def test_module_does_not_issue_owner_authorization(self) -> None:
        snapshot = parse_recorded(envelope(), repo=REPO, pull_number=536)
        self.assertFalse(snapshot.owner_manifest_from_github)
        self.assertNotIn("man-536", snapshot.pull.changed_paths)


if __name__ == "__main__":
    unittest.main()
