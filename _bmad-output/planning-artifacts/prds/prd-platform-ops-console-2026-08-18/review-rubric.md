# PRD Quality Review — Platform ops console v2

## Overall verdict

This is a strong internal-tool PRD with a clear thesis (“Platform Admin supports a club **without becoming the club**”), honest non-goals, and unusually good FR done-ness via explicit Consequences blocks. It is ready to feed epic/story creation. What is at risk: three open questions (OQ-1, OQ-3, OQ-4) still affect snapshot completeness and the UJ-2 reply loop before stories freeze, and primary success metrics lean on qualitative/diary measurement rather than instrumented thresholds.

## Decision-readiness — strong

The PRD states decisions as decisions, not considerations. §5 Non-Goals kills impersonation, Stripe writes, a second app, and public cannot-sign-in intake with explicit rationale tied to enterprise constraints (“enterprise A-5 / FR-7”). The addendum’s Rejected alternatives table names what was given up (login-as, Intercom, auto-create Tenant Admin) with “Why killed” — not neutral “we considered X.” Vision §1 names the trade-off Francis faces today: “every ‘just open their workspace’ habit fights tenant isolation and the two-door login model.” Deferred tensions are surfaced as real Open Questions (OQ-2 suspend email: “Legal notice vs surprise 403”), not rhetorical prompts.

The one soft spot is OQ-1 (filer in-thread reply), where UJ-2’s climax already carries an `[ASSUMPTION: v1 Reply is ops→filer only…]` while §8 still lists the question as open and §6.2 says MVP can ship without filer reply. That is honest scope hedging, but a decision-maker cannot tell whether “cheap Settings add comment” is in or out of MVP without a PM call.

### Findings
- **medium** Filer-reply path unresolved at MVP boundary (§6.2, §8 OQ-1, UJ-2 climax) — MVP done criteria say filer reply is optional (“not required to call MVP done if email+new ticket remains the path”), but UJ-2’s climax assumes ops→filer only. *Fix:* Decide yes/no for MVP and either close OQ-1 or add `[NOTE FOR PM]` at §6.2 stating the default if OQ-1 stays open at story freeze.
- **low** Suspend-notification trade-off deferred without PM flag (§8 OQ-2) — Legal vs surprise-403 tension is named but has no `[NOTE FOR PM]` or explicit “decide before FR-OC-4 ships” hook. *Fix:* Add a one-line decision deadline or tie OQ-2 to an existing lifecycle FR owner.

## Substance over theater — strong

Content is earned, not template furniture. Vision §1 is product-specific (apex `auth_session` overwrite, Gmail `SUP…` matching, “does not become Intercom”). Personas are minimal and decision-driving: Francis (sole ops), Filer, locked-out Operator in UJ-3 — not a four-persona parade. The addendum’s research digest cites Stripe/Vercel/Clerk patterns to justify the anti-impersonation bet rather than claiming novelty. FR consequences carry product-specific bounds (403 on `/api/v1/admin/*`, append-only Reply, no Client table scan) instead of generic “secure and scalable” NFR boilerplate.

### Findings
- **low** Primary metrics are deliberately un-instrumented (§7 SM-1, SM-2) — SM-1 target is “Francis can describe the club from Snapshot” with `[ASSUMPTION: measured by ops diary in v1, not analytics]`; SM-2 allows “qualitative OK” for duplicate-ticket rate. Appropriate for a solo-operator v1, but thin for post-launch validation. *Fix:* Accept as v1 constraint or add a lightweight counter (e.g., count of `{slug}` host sessions per resolved Issue in audit logs).

## Strategic coherence — strong

The PRD has a single thesis threaded through every section: ops visibility and recovery without tenant JWT or impersonation. Feature build order in §6.1 follows that arc (Snapshot → Reply+email → Recovery → Findability → Create → audit readability), matching the problem (“guess from ticket” / “sign into `{slug}/dashboard`”) to the solution stack. Success metrics validate the thesis: SM-1 measures avoidance of tenant-host auth; counter-metric SM-C3 (“Platform Admin sessions on `{slug}` hosts — should stay rare”) guards against optimizing the wrong behavior. MVP scope kind is problem-solving platform capability for a brownfield extension of enterprise FR-2/FR-7/FR-18 — scope logic matches.

No findings — dimension holds without gaps that change usefulness.

## Done-ness clarity — adequate

This is the PRD’s strongest structural choice: every FR includes a **Consequences (testable)** block with verifiable conditions (400 on empty Reply, 409 on already-verified member, PlatformAdminOnly routes). That gives story authors clear acceptance hooks.

Gaps remain where open questions leak into FR text without bounds. FR-OC-1 lists “last public registration timestamp if stored or queryable” while OQ-4 asks whether `LastActivityAt` suffices — engineers cannot know which field ships. FR-OC-1 and UJ-1 edge case depend on `isDemoOrLoadTest`, but OQ-3 leaves the predicate undefined (“slug prefix `load-` / seed flag / complimentary+demo”). FR-OC-7 says rate limits are “same as self-serve resend (or stricter)” without defining stricter.

