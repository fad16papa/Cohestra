# EXPERIENCE addendum — Design tab preview light island

**Parent:** `{planning_artifacts}/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md`  
**Status:** addendum  
**Date:** 2026-08-15

## Problem

When the operator dashboard is in **dark mode**, the Design tab **Live preview** showed near-invisible text (e.g. activity title "FNM") because preview content inherited dark-theme semantic tokens (`--text-warm` → light paper) while card/hero surfaces stayed light (`--paper-warm`, white card).

## Decision

The live preview is a **WYSIWYG light island** — it must always render with public-registration light tokens, independent of operator theme.

## Component pattern — Live preview container

| Property | Value |
|----------|--------|
| Class | `registration-preview-surface` |
| Token scope | Resets `--text-warm`, `--background`, `--card`, `--border-warm`, etc. to `:root` light values |
| Rationale | Public registration pages use light paper surfaces; preview must match published appearance |
| Operator theme | Does not affect preview subtree |

## Acceptance check

1. Operator in **dark mode** → preview title, schedule, and form placeholder text are legible on light background.
2. Operator in **light mode** → preview unchanged (no regression).
3. Accent override (`--primary` inline) still applies inside preview surface.

## Accessibility

Preview `color-scheme: light` keeps form controls and scrollbars consistent with the simulated public page.
