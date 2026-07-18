# Cohestra — Operator User Manual

**Product:** Cohestra  
**Audience:** Community operators and event organisers  
**Version:** 1.0  
**Last updated:** June 2026

---

## About this manual

This guide explains how to use **Activity Lead** from sign-in through daily operations: running events, collecting registrations, following up with leads, sending email campaigns, and reporting results.

It does **not** cover installation, servers, or technical setup. Everything here is what you see and click in the application.

**Illustrated figures:** Screenshots appear throughout this manual. If a figure is not yet available in your copy, a placeholder line shows where the image will go — add PNG files under `screenshots/` and rebuild (see `screenshots/README.md` in the manual folder).

---

## Table of contents

1. [What Activity Lead does](#what-activity-lead-does)
2. [Signing in and your account](#signing-in-and-your-account)
3. [Navigating the application](#navigating-the-application)
4. [Dashboard](#dashboard)
5. [Activities](#activities)
6. [Building registration forms](#building-registration-forms)
7. [Publishing, QR codes, and public links](#publishing-qr-codes-and-public-links)
8. [Public branding](#public-branding)
9. [Communities and categories](#communities-and-categories)
10. [What participants experience](#what-participants-experience)
11. [Clients (master contact list)](#clients-master-contact-list)
12. [Client profile and follow-up](#client-profile-and-follow-up)
13. [Email campaigns](#email-campaigns)
14. [Reports and CSV export](#reports-and-csv-export)
15. [Settings](#settings)
16. [Common workflows](#common-workflows)
17. [Tips and conventions](#tips-and-conventions)
18. [Glossary](#glossary)

---

## What Activity Lead does

Activity Lead helps you:

- **Create activities** (events, sessions, sign-up drives) with custom registration forms
- **Publish a link or QR code** so people can register on their phone
- **Build one master client list** — repeat sign-ups from the same person are merged automatically
- **Track lead status** (New, Contacted, Active, Inactive) and follow up via WhatsApp or email
- **Send email campaigns** to consented leads in a community
- **View reports** and export data to CSV

There is **one operator account** per workspace. Participants do not need an account — they only fill in the public registration form.

---

## Signing in and your account

### First-time setup (create your operator account)

Use this only when the workspace has no operator yet.

1. Open the application URL provided to you.
2. You are directed to **Create your operator account** (or choose **Create your operator account** from the sign-in page).
3. Enter:
   - **Nickname** — how your name appears in the app (3–32 characters; letters, numbers, spaces, `-`, `_`, `.`)
   - **Email** — used for sign-in and verification
   - **Password** and **Confirm password** — at least 8 characters with upper case, lower case, and a number
4. Select **Create account**.
5. Check your email for a **6-digit verification code**.
6. Enter the code on the verification screen.
7. If you did not receive the code, use **Resend code**. To use a different email, choose **Use a different email**.
8. After verification you are signed in and taken to the **Dashboard**.

Only **one** operator account can exist. After setup, new sign-ups are blocked — use **Sign in** instead.

### Sign in

![Sign-in page](./screenshots/01-login.png)

1. Open the application URL.
2. Enter your **email** and **password**.
3. Select **Sign in**.
4. If your email is not verified, you are sent to the verification step first.
5. If your session expired, sign in again when prompted.

### Forgot password

1. On the sign-in page, select **Forgot password?**
2. Enter your email and select **Send reset code**.
3. Check your email for a **6-digit code**.
4. Enter the code, your **new password**, and **confirm password** on the reset screen.
5. Select **Reset password**.
6. Return to **Sign in** with your new password.

### Sign out

Open the **account menu** (top right, your initials) and select **Sign out**.

---

## Navigating the application

![Main navigation — sidebar and top bar](./screenshots/04-nav-sidebar.png)

### Main menu (left sidebar on desktop)

| Menu item | What it is for |
|-----------|----------------|
| **Dashboard** | Today’s overview, metrics, and quick actions |
| **Activities** | All your events and sign-up drives |
| **All activities** | List, search, and filter activities |
| **Communities** | Groups you organise (e.g. tennis club, board game night) |
| **Categories** | Labels for activity type (e.g. Social, Clinic) |
| **Clients** | Master contact list |
| **Campaigns** | Email broadcasts you have sent |
| **Reports** | Numbers, rankings, and CSV export |

On mobile, open the **menu** icon to reach the same items.

### Top bar

- **Page title** — where you are now
- **Updated time** — on the Dashboard, when metrics last refreshed
- **Search / command palette** — press **Ctrl+K** (or **⌘K** on Mac) to jump anywhere or start common tasks
- **Theme toggle** — Light, Dark, or System
- **Account menu** — Settings and Sign out

### Command palette quick actions

From the command palette you can quickly open:

- Compose new campaign
- Create activity
- Any main menu page

---

## Dashboard

![Dashboard overview with metrics and follow-up queue](./screenshots/03-dashboard.png)

The Dashboard is your home screen after sign-in.

### When you have no activities yet

You see a guided message:

1. Create an activity  
2. Publish and share the QR or link  
3. Follow up with campaigns  

Use **Create your first activity** or **Set up communities** to get started.

### When you have data

The Dashboard refreshes about every **60 seconds**. Sections include:

**Today strip** — up to three action chips, for example:

- New leads this period → opens filtered client list  
- Leads waiting for follow-up → clients with status **New**  
- Live activities → published activities  

**Needs follow-up** — up to five newest **New** leads with **View all** to see more.

**Quick actions**

- Browse clients  
- New campaign  
- View reports  

**Metric tiles** (click to drill down)

| Tile | Opens |
|------|--------|
| Total leads | Full client list |
| New (period) | Clients registered in the period |
| Active activities | Published activities |
| Follow-up coverage | Clients still marked **New** |

**Activity performance** — activities ranked by registrations.

**Community pulse** — communities ranked by lead volume; click a community for details.

**Recent campaigns** — last five sends with delivered / failed indicators.

---

## Activities

An **activity** is one event or sign-up drive (e.g. “FNM Tuesday”, “Board Game Night”).

### Activity list

![Activity list with search and filters](./screenshots/05-activities-list.png)

Open **Activities → All activities**.

**Search** by name, community, category, or location.

**Filters**

- **Status:** All, Draft, Published, Archived  
- **Category** and **Community** dropdowns  

Each card shows name, community, registration count, and status.

**Create activity** opens the creation wizard.

Lists show **25 items per page** with page controls at the bottom.

### Create a new activity (Step 1 of 3)

![Create activity — name, community, schedule, location](./screenshots/06-activity-create.png)

1. Select **Create activity**.
2. Enter **Activity name** (what participants will see).
3. Choose **Community** and **Category** (set these up first under Activities if needed).
4. Set **Schedule** (date and time).
5. Choose **Country** and enter **Location detail** (venue, address, or online note).
6. Select **Save draft activity**.

The activity is saved as **Draft** — not yet visible to the public. You continue on the **Form** tab.

### Activity detail — four tabs

Open any activity to see:

| Tab | Purpose |
|-----|---------|
| **Overview** | Publish, branding, summary |
| **Form** | Registration fields (Step 2) |
| **Registrations** | Who signed up |
| **QR & Link** | Share link and QR (Step 3) |

The header shows name, community, category, and status badge: **Draft**, **Published**, or **Archived**.

**Draft** activities show a banner: *Not live — publish to generate QR and link.*

### Activity statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Only you can see it; no public registrations |
| **Published** | Live form, QR, and link work |
| **Archived** | Closed permanently; history kept; cannot publish again |

### Registrations tab

View everyone who registered:

- **Registration ID** (for check-in)  
- **Registrant name** (links to client profile)  
- **Submitted** date and time  

Paginated at 25 rows. Empty until the first sign-up.

---

## Building registration forms

![Form tab — field editor and preview](./screenshots/08-activity-form.png)

Open the activity → **Form** tab (Step 2 of 3).

### Launch templates (draft only)

Three ready-made templates replace **all** current fields (you confirm before applying):

| Template | Best for |
|----------|----------|
| **TGH Tennis** | Tennis level, clinic interest, referral, consent |
| **Ikigai Pickleball** | First-timer, level, invited-by, referral, consent |
| **Board Game Night** | Residency, consent block, social handle, referral |

**Published** activities: templates are locked until you **Unpublish** from Overview.

### Add and edit fields

**Add field** types:

- **Text** — name, profession, free text  
- **Phone** — with country code  
- **Email**  
- **Select** — dropdown options you define  
- **Checkbox**  
- **Consent** — required agreement text  
- **Referral source** — how they heard about you  

For each field you can set:

- Label and placeholder  
- **Required** yes/no  
- Options (for Select / Referral)  
- **Phone country** default (Singapore is used if not set)  
- Consent wording (for Consent fields)  

**Reorder** fields by dragging the handle or using up/down arrows.

**Remove** fields you do not need.

### Save form

Select **Save form** when finished.

- Saved form applies to **new** registrations only.  
- Answers from earlier sign-ups are **not** changed.  

### Live preview

The preview shows how the public form will look (read-only).

### Publish requirements

Before you can publish, the **saved** form must:

1. Have at least one field  
2. Include at least one required **phone** or **email** field  
3. Pass validation (no duplicate field IDs, valid setup)  

Unsaved changes on the Form tab do **not** count — always **Save form** first.

The **Publish requirements** section on the Form tab shows whether you are ready.

### Archived activities

Forms on archived activities are **read-only**.

---

## Publishing, QR codes, and public links

### Publish an activity

1. Complete **Form** tab and **Save form**.  
2. Confirm publish requirements are met.  
3. Open **Overview** tab.  
4. Select **Publish activity**.  

Status changes to **Published**. The public path is shown (e.g. `/register/your-activity-name`).

### Unpublish

On **Overview**, select **Unpublish** and confirm.

- Public registration stops  
- Existing registrations are kept  
- You can edit the form and publish again  

### Archive

Select **Archive activity** (from Overview) and confirm.

- Registration closes permanently  
- Data is kept for reporting  
- Form and branding become read-only  
- You cannot publish again in the current version  

### QR & Link tab (Step 3 of 3)

![QR code and public registration link](./screenshots/11-activity-qr-link.png)

Available when **Published**:

1. **QR preview** — scannable code on white background  
2. **Public URL** — full link to copy  
3. **Copy public link**  
4. **Download PNG** — saves `{activity-name}-registration-qr.png` for print or social  

For **Draft** or **Archived** activities, these actions are disabled with an explanation.

---

## Public branding

![Public branding — hero image and accent color](./screenshots/12-activity-branding.png)

On **Overview → Public branding**, customise how the registration page and confirmation email look.

### Hero image

- **Upload image** — PNG, JPEG, WebP, or GIF  
- Or **paste an image URL** (must be a public link others can load)  
- Preview shows 16:9 cover  
- **Remove** clears the image  
- After upload or pasting a URL, select **Save branding**  

### Accent color

- Enter a **hex color** (e.g. `#5e6b2e`) or use the **color picker**  
- Applies to buttons and links on the **public registration page**  
- Select **Save branding**  

Archived activities: branding is read-only.

---

## Communities and categories

These labels organise activities and filter clients, campaigns, and reports.

### Communities

**Activities → Communities**

**Add community**

1. Enter name  
2. Select **Add community**  

**Table columns:** Community name, activity count, lead count, actions.

**Rename:** select **Rename**, edit, **Save** or **Cancel**.

**Delete:** only when **zero activities** use that community. If in use, delete is blocked — rename activities first or use **Rename** on the community.

**View leads:** opens community detail with searchable client list filtered to that community.

### Community detail

- Lead and activity counts  
- **Search** by name or nationality  
- Filter by **lead status**  
- Click a row → client profile  
- 25 rows per page  

### Categories

**Activities → Categories**

Same pattern as communities: add, rename, delete (only when unused). Categories appear when creating activities and in filters.

---

## What participants experience

You do not need to explain the app to participants — share the **link** or **QR** only.

### Opening the form

![Public registration form on a phone or browser](./screenshots/15-public-registration.png)

1. Participant opens your link or scans QR.  
2. They see activity name, schedule, location, community tag, and optional hero image.  
3. They fill in your custom fields.  
4. They submit.  

### Success screen

![Registration success with Registration ID](./screenshots/16-public-success.png)

- “You’re registered!” message  
- **Registration ID** with **Copy registration ID** (for check-in at the door)  
- Schedule and location recap  
- Note if confirmation email was sent  
- **Register another person** clears the form for a second entry  

### If registration is closed

Participants may see:

- Activity not found (wrong link)  
- Registration closed (draft, unpublished, or archived)  
- Try again (temporary load error)  

### What you see as operator

- New row on **Registrations** tab  
- Client on **Clients** list (new or updated if same phone/email)  
- Status usually **New** on Dashboard and follow-up queues  

**Duplicate rule:** one registration per person per activity. A second submit for the same person on the same activity is rejected.

---

## Clients (master contact list)

**Clients** is your single contact database across all activities.

### List view

![Clients list with search and lead status filters](./screenshots/17-clients-list.png)

**Search** by name or nationality.

**Filters**

- Nationality  
- Lead status: New, Contacted, Active, Inactive  

**Sort** by name, status, or last registration.

**Quick action:** for **New** leads, **Contacted** on the row marks them Contacted (with undo in a toast).

**25 clients per page.**

### Lead status meanings

| Status | Typical use |
|--------|-------------|
| **New** | Not yet reached out |
| **Contacted** | First touch done |
| **Active** | Engaged participant |
| **Inactive** | No longer active |

Status affects dashboard metrics, filters, reports, and campaign segments.

### Merge-suspect flag

If the system flags a possible duplicate, a banner appears on the profile. Use **View merge-suspect clients** to compare records manually. There is no automatic merge button — review and update the master profile as needed.

---

## Client profile and follow-up

![Client profile — follow-up panel, master profile, timeline](./screenshots/18-client-profile.png)

Open a client from the list or from a registration row.

### Header

- Name and avatar initial  
- **Lead status** badge  
- **Lead status** dropdown — change anytime  

### Follow-up panel

- Status and **Needs outreach** hint for **New** leads  
- **Last registration** summary  
- Phone number  
- **Mark contacted** (for New leads)  
- **Open WhatsApp** — logs the action and opens WhatsApp chat  

### Master profile

View consolidated fields: name, phone, email/social, profession, nationality, residency, consent, referral source, notes.

**Edit profile** → change fields → save. Corrections apply to the master record; past registration answers stay as submitted.

### Registration history

List of activities this person joined (newest first). Select one to see all answers captured on that form and the **Registration ID**.

### WhatsApp follow-up

After opening WhatsApp you can record:

- Follow-up status: **Contacted** or **Awaiting reply**  
- Optional note  
- **Save follow-up status**  

### Relationship timeline

Newest events first:

- Registration submitted  
- Lead status changed  
- Email campaign sent  
- WhatsApp chat opened  
- WhatsApp follow-up recorded  
- Operator notes where applicable  

---

## Email campaigns

### Campaign list

**Campaigns** shows past sends: subject, date, delivered count, failed count. Click a row for details. **New campaign** starts compose.

If email is not fully configured, a **checklist banner** appears — complete items in **Settings → Email delivery** before sending.

### Compose a campaign

![Campaign compose — choose recipients and segment](./screenshots/21-campaign-compose-recipients.png)

#### Step 1 — Choose recipients

1. Select **target community** (required).  
2. Preview shows: consented leads, ready to send (has email), missing email.  
3. Optionally **refine** with filters (all must match): name/email search, nationality, profession.  
4. Optionally add **additional recipients** outside the community (must have consent and email).  
5. Review **Sending to** list — each person shows **Ready** or **Skipped** with reason.  
6. **Reset** clears targeting.  

**Consent rule:** only people who gave consent on a registration form are included.

#### Step 2 — Write the message

![Campaign compose — subject, message, and preview](./screenshots/22-campaign-compose-message.png)

1. Enter **subject** (length limit applies).  
2. Compose **message** in the rich editor (formatting and images supported).  
3. **Preview** — desktop and mobile views.  
4. **Send test to me** — sends to your operator email.  

#### Step 3 — Templates (optional)

- **Load template** from saved list  
- Edit and **Save template**, **Update template**, or **Delete template**  

#### Step 4 — Send

1. **Send campaign**  
2. Confirm recipient count in the dialog  
3. Review result: sent / failed counts; expand failures for details  

**Send is blocked when:** no community selected, no consented recipients with email, empty subject or body, message too large, or email delivery not ready.

### Campaign detail

After sending, view:

- Subject and sent time  
- Totals: sent, failed, skipped  
- Full message body  
- **Recipients** table: name (link to client), email, status, failure reason  

---

## Reports and CSV export

![Reports — filters, summary tiles, and rankings](./screenshots/23-reports.png)

**Reports** answers “how did we do?” for a date range and filters.

### Date range

- **This week** (default)  
- **This month**  
- **Custom range** — pick start and end dates (both required)  

### Filters (combine with AND logic)

- Activity (one or all)  
- Community  
- Lead status  
- Referral source  

**Filter chips** show active filters; remove individually or **Clear all**.

The report reloads when filters change.

### Report sections

**Summary tiles** (clickable): Registrations, New leads, Activities hosted, Follow-up coverage.

**Lead growth:** new leads in period, cohort size, existing before period, repeat participants, inactive in cohort.

**Follow-up status:** counts by New / Contacted / Active / Inactive.

**Activity ranking:** top activities by registrations.

**Community ranking:** top communities by registrations.

**Campaign results:** campaigns sent and failures in the period (when applicable).

If nothing matches, widen the date range or clear filters.

### Export CSV

1. Set filters and wait for the report to match.  
2. **Export CSV** (enabled when registrations > 0).  
3. File downloads with all active filters applied; a toast confirms row count.  

Use CSV in Excel or Google Sheets for deeper analysis.

---

## Settings

![Settings — appearance, brand accent, password, email delivery](./screenshots/24-settings.png)

Open **Settings** from the account menu.

### Appearance

Choose **Light**, **Dark**, or **System**. Same as the top bar theme toggle; preference is saved to your profile.

### Brand accent

Customise accent color for **your admin workspace** (buttons, toasts, dashboard highlights — lead status colors stay fixed).

- Pick a **preset** or enter **custom hex** → **Apply custom**  
- **Reset to default forest** removes custom accent  

### Password

Change your operator password: current password, new password, confirm → **Update password**.

### Email delivery

Checklist for email sending readiness (sender verification, domain setup). Status icons: complete, action required, warning, info. When ready, sender name and email are shown.

Complete any **action required** items with your email provider before large campaigns.

---

## Common workflows

### Launch a new activity end-to-end

1. **Activities → Communities / Categories** — create labels if needed.  
2. **Create activity** — name, schedule, location → **Save draft**.  
3. **Form** tab — template or custom fields → **Save form**.  
4. **Overview** — optional **Public branding** → **Save branding**.  
5. **Publish activity**.  
6. **QR & Link** — copy link or download QR.  
7. Share at the event; watch **Registrations** and **Dashboard**.  

### Follow up on new leads

1. **Dashboard → Needs follow-up** or filter clients by **New**.  
2. Open client profile.  
3. **Open WhatsApp** or include in a **campaign**.  
4. **Mark contacted** or change lead status.  
5. Save **WhatsApp follow-up status** if needed.  
6. Check **timeline** for history.  

### Send a community email

1. Confirm **Email delivery** checklist is ready.  
2. **Campaigns → New campaign**.  
3. Select **community**; refine filters if needed.  
4. Write message; **Preview** and **Send test to me**.  
5. Optionally save as **template**.  
6. **Send campaign**; review failures on detail page.  

### Monthly reporting

1. **Reports → This month** (or custom range).  
2. Add filters (community, activity, status, referral).  
3. Review rankings and metrics.  
4. **Export CSV** for records.  

---

## Tips and conventions

- **Save often** on forms and branding before publishing.  
- **Registration answers cannot be edited** after submit — fix master profile for corrections; timeline records changes.  
- **Archived** activities stay in reports but cannot accept new sign-ups.  
- **Pagination:** large lists show 25 rows per page.  
- **Toasts** confirm saves and sends; some actions offer **Undo**.  
- **Command palette (Ctrl+K)** is the fastest way to jump pages.  
- **Public registration** works on mobile — test your QR before the event.  
- **Registration ID** on the success screen helps door check-in.  

---

## Glossary

| Term | Meaning |
|------|---------|
| **Activity** | One event or sign-up drive with its own form and link |
| **Registration** | One person’s sign-up for one activity |
| **Client** | Master contact record; may have many registrations |
| **Community** | Group label (e.g. club or programme name) |
| **Category** | Type label (e.g. Social, Workshop) |
| **Lead status** | New, Contacted, Active, or Inactive |
| **Campaign** | One email send to a selected audience |
| **Consent** | Permission captured on the form to contact someone |
| **Registration ID** | Check-in code shown to participant after sign-up |
| **Draft** | Activity not yet public |
| **Published** | Activity live for registration |
| **Archived** | Activity closed; history only |

---

*Cohestra — Operator User Manual*
