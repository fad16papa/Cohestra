# Forge: Apex login must work from localhost

## Persona pressure

**Operator:** "I bookmarked localhost:8088/login. Same email and password work on creativorare.localhost — why does generic login insult me with 'multiple workspaces'?"

## Hard questions

- Is default membership a real workspace or bootstrap noise? → **Bootstrap noise** for self-serve tenants.
- Should one human operate two real workspaces from one email? → **Rare**; picker is follow-up, not blocker for 99% case.
- What breaks if we drop default from apex resolution? → Default-only operators still log in directly to default.

## Verdict

**Ship filter + backfill guard.** True multi-workspace (2+ real slugs) keeps explicit error until picker exists.
