# Forged idea — Billing plan symmetry

## Locked

- **Single deferral rule:** defer when tier rank drops OR same tier + annual→monthly.
- **Symmetric copy:** “Switch to X now” / “Switch at period end” — not “Upgrade” vs “Downgrade”.
- **Confirm before defer:** checkout AlertDialog matches Settings pattern.
- **Scheduled guard:** match plan **and** interval before blocking duplicate schedule.

## Killed

- Making Core→Pro deferred at period end (hurts conversion; industry norm is immediate upgrade).
- Plan-specific code paths for Core vs Pro (unnecessary — direction-based rules suffice).

## Cracks held

- Tier upgrade + interval downgrade combo (Core annual→Pro monthly) stays **immediate** — tier upgrade wins.
