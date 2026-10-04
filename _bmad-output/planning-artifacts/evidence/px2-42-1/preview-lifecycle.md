# Story 42.1 preview lifecycle contract

Epic 37 AD-8.

- Editor `BuilderSurface` may remain mounted (`keepMounted`)
- Preview `BuilderSurface` uses `keepMounted={false}`
- Build mode and mobile Edit: preview unmounted, no draft render work
- Preview / mobile Preview: latest local draft via `previewPayload.published = draft`
- Split (≥1280): both panes visible; preview is not hidden
- 1024–1279: split unavailable; Build or Preview only
- Leaving Preview keeps `draft` in memory
- No second public renderer tree
- `SitePageRenderer` unchanged
- Route motion remains pathname-only
