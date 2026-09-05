# Intent: Live Proof Cinema — product fidelity

Handoff for `bmad-ux` **Update** on `ux-cohestra-2026-09-01`.
Source: brainstorm 2026-09-03 memlog. Chosen direction: **COMBO E→A**.

---

## 1. Problem

`/#crm` still reads as improvised mock, not live Cohestra product:

- Chapter pedagogy ships (large `01`/`06`, `CHAPTER N OF 6`, `SCROLL TO CONTINUE`) — pitch deck, not product.
- Left column = feature checklist brochure; right = sparse UI fragments → split brain.
- Mounts are cropped orphans on paper-warm with no browser/app chrome → postcards, not product windows.
- Density too low (few rows/tiles/bars + huge whitespace) → wireframe atmosphere.
- Initials-only pastel avatars; timeline as monospace log dump; WhatsApp as grey box; Website mint gradient with no photo.
- Seek pills float outside like marketing tabs; no painted selection/hover/focus; uniform soft shadows (no elevation hierarchy).
- Story 33.1 shipped data+mounts but deferred kill-chapter (33.2) and ProductFrame (33.3) — unfinished contract. DemoClub data alone did not buy fidelity.

---

## 2. Non-negotiables

- Visual fidelity is an **AC**: if Admin reads cheap, story fails even when DemoClub invariants pass.
- **Kill all chapter chrome** (watermarks, CHAPTER N OF 6, SCROLL TO CONTINUE). Feeling titles only.
- Every room mounts inside **ProductFrame** with URL bar (`riverside-rec.cohestra.app/…`). Prefer Cohestra app chrome over fake Mac traffic lights.
- Left copy = **Feeling → Scene → Proof** only; kill 4 checkmark cards. Shrink copy; product stage ~**65–70%**.
- Dense **read-only** product with inert overlay is safe — density/chrome > left-column bullets.
- One design system = real admin components + cinema-dense tokens. Stay light paper-warm; Cohestra tokens / lagoon accents only.
- Static DemoClub only (no live tenant iframe). Quality > coverage: ship fewer dense rooms if six cannot be dense.
- Fidelity = chrome + density + imagery + motion. Feel like Apple product pin of real software, not editorial magazine.

---

## 3. P0 / P1 fidelity rules

### P0 (encode first)

- Remove all chapter pedagogy chrome.
- Mandatory ProductFrame + URL bar on every room; stage backdrop darker/warmer, product window brighter; layered elevation (stage / frame / panel / chip).
- Replace checklist stack with one feeling line + one scene/proof line (museum wall-label copy).
- Enlarge product stage; shrink left column.
- Seek nav must not float as marketing tabs (move in-frame as P1; until then do not reinforce demo theater).

### P1

- Admin-parity density quotas (see §4); cinema-dense tokens — do not reuse empty-state spacing.
- Synthetic portraits for Elena/Sam/Jordan/Priya (local assets).
- Local community hero photo (`/public/demo/riverside-hero.webp`); **omit Website pill until photo exists** (mint gradient forbidden).
- Seek pills become in-frame module switcher inside ProductFrame top bar.
- Paint selected row / hover / focus statically (e.g. Elena lagoon ring); optional soft spotlight on climax CTA — no floating badges.
- Climax rooms (Follow-up / Clients) get richer chrome; others may be tighter crops. Optional subtle ProductFrame tilt (1–2°).

---

## 4. Per-room density / chrome minimums

| Room | Minimum chrome / density |
|------|--------------------------|
| **Clients** | Admin shell cues; ≥8 list rows clipped (not 4 floating); selected Elena row + focus ring; detail with TimelineEvent cards (not log dump) and/or registration cards |
| **Follow-up** | Outreach action bar primary; WhatsApp bubble + green accent + Open WhatsApp CTA; denser queue; louder status chips |
| **Dashboard** | Ghost sidebar; ≥5 queue rows; metric tiles without hollow whitespace; sparkline density; ops-board feel (not empty zen) |
| **Campaigns** | ≥4 rows + compose preview pane + segment chip + Send status (not 2-row spreadsheet snippet) |
| **Reports** | Filter bar/chips (e.g. This week · All activities) + CSV affordance + narrative hero; ranking not 3 bars then void |
| **Website** | Published URL (not Appearance toggle orphan); device/publish toolbar; hero photography; upcoming activities + times + inert Register CTA — **omit room until local hero photo exists** |

---

## 5. Explicit anti-patterns

- Chapter numbers / watermarks / SCROLL TO CONTINUE
- Feature checklist cards / checkmark pills
- Orphaned widgets without ProductFrame or device chrome
- Sparse mounts + more whitespace (“omit hollow UI” ≠ hollow atmosphere)
- Initials-only pastel avatar kit
- Mint / soft gradient Website hero (AI landing cliché)
- Seek pills outside the product as marketing tabs
- Inventing a second mock design system; purple glow; dark-mode cinema
- Live tenant iframe (PII/risk)
- Fake Mac OS chrome as the fidelity fix (prefer real Cohestra URL/app chrome)
- Equal sparse coverage of six rooms over two dense climax rooms

---

## 6. Epic 33 reorder impact

Current pain: 33.1 (data+mounts) led; 33.2 (kill-chapter) and 33.3 (ProductFrame) deferred → unfinished visual contract.

**Suggested order:** **33.2 → 33.3 first** (visual trust), then data/mount polish fills the frame. Do not add more mount polish ahead of kill-chapter + ProductFrame. Frame + kill-chapter should have led; data fills the frame.

---

## 7. Success test

Admin no longer reads `/#crm` as an improvised mock: each pin feels like a real Cohestra product window (URL bar, dense admin-parity UI, inhabited people/imagery, Feeling→Scene→Proof copy, zero chapter graffiti). Boringly like `/clients` = trustworthy. If Admin is still disappointed, AC failed regardless of DemoClub invariants.