### Findings
- **high** `isDemoOrLoadTest` predicate undefined (§8 OQ-3, FR-OC-1, UJ-1 edge case) — Snapshot and load-test filter (FR-OC-9) both reference the flag; implementation and UAT cannot pass without a decided rule. *Fix:* Close OQ-3 with one predicate (or document all three OR’d) before FR-OC-1/FR-OC-9 stories freeze.
- **medium** Last registration field ambiguous (§8 OQ-4, FR-OC-1 consequences) — “if stored or queryable” leaves two acceptable done states. *Fix:* Pick `LastActivityAt`-only for v1 (per Assumptions Index) or add explicit query requirement to FR-OC-1 consequences.
- **low** Recovery rate-limit ceiling unspecified (FR-OC-7) — “or stricter” has no testable bound. *Fix:* State “same caps as self-serve” or name a numeric ops cap.

## Scope honesty — strong

Omissions are explicit and indexed. §5 Non-Goals and §6.2 Out of Scope for MVP name deferred items (public cannot-sign-in form, filer in-thread reply, complimentary end-date, default hide load-test). Eight `[ASSUMPTION]`-backed inferences are collected in §9 Assumptions Index with roundtrip coverage for all inline tags. Per-FR Out of Scope blocks (e.g., FR-OC-1: “Live tail of operator UI,” “Stripe customer portal”) prevent silent scope creep.

Open-items density (4 OQs + 8 assumptions) is proportionate for a brownfield epic extending an enterprise PRD, not a green-light-to-build consumer launch.

### Findings
- **low** Index-only assumption not tagged inline (§9 first bullet: “Fast path: forge + brainstorm intent are the brief”) — Assumptions Index roundtrip is otherwise clean; this entry has no matching `[ASSUMPTION]` in the body. *Fix:* Add inline tag in §0 Document Purpose or drop from index.

## Downstream usability — adequate

Glossary §3 is present and domain nouns are used consistently (Tenant Snapshot, Filer, Recovery Action, Omni-search). FR-OC-1 through FR-OC-11 are contiguous and unique; UJ cross-references in §4 resolve. Each major section can be extracted standalone with glossary terms carrying context.

Friction for story authors: UJ-4 (“Sales asks for a pilot workspace”) omits the **Persona + context** header used in UJ-1/2/3, so the protagonist is implicit. UJ-2 lists “Operator who filed from Settings Help” as persona but the journey title names Francis — minor protagonist drift between title and body.

### Findings
- **medium** UJ-4 missing named protagonist block (§2.3 UJ-4 vs UJ-1/2/3) — Sales-driven provisioning is a distinct entry state; without persona/context, story acceptance may omit the “who asks” handoff. *Fix:* Add “Persona + context: Francis (ops) on request from Sales” to match sibling UJs.
- **low** UJ-2 title vs persona mismatch (§2.3 UJ-2) — Title says “Francis replies”; persona line names the Filer. *Fix:* Split into operator-visible outcome in title (“Filer sees ops Reply”) or add Francis to persona line.

## Shape fit — strong

Product type is a single-operator internal console (§2.1: “One human Platform Admin, weekday Gmail + `/platform`”). The PRD uses capability-spec FRs with five focused UJs — appropriate load for epic/story authors without over-formalizing a ten-person support org. Brownfield parent traceability (§0: enterprise FR-2, FR-7, FR-18, UX-DR16, A-5) is accurate and distinguished from new FR-OC-* scope. Mechanism detail is correctly relegated to addendum (“Not PRD. Mechanism, research, rejected alternatives”), keeping the PRD requirements-clean.

No findings — shape matches stakes and downstream chain (epics → stories; optional UX for Snapshot card noted in §11).

## Mechanical notes

- **Glossary drift:** None observed — “Platform Admin,” “Filer,” “Issue Number,” and “Tenant Snapshot” are stable across §2–§4 and §7.
- **ID continuity:** FR-OC-1…11 contiguous; UJ-1…5 contiguous; SM-1…4 and SM-C1…C3 present. Enterprise cross-refs (FR-2, FR-7, FR-18, UX-DR16, A-5) are parent pointers, not broken internal refs.
- **Assumptions Index roundtrip:** Six inline `[ASSUMPTION]` tags in body; all six indexed. One index-only entry (“Fast path: forge…”) lacks inline tag — see Scope honesty finding.
- **UJ protagonist naming:** UJ-1, UJ-3, UJ-5 name Francis explicitly; UJ-2 names Filer in persona line; UJ-4 has no persona block.
- **Required sections:** Present for agreed stakes — Vision, Target User/JTBD/UJs, Glossary, Features/FRs, Non-Goals, MVP scope, Success Metrics with counter-metrics, Open Questions, Assumptions Index, Source Trace. No standalone NFR section; security/performance bounds live in FR consequences (appropriate for this shape).
