# Reverse-chain tests

Brutal QA from cinema doctrine. If the chain snaps, the cinema is lying.

## Chain

```text
AI recommendation (or stubbed seed fact)
  ↓
Analytics pattern
  ↓
Follow-up state
  ↓
Activity history (registration / attendance)
  ↓
Client record
  ↓
Original acquisition (source)
```

## Required coverage

For **each** Anchor (Maya, Daniel, Priya, Marcus, Sarah), a test walks the chain and asserts:

1. **Acquisition** on Client matches the arc (Instagram / Referral / Website / …).
2. **Activity** history contains the expected Anchor event outcomes (check-in, no-show, decline, …).
3. **Follow-up** bucket/state matches history (and Marcus cannot be WhatsApp-eligible).
4. **Analytics** aggregates that mention the person or their cohort remain consistent with (2)–(3).
5. **AI layer** (when product surface exists): recommendation cites only facts present in (1)–(4). Until then: seed exports a `intelligenceFacts[]` (or equivalent) used by future mount — still reverse-chain tested; **no cinema-only narrative**.

## Failure modes (must fail CI)

- Website 34 ≠ Activities regs for Golden Hour Run
- Anchor appears in Follow-up Due now without history explaining why
- AI/stub recommends WhatsApp to Marcus
- Referral “best source” claim while seed math shows otherwise
- Timeline event references unknown `activityId` / `clientId`
- Room uses a person/event absent from the seed module

## Harness placement

Extend `web/lib/marketing/marketing-demo-club.test.ts` (or `marketing-demo-club.continuity.test.ts`) with explicit reverse-chain cases per Anchor. Keep tests data-driven from the JSON module.

## Gate for room “done”

Before any mount story marks a room done, reverse-chain for Anchors touching that room must be green (doctrine five truths still apply at mount time).
