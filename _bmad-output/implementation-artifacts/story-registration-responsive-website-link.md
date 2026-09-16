# Story: Registration responsive + optional tenant website link

## Acceptance criteria

- [ ] Public `/register/{slug}` and `/embed/register/{slug}` render without horizontal overflow at 320–1440px widths.
- [ ] Form Studio preview desktop width matches public renderer (`max-w-[480px]`).
- [ ] Basic: no Website connection section in Form Studio; API rejects `meta.showPublisherWebsiteLink: true`.
- [ ] Core/Pro: optional checkbox; default show link when meta unset; `false` hides link on public + confirmation.
- [ ] Downgrade Basic normalizes flag server-side; public behaves as feature absent.

## Implementation notes

- Persistence: `formSchema.meta.showPublisherWebsiteLink` (nullable bool).
- Server: `FormSchemaPlanGate.NormalizePublisherWebsiteLink`, `EnsureAllowed` / `ActivityService.EnsureFormSchemaPlanAllowedAsync`.
- Public: `resolveRegistrationPublisherWebsiteLink`; layout footer link Basic-only (`Explore Cohestra`).
