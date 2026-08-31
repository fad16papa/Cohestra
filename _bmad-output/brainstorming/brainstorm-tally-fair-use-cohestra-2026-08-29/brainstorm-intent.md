# Intent: Tally-style fair use for Cohestra

**Question:** Can we pattern Cohestra on Tally’s fair use? Admin’s read: Tally FUP is more competitive than what we offer.

**Answer (working):** Yes — steal the **philosophy**, not the number.

## Facts

| Meter | Tally free | Cohestra Basic | Core | Pro |
|---|---|---|---|---|
| Registrations / month | Soft ~50k, 3–4 months, then *talk* + custom quarterly plan | **250 hard** (public submit can fail) | **500 hard** | **5,000 hard** |
| Forms / activities | Unlimited | 4 published | 12 | 50 |
| What they sell | Branding, teams, CSS, partials ($29/$89) | Website, seats, campaigns ($15/$30) |

Tally [Fair Use](https://tally.so/help/fair-use-policy): 50k subs, 100 GB uploads/mo or 500 GB stored, 50k notify emails; seat-sharing Pro/Business outside org banned. Occasional spikes OK.

Cohestra enforces `TenantPlanLimits` (`250 / 500 / 5000`) on public Registration.

## Steal

- Don’t hard-kill the **job** (a person signing up Saturday).
- Meter **infra** (email, files, abuse) and **depth** (seats, site, campaigns).
- Soft: warn → talk → custom/Enterprise. Don’t 403 the QR.

## Don’t steal

- 50,000 as a magic competitive number.
- Making Basic a Tally clone (unlimited everything, pay for logo).
- Quarterly custom invoices before we have ops.
- Fair use without bot friction (gift to scrapers).

## Patterns to pick (not all)

- **B (recommended):** Unlimited registrations on Core/Pro (and maybe Basic). Keep seat / community / activity / campaign / website gates. Fair-use *talk* only if a tenant looks like a factory.
- **C:** Never fail public submit for plan limit; overage in admin + Paddle later.
- **E:** Basic gets generous/soft capture so Francis doesn’t open Tally; paid plans sell the club OS.
- **D:** 10× the hard numbers — weaker, faster.

**Do not** meter Clients stored (that taxes the wedge).

## Downstream

If Admin picks B or C: pricing page + `TenantPlanLimits` + public submit path + a fair-use help article. Not Registration Capture FRs. Separate billing/plan PRD slice.
