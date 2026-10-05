# ATDD — registration responsive + tenant website link

## Plan matrix

| Case | Expected |
| ---- | -------- |
| Basic Form Studio | Website connection absent |
| Basic PUT true | 200, stored null |
| Basic public register | Renders and submits; no tenant website link |
| Core unchecked (false) | No public tenant link; `/register/{slug}` works |
| Core default / true | Tenant link uses current origin / slug |
| Pro | Same minimum as Core |
| Downgrade Core→Basic | Public ignores link; save still works |
| Upgrade Basic→Core | Control appears; schema intact |

## Responsive

| Width | Assert |
| ----- | ------ |
| 320, 360, 375, 412 | no overflow; submit in viewport |
| 768 | no overflow |
| 1366, 1440 | no overflow; column not full-bleed |
| Embed iframe 320 | form stays in frame |
| Unavailable 320 | no overflow |
| Confirmation 375 | no overflow |

## Preview

| Viewport | Assert |
| -------- | ------ |
| Mobile 390 | surface `@container` + max-w 390; columns `@sm` do not form two cols |
| Desktop poster | max-w 480 |
| Desktop centered | max-w 720 |

## Tenancy

Link builder uses current door slug / request origin only. No other tenant host.
