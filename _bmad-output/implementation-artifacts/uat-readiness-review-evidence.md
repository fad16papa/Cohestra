# Recommendation: machine-verifiable BMAD/CAT-SEC evidence

Date: 2026-11-01 (Asia/Singapore)
HEAD at recommendation: `ead27b8149df24928faed650cb386733438164e0` plus follow-up env wiring

## Decision

Keep PR #535 as the **read-only consumer**. Accept authentic reviews from:

- distinct human OWNER/MEMBER/COLLABORATOR comments (unchanged), or
- two owner-installed GitHub Apps posting exact-SHA check-runs

Do **not** accept cursor[bot], PR author, github-actions, or one shared identity.

The **producer** that asks those apps to post checks after independent
Cursor BMAD and CAT-SEC runs is Issue #536 (separate DRAFT PR after an
architecture/security gate). This PR does not store app keys or change
GitHub permissions.

## Why not comments-only

Cursor Cloud currently posts as `cursor[bot]`. One bot cannot be two
independent reviewers. Relaxing the bot ban would let a single actor
satisfy both roles.

## Owner-only setup (no secret values)

Create/install two GitHub Apps with Checks write + Metadata read only.
Optionally pin slug/id repository variables. Keep private keys only in
the future #536 runner. Until both apps post, HOLD remains correct.
