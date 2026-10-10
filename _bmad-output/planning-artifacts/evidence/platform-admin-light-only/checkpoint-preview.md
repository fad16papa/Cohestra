# Checkpoint preview — PlatformAdmin light-only after 44.9 rebase

Date: 2026-10-10
Workflow: bmad-checkpoint-preview
Model: Cursor Grok 4.6
PR: #431
Main: `1872baa60a687af762d1d157414cf7439f04dde7`

| Question | Expected | Actual |
|---|---|---|
| Is PlatformAdmin always light? | YES | YES |
| Can OS dark mode make PlatformAdmin dark? | NO | NO |
| Can a stored tenant dark preference make PlatformAdmin dark? | NO | NO |
| Does visiting PlatformAdmin erase the tenant's selected theme? | NO | NO |
| Can tenant/admin users still select Light/Dark/System? | YES | YES |
| Does Settings → Appearance still exist? | YES | YES |
| Do public registration and tenant websites retain theme behavior? | YES | YES |
| Is the owner-reported Platform Overview dark UI fixed? | YES | YES |
| Are 44.9 Version surfaces (actual/missing/error) light? | YES | YES |
| Does a long SHA overflow at 390? | NO | NO |

Verdict: CHECKPOINT PASS. Exact-head CI required. STOP before merge.
