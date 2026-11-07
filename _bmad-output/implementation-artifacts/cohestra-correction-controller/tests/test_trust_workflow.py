"""Static checks for the read-only trust workflow. The workflow is not executed."""

from __future__ import annotations

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
WORKFLOW = ROOT / ".github" / "workflows" / "cohestra-trust-evaluator.yml"
REQUIREMENTS = (
    Path(__file__).resolve().parents[1] / "requirements-trust.txt"
)
CONTROLLER_TESTS = ROOT / ".github" / "workflows" / "correction-controller-tests.yml"
CHECKOUT = "actions/checkout@11d5960a326750d5838078e36cf38b85af677262"
ALLOWED = {
    "github.sha",
    "github.event_name",
    "github.run_id",
    "github.repository",
    "github.event.pull_request.number",
    "github.event.pull_request.head.sha",
    "vars.COHESTRA_TRUST_EVALUATOR_ENABLED",
    "vars.COHESTRA_OWNER_KEY_ID",
    "vars.COHESTRA_OWNER_PUBLIC_KEY",
    "vars.COHESTRA_OWNER_PUBLIC_KEY_SHA256",
    "vars.COHESTRA_APPROVED_TASK_ID",
    "vars.COHESTRA_REVIEW_APP_BMAD_ID",
    "vars.COHESTRA_REVIEW_APP_CATSEC_ID",
    "vars.COHESTRA_REVIEW_BMAD_CHECK_NAME",
    "vars.COHESTRA_REVIEW_CATSEC_CHECK_NAME",
    "vars.COHESTRA_REQUIRED_CHECKS_MAP",
    "runner.temp",
    "secrets.GITHUB_TOKEN",
}


class TrustWorkflowTest(unittest.TestCase):
    def test_workflow_is_read_only_and_does_not_run_pull_request_code(self) -> None:
        text = WORKFLOW.read_text(encoding="utf-8")
        self.assertIn("pull_request_target:", text)
        self.assertIn("branches:\n      - main", text)
        for kind in ("opened", "synchronize", "reopened", "ready_for_review"):
            self.assertIn(f"- {kind}", text)
        self.assertNotIn("\n  pull_request:\n", text)
        self.assertIn("contents: read", text)
        self.assertIn("checks: read", text)
        self.assertIn("pull-requests: read", text)
        for banned in ("contents: write", "checks: write", "pull-requests: write", "actions:", "id-token:", "deployments:"):
            self.assertNotIn(banned, text)
        self.assertEqual(text.count("uses:"), 1)
        self.assertIn(CHECKOUT, text)
        self.assertIn("ref: ${{ github.sha }}", text)
        self.assertIn("persist-credentials: false", text)
        self.assertIn("vars.COHESTRA_TRUST_EVALUATOR_ENABLED == 'true'", text)
        self.assertIn("--require-hashes", text)
        self.assertIn("--only-binary=:all:", text)
        self.assertIn("--no-deps", text)
        self.assertIn("https://pypi.org/simple", text)
        expressions = set(re.findall(r"\$\{\{\s*([^}]+?)\s*\}\}", text))
        self.assertEqual(expressions, ALLOWED)
        self.assertNotIn("github.event.pull_request.head.ref", text)
        self.assertNotIn("github.event.pull_request.title", text)
        self.assertNotIn("github.event.pull_request.body", text)
        self.assertNotIn("setup-python", text)

    def test_requirements_pin_the_existing_cryptography_wheel(self) -> None:
        text = REQUIREMENTS.read_text(encoding="utf-8")
        self.assertIn("cryptography==50.0.2", text)
        self.assertIn("cffi==2.1.1", text)
        self.assertIn("pycparser==3.12", text)
        self.assertIn("--hash=sha256:9dab55f57c74c3cad24c323bacbbd04be4705ba6eb0d92e920b1fc4837ed5079", text)
        self.assertGreaterEqual(text.count("--hash=sha256:"), 9)

    def test_existing_controller_test_workflow_stays_read_only(self) -> None:
        text = CONTROLLER_TESTS.read_text(encoding="utf-8")
        self.assertIn("contents: read", text)
        self.assertNotIn("write", text)
        self.assertNotIn("pull_request_target", text)


if __name__ == "__main__":
    unittest.main()
