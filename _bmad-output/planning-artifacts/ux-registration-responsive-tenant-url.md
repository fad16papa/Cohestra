# UX — Registration responsiveness + tenant website connection

Designer: Sally. Scope is this owner slice only.

## 1. Form Studio location (desktop)

Keep **Website connection** on the **Form** tab, after Closed message and before Close-at.

It is a publication/connection choice, not a Design token. Do not move it to Design, Overview, Website Studio, or the publish dialog.

## 2. Narrow admin

The existing Form Studio D7 composition owns admin chrome. This control is a stacked card + checkbox. No new drawer. On narrow admin it scrolls with the Form tab like Closed message.

## 3. Core / Pro control

- Eyebrow: `Website connection`
- Title: `Tenant website link`
- Body: optionally show a link to the Cohestra website on this registration page and confirmation. Registration still works through `/register/{slug}`.
- Checkbox: `Show link to my Cohestra website`
- Helper: `Visitors see a link to {hostname}.` using `publicSiteHostnameFromUrl` (no port, no uat/nginx/wildcard language).
- Optional. Default checked when meta is unset (legacy show). Uncheck writes `false`.
- Never blocks Save, Preview, or Publish.

## 4. Basic absence

If `!isCoreOrAbove(plan)` the entire section is not rendered. No disabled checkbox, locked field, upgrade chip, or fake URL box.

## 5. Preview relationship

Desktop / Tablet / Mobile toggles remain. The preview surface is a CSS container whose inline size is 390 / 768 / 720 (or 480 poster, 960 split). The public renderer inside must respond to **that** width. Do not scale a desktop layout. Confirmation remains reachable via simulated preview submit. Closed-state preview is out of scope (live `/register` when closed).

## 6. Public desktop

Centered/card/immersive: readable column, `max-w-[720px]`, not full-bleed fields. Poster: `max-w-[480px]`. Split: two columns from `lg` (1024). Labels, errors, long options wrap. No horizontal scrollbar. Theme tokens must not overflow.

## 7. Public mobile browser

At 320 / 360 / 375 / 390 / 412: full-width within page padding, stacked columns, touch-friendly controls, reachable submit, wrapping titles. One renderer — not a native app.

## 8. Long-form / validation

Long activity titles, option labels, and error text wrap (`min-w-0`, `break-words`). Errors stay in viewport. Scale / radio / checkbox groups wrap. Unavailable card and confirmation inherit the same overflow guards.

## 9. Embed

Embed is chrome-light and compact. It must size to the iframe/container, not assume `100vw` except the public-only split breakout (disabled in embed).
