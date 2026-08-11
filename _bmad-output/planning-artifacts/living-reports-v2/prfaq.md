# PRFAQ: Cohestra Living Reports

## Press release (future headline)

**Cohestra Reports now tell you what happened — and what to do next**

Operators open Reports and see a plain-language briefing: registrations up or down, follow-up coverage health, and top-performing activities — with charts and prior-period comparison. CSV export still uses the exact same filtered data, so the story and the spreadsheet agree.

## Customer FAQ

**Q: Is this just prettier charts?**  
A: No. Every sentence and tile comes from the same filtered cohort as your CSV. We show when data was computed and how many clients are in scope.

**Q: What if last week had zero registrations?**  
A: We show "n/a" for percent change instead of a misleading +100%.

**Q: Can I share this with my board?**  
A: Export CSV today; scheduled PDF/email is planned for a follow-up release.

## Internal FAQ

**Q: What's new in the API?**  
A: `priorPeriod` and `dailyTrend` on `GET /api/v1/admin/reports`.

**Q: Performance risk?**  
A: Two additional query windows (prior period + in-memory daily grouping). Monitor; cache later if needed.

**Q: Pro "saved views"?**  
A: Not in v1. URL query params remain the share mechanism until Phase 2.

## Verdict

**Hardened for v1.** Narrative + trust + comparison + charts address the "dull download page" problem without over-promising AI or saved views yet.
