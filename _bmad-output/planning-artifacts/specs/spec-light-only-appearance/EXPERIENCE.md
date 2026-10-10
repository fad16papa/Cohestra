# EXPERIENCE — Light-only application appearance

Date: 2026-10-10
Workflow: bmad-ux (Sally)
Model: Cursor Grok 4.6

## Decision

Remove the application-theme control entirely. Do not leave a disabled sun, a Light-only radio, or a dead Appearance nav item.

## Surfaces

| Surface | After |
|---|---|
| Admin top bar | Search + user menu; no hole for the old toggle |
| Auth header | Wordmark / tenant brand only |
| Public registration footer | Byline + website link; no theme slot |
| Tenant website | Branding and CTAs unchanged; no appearance control |
| Settings Personal | Your account, Help & support |
| Settings Workspace | Brand accent remains |
| Platform Overview | Light paper/warm surface, dark readable text, separated cards |

## First paint

The first frame is light even when the OS is dark and old `theme=dark` keys exist.

## Checkpoint answers

- Can a user switch Cohestra into dark mode? **No**
- Can OS dark mode switch Cohestra into dark mode? **No**
- Can an old saved dark preference switch Cohestra into dark mode? **No**
- Is Settings → Appearance removed? **Yes**
- Are tenant branding and Brand Accent preserved? **Yes**
- Are Form Studio design options preserved? **Yes**
- Does Platform Overview render as a coherent light application? **Yes**
