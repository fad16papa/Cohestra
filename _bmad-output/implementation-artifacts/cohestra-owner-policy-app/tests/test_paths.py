#!/usr/bin/env python3
"""Regression: secret-like paths must not classify as feature success.

Red run on e1db6e50 called evaluate() directly. A PR whose only file was
`.env` returned success/feature (6 failed, ordinary src/web passed).

Green run goes through evaluate_snapshot. Direct EvaluationRequest objects
fail as unverified evidence and do not prove path classification.
"""

from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from owner_policy.conclusions import CheckConclusion  # noqa: E402
from owner_policy.evaluate import EvaluationRequest  # noqa: E402
from owner_policy.evaluate import evaluate  # noqa: E402
from owner_policy.evidence import GitHubSnapshot, evaluate_snapshot  # noqa: E402

HEAD = "ade3c8281e8a2ec82ef45771bc5b68df64901a41"
OWNER = 999001
NOW = 1_700_000_000


def _feature(paths: tuple[str, ...]):
    return evaluate_snapshot(
        GitHubSnapshot(
            repo="fad16papa/Cohestra",
            pull_number=1,
            head_sha=HEAD,
            base_ref="main",
            files=paths,
            files_complete=True,
            comments=(),
            comments_complete=True,
            app_integration_id=OWNER,
            ruleset_checks=(("AD25-Owner-Policy", OWNER),),
            ruleset_strict=True,
            ruleset_bypass_empty=True,
            event_head_sha=HEAD,
            now_unix=NOW,
        )
    )


def _assert_secret_failure(test: unittest.TestCase, paths: tuple[str, ...]) -> None:
    result = _feature(paths)
    test.assertEqual(result.conclusion, CheckConclusion.FAILURE, result.reasons)
    test.assertNotIn(result.conclusion.value, {"neutral", "skipped", "success"})
    blob = " ".join(result.reasons).lower()
    test.assertTrue(
        any(
            word in blob
            for word in ("secret", "traversal", "ambiguous", "canonical", "absolute")
        ),
        result.reasons,
    )


class SecretPathRegressions(unittest.TestCase):
    def test_root_dotenv_is_not_feature(self) -> None:
        _assert_secret_failure(self, (".env",))

    def test_nested_dotenv_variants(self) -> None:
        _assert_secret_failure(self, ("src/config/.env",))
        _assert_secret_failure(self, ("web/.env.local",))
        _assert_secret_failure(self, ("web/.env.production",))
        _assert_secret_failure(self, ("src/app/.env.development.local",))

    def test_private_key_names(self) -> None:
        _assert_secret_failure(self, ("web/id_rsa",))
        _assert_secret_failure(self, ("web/id_rsa.pub",))
        _assert_secret_failure(self, ("src/keys/id_ed25519",))
        _assert_secret_failure(self, ("src/keys/id_ecdsa",))
        _assert_secret_failure(self, ("deploy/certs/server.pem",))
        _assert_secret_failure(self, ("src/auth/service.key",))
        _assert_secret_failure(self, ("web/credentials.json",))
        _assert_secret_failure(self, ("web/id_rsa.txt",))
        _assert_secret_failure(self, ("src/keys/id_ed25519.old",))
        _assert_secret_failure(self, ("src/keys/id_rsa2",))
        _assert_secret_failure(self, ("src/config/production.env",))
        _assert_secret_failure(self, ("web/.envrc",))
        _assert_secret_failure(self, ("src/.aws/credentials",))
        _assert_secret_failure(self, ("config/secrets.json",))
        _assert_secret_failure(self, ("deploy/certs/.pem",))

    def test_case_variations(self) -> None:
        _assert_secret_failure(self, ("src/.ENV",))
        _assert_secret_failure(self, ("web/ID_RSA",))
        _assert_secret_failure(self, ("src/app.PEM",))
        _assert_secret_failure(self, ("WEB/id_RSA",))

    def test_traversal_and_normalization(self) -> None:
        _assert_secret_failure(self, ("src/../.env",))
        _assert_secret_failure(self, ("%2e%2e/.env",))
        _assert_secret_failure(self, ("src/%2eenv",))
        _assert_secret_failure(self, ("src/foo/../../.env",))
        _assert_secret_failure(self, ("%252e%252e/.env",))

    def test_deceptive_forms(self) -> None:
        _assert_secret_failure(self, ("src//.env",))
        _assert_secret_failure(self, ("./web/../.env",))
        _assert_secret_failure(self, ("src/.env%00.png",))
        _assert_secret_failure(self, ("/etc/passwd",))
        _assert_secret_failure(self, ("src\\..\\.env",))
        _assert_secret_failure(self, ("C:/keys/id_rsa",))

    def test_ordinary_application_code_still_allowed(self) -> None:
        result = _feature(
            (
                "src/Api/Program.cs",
                "web/package.json",
                "src/SecretRotation.cs",
                "docs/secret-model.md",
                "src/secrets/TokenStore.cs",
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.SUCCESS)
        self.assertEqual(result.verdict, "feature")

    def test_hand_built_request_is_not_evidence(self) -> None:
        result = evaluate(
            EvaluationRequest(
                repo="fad16papa/Cohestra",
                pull_number=1,
                head_sha=HEAD,
                base_ref="main",
                dest_parent_sha=None,
                changed_paths=("src/Api/Program.cs",),
                source_blobs={},
                dest_blobs={},
                comments=(),
                hmac_secrets=(),
                now_unix=NOW,
                posting_integration_id=OWNER,
                expected_integration_id=OWNER,
                check_name="AD25-Owner-Policy",
            )
        )
        self.assertEqual(result.conclusion, CheckConclusion.FAILURE)
        self.assertIn("unverified evidence", " ".join(result.reasons))


if __name__ == "__main__":
    os.chdir(ROOT)
    unittest.main()
