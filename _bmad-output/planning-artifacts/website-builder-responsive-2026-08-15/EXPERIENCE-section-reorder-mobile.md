# EXPERIENCE addendum — Section reorder on mobile

**Date:** 2026-08-15

## Problem

Homepage section drag handles used HTML5 drag-and-drop, which does not work on most mobile browsers (touch).

## Solution

| Input | Reorder method |
|-------|----------------|
| Touch / pen | **Pointer events** on grip handle — track finger, drop indicator, commit on release |
| Mouse (desktop) | Pointer events + HTML5 drag fallback |
| Keyboard | Arrow up/down on focused grip (existing) |
| Mobile buttons | **Move up / Move down** icons (`lg:hidden`) as explicit fallback |

## Interaction

- Grip handle: `touch-action: none`, pointer capture during drag
- Drop line indicator unchanged (before/after target section)
- Move buttons disabled at list boundaries
