---
title: 'Documentation 2.0 — final screenshot polish'
type: 'fix'
created: '2026-10-10'
status: 'ready-for-review'
baseline_commit: '9810de42254c7a7acad51327bb5b2a97b08da595'
---

## Intent

Make the 18 `/docs` screenshots professionally framed genuine product captures. Recapture only images that fail the quality bar. No landing redesign, no Platform Admin, no fabricated UI, no SendGrid/production changes.

## Audit (9810de42)

| File | Verdict | Reason |
|---|---|---|
| 01-login | KEEP | Clean Sign in |
| 02-dashboard | KEEP | Needs-attention dashboard |
| 03-activities-list | KEEP | New activity + cards |
| 04-activity-create | KEEP | New activity form |
| 05-form-studio-build | RECAPTURE | Composition only; missing Form/Build chrome |
| 06-activity-design | KEEP | Design + live preview |
| 07-form-studio-preview | RECAPTURE | Preview tab correct but form fields below fold |
| 08-share-kit | KEEP | Link + QR |
| 09-public-registration-desktop | KEEP | Public form |
| 10-public-registration-mobile | RECAPTURE | Join activity cut off |
| 11-clients-list | KEEP | Directory + statuses |
| 12-client-profile | KEEP | Sophia R. profile |
| 13-follow-up | KEEP | Due now / categories |
| 14-website-studio | RECAPTURE | Templates gallery, not builder/preview |
| 15-campaigns | RECAPTURE | Empty compose dominated by SendGrid banner |
| 16-analytics | KEEP | Filters + weekly report |
| 17-cohestra-ai | KEEP | Brief, not a chatbot |
| 18-settings | KEEP | Plan & limits + Settings nav |

## Approach

- Add `05b-form-studio-composition.png` so chrome and canvas are both real shots.
- Frame campaigns on Recipients + Subject/Message; if the isolated SendGrid banner remains in view, document it. Never edit pixels or change email config.
- Website: Skip tour, open Sections, use Split when available.
- Capture script waits for named UI and fails if missing.

## Never

- Image generation, Cinema, Platform Admin, production PII, merge/deploy without owner approval.
