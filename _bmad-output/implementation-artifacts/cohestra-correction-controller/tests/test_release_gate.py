"""Contract tests for the closed merge and UAT gate."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from correction import release_gate
from correction.release_gate import ReleaseHold, assess, deploy_production, deploy_uat, merge_feature


class ReleaseGateTest(unittest.TestCase):
    def test_ready_feature_paths_stay_ineligible(self) -> None:
        decision = assess(
            verification_plane="SIMULATED_PASS",
            changed_paths=("web/app/page.tsx", "src/Api/Program.cs"),
            policy_activated=True,
            owner_manifest_authorized=True,
        )
        self.assertFalse(decision.eligible)
        self.assertFalse(decision.automerge_ready)
        self.assertFalse(decision.uat_deployment_ready)
        self.assertFalse(decision.production_ready)
        self.assertFalse(decision.owner_control_ready)
        self.assertIn("simulated readiness is not merge authorization", decision.reasons)
        self.assertIn("owner policy enforcement is not verified", decision.reasons)
        self.assertNotIn("control-plane change requires separate owner authorization", decision.reasons)

    def test_control_plane_and_missing_evidence_add_reasons(self) -> None:
        decision = assess(
            verification_plane="NOT_VERIFIED",
            changed_paths=(".github/workflows/ci.yml",),
            policy_activated=False,
            owner_manifest_authorized=False,
        )
        self.assertFalse(decision.eligible)
        self.assertIn("controller readiness is not verified", decision.reasons)
        self.assertIn("owner manifest is not authorized", decision.reasons)
        self.assertIn("control-plane change requires separate owner authorization", decision.reasons)
        self.assertIn("caller did not claim an activated policy", decision.reasons)

    def test_merge_and_deploy_raise_and_flags_stay_closed(self) -> None:
        decision = assess(verification_plane="SIMULATED_PASS", changed_paths=("web/app/page.tsx",))
        with self.assertRaises(ReleaseHold) as merge:
            merge_feature(decision)
        self.assertEqual(str(merge.exception), "automatic merge is not authorized")
        with self.assertRaises(ReleaseHold) as uat:
            deploy_uat(decision)
        self.assertEqual(str(uat.exception), "UAT deployment is not authorized")
        with self.assertRaises(ReleaseHold) as production:
            deploy_production(decision)
        self.assertEqual(str(production.exception), "production deployment is not authorized")
        self.assertFalse(release_gate.UAT_DEPLOY_GATE_ACTIVE)
        self.assertTrue(release_gate.UAT_MAIN_DEPLOY_SUPPRESSED)
        self.assertFalse(release_gate.OWNER_POLICY_ENFORCED)
        self.assertFalse(release_gate.PRODUCTION_AUTHORIZED)
        disguised = assess(
            verification_plane="SIMULATED_PASS",
            changed_paths=("docs/.github/workflows/ci.yml",),  # type: ignore[arg-type]
        )
        self.assertFalse(disguised.eligible)
        self.assertIn("control-plane change requires separate owner authorization", disguised.reasons)
        text = assess(verification_plane="SIMULATED_PASS", changed_paths="web/app/page.tsx")  # type: ignore[arg-type]
        self.assertFalse(text.eligible)
        self.assertIn("changed paths are missing", text.reasons)
        self.assertNotIn("control-plane change requires separate owner authorization", text.reasons)
        spaced = assess(
            verification_plane="SIMULATED_PASS",
            changed_paths=(" .github/workflows/ci.yml",),
        )
        self.assertFalse(spaced.eligible)
        self.assertIn("control-plane change requires separate owner authorization", spaced.reasons)


if __name__ == "__main__":
    unittest.main()
