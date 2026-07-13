# Epic 5 Code Review



Status: done



## Review Findings



### Decision needed



- [x] [Review][Decision] **Consent enforcement on campaign send** — Non-consented clients are skipped server-side; segment preview counts only consented clients with email as deliverable.



- [x] [Review][Decision] **NullEmailSender success semantics in dev** — Campaign send blocked when `SendGrid:ApiKey` is empty; `NullEmailSender` returns failure if invoked directly.



### Patch



- [x] [Review][Patch] **Empty segment filters match entire client base** — `ClientSegmentQueryValidator` + `allClients` flag; UI blocks invalid segments via `isValidSegmentQuery`.



- [x] [Review][Patch] **SegmentPicker cannot combine filters (AND semantics)** — `mergeSegment()` stacks activity, status, community, and manual client filters.



- [x] [Review][Patch] **Email template edit missing in UI** — “Update selected” calls `updateEmailTemplate` on compose page.



- [x] [Review][Patch] **Send confirmation lacks recipient scope** — Confirm includes total, with-email count, and consent warning; send blocked when no emailable recipients.



- [x] [Review][Patch] **Report follow-up coverage ignores WhatsApp/campaign outreach** — `BuildFollowUpStatusAsync` aligned with dashboard outreach timeline logic.



- [x] [Review][Patch] **Whitespace-only emails miscounted in segment preview** — Preview uses trimmed non-empty email check matching send path.



- [x] [Review][Patch] **All-skipped campaigns marked Completed** — `sentCount == 0` → `CampaignStatus.Failed`.



- [x] [Review][Patch] **WhatsApp opens before timeline log succeeds** — API log runs before `window.open`.



- [x] [Review][Patch] **Subject/body length validation before send** — Validated in `CampaignService` and compose UI (200/8000).



- [x] [Review][Patch] **Campaign list has no detail view for failures** — List links to `/campaigns/[id]` with failed/skipped breakdown.



### Defer



- [x] [Review][Defer] **No CI workflow wiring SendGrid sandbox gate** — Validator exists; `.github/workflows` not present (pre-existing repo gap).



- [x] [Review][Defer] **Synchronous sequential send loop / no background job** [`CampaignService.cs`] — Acceptable MVP scale; revisit for large segments.



- [x] [Review][Defer] **Send-then-save without transaction** [`CampaignService.cs`] — Rare SaveChanges failure after partial sends; MVP tradeoff.



- [x] [Review][Defer] **No campaign send idempotency key** — Double-submit risk; defer until operator reports issue.



- [x] [Review][Defer] **Dashboard metrics cache not invalidated on outreach** [`RedisDashboardMetricsCache.cs`] — 60s TTL acceptable per Epic 4 pattern.



- [x] [Review][Defer] **Native `window.confirm` vs in-app dialog** — Functional for MVP; upgrade when Dialog component added.



- [x] [Review][Defer] **Zero automated tests for CampaignService/ClientSegmentService** — Matches Epic 3–4 defer pattern; add when campaign volume matters.



- [x] [Review][Defer] **SendGrid sandbox 2xx treated as delivered** — Expected sandbox behavior until production DNS ready.



- [x] [Review][Defer] **Failed email attempts omitted from client timeline** — Story 5.5 focuses on sent campaigns; failed sends visible in campaign detail only.



- [x] [Review][Defer] **WhatsApp phone normalization (+63 rules)** — Frontend strips digits only; align with registration normalizer in polish pass.



- [x] [Review][Defer] **Duplicate WhatsApp initiation events** — Low impact audit noise for MVP.


