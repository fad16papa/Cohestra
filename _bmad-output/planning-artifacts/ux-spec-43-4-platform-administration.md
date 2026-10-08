# UX 43.4 — Platform administration (delta)

## Identity

Sparse staff console. Ink header, gold wash, no tenant sidebar, no route-enter motion.

## Header

Desktop + mobile: Tenants / Support with `aria-current`, support badge, email, Sign out. Mobile menu 44×44, labelled, closes on navigate. Focus visible on ink (light ring). "Cohestra" + "Platform" are product context, not h1.

## Directory

Search, filters (status + billing including OnHold), Create tenant, omni search, scoped table. At 390: wrap controls, no page overflow, slug readable. Status/Billing cells include operator phrases when Suspended / OnHold.

## Tenant detail

Identity, Status (Suspended = Workspace paused.), Billing (OnHold = Billing is on hold.), snapshot, lifecycle, complimentary, scoped audit table. Archive uses AlertDialog. Suspend stays two-step reason. Recovery uses AlertDialog.

## Support

Inbox / detail / report stay operational. Token/focus/empty/error/390 only. Table scoped scroll. Do not hide issue/tenant/operator/subject/status/created.

## Empty / error

Keep sparse Platform voice. Errors: what happened, what it means, what to do. Do not force tenant EmptyState chrome.
