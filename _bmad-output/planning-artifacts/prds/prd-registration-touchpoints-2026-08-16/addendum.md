# Addendum — Registration Touchpoints

## Mechanism: email hero delivery stack

1. Outbox handler sets tenant context.
2. `RegistrationNotificationService` loads community via shared query.
3. `RegistrationThemeResolver.Resolve(theme, community, activity)` → hero URL.
4. `TryLoadHeroInlineAttachmentAsync` → CID if file on disk.
5. Else `ActivityHeroImageUrlResolver.ResolveForEmail` → absolute tenant URL.
6. Else null hero → email builder black header with **text** brand (SVG logo suppressed).

## Rejected alternative: always URL-based hero in email

**Why rejected:** Gmail/Outlook block remote images by default; CID inline is more reliable for campaign assets stored locally.

## Incident context (PR #198)

Public registration and share kit used resolved theme; email read `activity.HeroImageUrl` only. FNM registration showed broken Cohestra SVG in header because hero was null and default logo is SVG.

## Hardening backlog from party mode

- Extract `CommunityQueries.GetByLabelAsync` (FR-3).
- Clear stale clients on pagination overflow in admin clients list.
- Warning log when email sends with no hero after resolution (FR-4).
