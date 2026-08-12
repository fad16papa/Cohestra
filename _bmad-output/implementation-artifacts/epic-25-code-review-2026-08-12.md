# Code Review — Epic 25 Registration Experience Studio (2026-08-12)

Branch: `cursor/registration-experience-studio-4da3` vs `main`

## Summary

**0 decision-needed, 5 patch (4 applied), 4 defer, 3 dismissed**

### Patches applied in review follow-up commit

- Community rename no longer wipes brand kit (`BrandKitIncluded` flag on PATCH)
- Design tab preview uses draft inherit flag for community brand resolution
- `NormalizeAnswers` skips non-input `section_header` fields
- Backend requires non-empty label for `section_header` fields
- Integration test: rename-only PATCH preserves brand kit

### Deferred (pre-existing or v1 scope)

- Public activity cache not invalidated on community brand-kit update — inherited theme may lag until activity refresh
- Contrast validation on inherited community accent only warns client-side; server validates theme override only
- Legacy activity-level hero/accent fields no longer editable in Overview (Design tab + theme JSON path)
- Logo asset ID has no tenant ownership check on public asset URLs

### Dismissed

- Invalid preset coerced to classic — existing normalization behavior; integration test expectation may need alignment separately
- Intro “markdown subset” is plain-text paragraphs only — acceptable per PRD FR-RES-4.2 scope
- Immersive overlap without hero — minor layout edge case; low traffic preset
