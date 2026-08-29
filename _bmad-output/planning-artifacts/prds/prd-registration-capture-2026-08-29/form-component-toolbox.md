# Form component toolbox (event-shaped)

**Goal:** The Form tab is a **toolbox** — Operators pick the blocks their event actually needs. Not a survey lab. Not Tally’s full catalog.

**Still true:** one Form per Activity; Field `id` is the CRM key; Publish Gate still requires required phone or email; no canvas; no custom CSS; plan **caps** unchanged.

Slash palette groups match this file. Types are additive on `form_schema` version `1`.

---

## Already shipping

| Type | What it’s for |
|---|---|
| `text` | Name, short answer |
| `phone` | Mobile (country) |
| `email` | Email / dedup |
| `select` | Long list, one pick (how did you hear…, level) |
| `checkbox` | Single boolean (“first timer”) |
| `consent` | Legal / marketing copy + required tick |
| `referral_source` | Attribution list (options required) |
| `section_header` | Visual break, not an Answer |

---

## Wave 1 — Capture MVP + event gaps (all plans)

Ship with slash-add. These are why hosts still open Tally for a “simple” event.

| Type | Event job | Notes |
|---|---|---|
| `textarea` | Notes, medical, “tell us about your level” | Capture A |
| `date` | DOB, preferred session day | ISO date; no ranges in v1 |
| `hidden` | `?ref=`, UTM | Capture A |
| `number` | Party size, years playing, age | Integer or decimal; optional min/max |
| `url` | Instagram, club site, portfolio | Must parse as http(s) |
| `time` | Preferred start time | `HH:mm`; no timezone math |
| `choice` | 2–6 big options on mobile (Yes/No/Maybe, skill band) | Single pick; tap targets. Use instead of a 3-item dropdown |
| `yes_no` | First timer, bringing a guest, member | Two buttons; stores `true`/`false`. Cleaner than checkbox for questions |
| `multi_choice` | Dietary, which days they can come, interests | Several picks; min/max optional |
| `info` | Instructions, what to bring, waiver *text* | Display only (NonInput). Markdown-lite. Not an Answer |

`info` + `section_header` are the “layout” tools without a canvas.

---

## Wave 2 — richer events (Core+ unless noted)

| Type | Event job | Plan | Notes |
|---|---|---|---|
| `scale` | Tennis/pickleball level 1–5 | Core+ | Labeled linear scale. **Not** NPS. Labels: e.g. Beginner → Advanced |
| `country` | Nationality / residence | All | ISO country list; reuse phone-country data |
| `emergency` | Name + phone on one Field | Core+ | Compound Answer `{ name, phone }`. Still one Field id |
| `file` | Waiver PDF, student ID | Pro (Slice D) | Storage + scan; later |
| `signature` | Sign the waiver | Pro (with D) | Image of signature; same blob path as `file` |

---

## Wave 3 — only if a host asks (do not stock the palette “to look like Tally”)

| Type | Why wait |
|---|---|
| `image_choice` | Pick a session by photo — needs assets + a11y |
| `address` | Compound street/city; textarea + `info` covers v1 |
| `datetime` | Prefer `date` + `time` as two Fields |
| Display `image` | Design tab / intro already brand the page |

---

## Never (survey / other product)

| Tally block | Why not |
|---|---|
| NPS, CSAT, ranking, matrix, Likert-as-product | Surveys. Dilutes the toolbox. |
| Payment / Stripe | Ticketing. Paddle is tenant billing. |
| Calculated fields | Logic IDE. |
| Embed video/maps inside the Form | Public page + Design tab. |
| Personality / quiz | Not an event. |
| reCAPTCHA as a *Field* | Platform-level on POST, not a block Operators drag. |

---

## Palette (Operator `/` menu)

**Always (all plans)**  
Text · Long text · Number · Email · Phone · Link · Date · Time · Yes/No · Choice · Dropdown · Multi-choice · Checkbox · Consent · Referral · Country · Section · Info · Hidden

**Core+**  
Scale (1–5) · Emergency contact

**Pro (when D ships)**  
File · Signature

---

## How types map to a Client

Most new types stay in **Answers** only (like select). Extract to Client columns only for `text`/`textarea` name heuristics, `phone`, `email`, `consent`.  
`hidden`, `number`, `url`, `date`, `time`, `choice`, `multi_choice`, `scale`, `emergency` → Answers + registration history.

---

## Done when (toolbox)

1. Slash palette shows the Always group; a Basic Operator can add `number` + `yes_no` + `info` + `multi_choice` and publish.
2. `scale` and `emergency` are `plan_locked` on Basic.
3. Unknown types still reject. Existing Activities unchanged.
4. Public Form still one-thumb; `choice` / `yes_no` are large tap targets, not a new wizard.
