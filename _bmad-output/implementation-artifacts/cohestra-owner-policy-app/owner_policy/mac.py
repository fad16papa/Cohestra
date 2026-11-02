"""Owner-side HMAC generator. Run on a machine Cursor does not control.

Example:
  python3 -m owner_policy.mac --repo fad16papa/Cohestra --pr 542 \\
      --sha ade3c8281e8a2ec82ef45771bc5b68df64901a41
"""

from __future__ import annotations

import argparse
import os
import sys

from .attestation import compute_mac
from .policy import load_policy


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Mint an owner HMAC attestation")
    parser.add_argument("--repo", required=True)
    parser.add_argument("--pr", required=True, type=int)
    parser.add_argument("--sha", required=True)
    parser.add_argument("--base", required=True, help="PR base ref, e.g. release/uat")
    parser.add_argument(
        "--secret-env",
        default="OWNER_ATTESTATION_SECRET",
        help="Environment variable holding the HMAC secret",
    )
    args = parser.parse_args(argv)
    secret = os.environ.get(args.secret_env, "")
    if not secret:
        print(f"missing {args.secret_env}", file=sys.stderr)
        return 2
    policy = load_policy()
    mac = compute_mac(
        secret,
        repo=args.repo,
        pull_number=args.pr,
        sha=args.sha,
        base_ref=args.base,
        version=policy.hmac_canonical_version,
    )
    print(f"OWNER_APPROVE_CONTROL_PLANE sha={args.sha} mac={mac}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
