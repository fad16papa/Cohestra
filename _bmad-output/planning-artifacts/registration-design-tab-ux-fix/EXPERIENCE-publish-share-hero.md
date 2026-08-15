# EXPERIENCE addendum — Publish requires saved Form + Design

**Parent:** `{planning_artifacts}/ux-designs/ux-registration-experience-studio-2026-08-12/EXPERIENCE.md`  
**Date:** 2026-08-15

## Publish gate (draft activities)

Before **Publish** on Overview:

| Check | Message |
|-------|---------|
| Form tab has unsaved changes | "Save your form on the Form tab before publishing." |
| Design tab has unsaved changes | "Save your design on the Design tab before publishing." |
| Existing form schema gates | Unchanged (required fields, slug, etc.) |

Publish button disabled when any gate fails. Unsaved messages listed before form schema issues.

## Share kit link preview hero

Link preview image uses **resolved registration hero** (`resolvedRegistrationTheme.heroImageUrl`), same chain as public registration page:

1. Design tab hero override (saved)
2. Community brand kit default hero (when inherit on)
3. Activity branding hero

Operators who upload hero in Design and **Save design** see it in Share kit preview after activity data refreshes.
