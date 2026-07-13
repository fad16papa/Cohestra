# Activity Lead — Operator User Manual

End-user documentation for operators (no technical or deployment content).

## Files

| File | Format |
|------|--------|
| [Activity-Lead-Operator-Manual.docx](./Activity-Lead-Operator-Manual.docx) | Microsoft Word |
| [Activity-Lead-Operator-Manual.pdf](./Activity-Lead-Operator-Manual.pdf) | PDF |
| [activity-lead-operator-manual.md](./activity-lead-operator-manual.md) | Source (Markdown) |

## Regenerate DOCX and PDF

After editing the Markdown source:

```bash
cd docs/user-manual
python build-manual.py
```

Requires Python 3 with `python-docx` and `docx2pdf` (PDF export uses Microsoft Word on Windows).

## Scope

Covers: sign-in, dashboard, activities, forms, publish/QR, branding, communities, categories, public registration, clients, follow-up, campaigns, reports, settings, and common workflows.

## Screenshots

1. Capture PNGs using the checklist in [screenshots/README.md](./screenshots/README.md).
2. Save files into `docs/user-manual/screenshots/`.
3. Run `python build-manual.py` — images embed in DOCX and PDF automatically.

Missing images show a grey *Screenshot pending* placeholder until you add the file.
