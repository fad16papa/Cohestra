# Epic 19 PR sequencing — #437 then #438

**Do not merge either PR without explicit owner authorization.**

| PR | HEAD | Base | Draft | Required CI | Mergeable |
|----|------|------|-------|-------------|-----------|
| #437 | `54a98647` | `main` `f293650d` | yes | SUCCESS `38069185578` (6 checks) | MERGEABLE |
| #438 | this branch (see latest commit) | `main` `f293650d` | yes | SUCCESS on `e525103c` = `38128544095`; rerun after this push | — |

#437 is docs/reconciliation (19.3/19.5 stories, Oct 10 matrix). It does **not** close 19.1/19.2.

## Overlap (rebase #438 after #437)

Both PRs edit:

- `_bmad-output/implementation-artifacts/19-1-uat-droplet-deploy-and-smoke.md`
- `_bmad-output/implementation-artifacts/19-2-wildcard-tls-edge.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Keep #438’s 09:26 / EXPORT_ONLY / ID-compare / open-status text. Keep #437’s 19.3/19.5 story files and Oct 10 recon.

## After owner merges #437 at exact `54a98647`

```bash
gh pr merge 437 --merge --match-head-commit 54a98647263a276ebd6d12f14fa2dcc4144ab6d7
git fetch origin main
git rebase origin/main   # on cursor/story-19-1-19-2-acceptance-59c2
# resolve the three overlapping files; do not drop 09:26 evidence
# required CI + BMAD review on the new #438 HEAD
```

If #437’s HEAD moves, stop and re-verify. Do not merge #438 in the same motion.
