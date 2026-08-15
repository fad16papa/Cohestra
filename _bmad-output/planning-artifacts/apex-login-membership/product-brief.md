# Product Brief: Universal operator login entry

## One-liner

Any operator with one real workspace signs in from `localhost:8088/login` or their slug URL — same credentials, same outcome.

## Problem

Default-tenant backfill creates phantom second memberships. Apex login rejects valid operators with a confusing multi-workspace error.

## Success

- creativorare operator: localhost login → handoff → dashboard (same as slug login)
- Default-only seed operator: localhost login → tokens or handoff to default
- True multi-workspace operator: clear message to pick workspace URL (unchanged)

## Out of scope

Workspace picker on apex login; removing default tenant; changing creativorare seed data.
