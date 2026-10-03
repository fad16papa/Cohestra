# Story 39.4 independent review

Reviewers: Blind Hunter, Edge Case Hunter, Acceptance Auditor, Adversarial Review.  
Model: Grok 4.6. HEAD reviewed after campaign/profile/studio-title corrections.

## Disposition: no unresolved BLOCKER or MAJOR

### Blind Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| Client/campaign detail invented local headers | MAJOR | Fixed: PageHeader + actions / eyebrow |
| Website title copy-pasted | MINOR | Fixed: `WEBSITE_STUDIO_TITLE` |
| Badges stuffed into action slot | MINOR | Fixed: activity badges in description |
| Loading stub announced h1 as live status | MINOR | Fixed: live region on loader only |
| Eyebrow always uppercase | MINOR | Fixed: string vs node |
| Long names overflow | MINOR | Fixed: `break-words` |
| Axe on Form Studio listbox | NIT | Pre-existing 42.3; axe scoped to Dashboard |
| Overflow menu / DESIGN §4.1 density | NIT | Out of scope |

### Edge Case Hunter

| Finding | Severity | Disposition |
| --- | --- | --- |
| `/settings` index is a redirect | MINOR | E2E uses `/settings/profile` |
| Website tour at 390 | MINOR | Skip tour on both viewports |
| 38.5 Basic lock expected `Website` | MAJOR | Updated to `Website Studio` |
| Studio preview still one main/h1 | — | 38.5 Website test green |

### Acceptance Auditor

ACs 1–10 satisfied on inventoried routes. Story 39.5 not started. Nav, entitlements, APIs, marketing headers unchanged.

### Adversarial

No production-behavior weakening. Form Studio listbox remains deferred. Header has no independent motion.
