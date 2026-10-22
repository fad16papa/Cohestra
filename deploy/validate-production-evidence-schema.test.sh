#!/usr/bin/env bash
# Evidence may record names, SHAs, run ids, and PASS/FAIL only.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EVIDENCE="$ROOT_DIR/_bmad-output/implementation-artifacts/evidence/46-3"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

[[ -d "$EVIDENCE" ]] || fail "46.3 evidence directory missing"

if grep -RniE 'BEGIN (OPENSSH |RSA )?PRIVATE KEY|-----BEGIN|ghp_[A-Za-z0-9]|github_pat_|PROD_DROPLET_SSH_KEY=.+|DROPLET_SSH_KEY=.+' "$EVIDENCE"; then
  fail "evidence must not contain key or token material"
fi
if grep -RniE 'ssh -|debug1:|OpenSSH_|command-line' "$EVIDENCE"; then
  fail "evidence must not contain SSH transcripts"
fi
pass "46.3 evidence has no secret-like keys or SSH logs"

echo "validate-production-evidence-schema contract OK"
