# SPEC — Full Fluid Cinema Reel

## Why

Desktop Cinema still feels like six animated slides because activeId remount + enter animation fire on every room change.

## MUST

- One continuous scroll-directed reel across six rooms
- Persistent outer product stage (border, shadow, frame)
- Current + next room overlap during handoff tail (0.78–1.0 local)
- Scroll-driven opacity/transform (no fixed-duration room enter on desktop)
- Unified timeline: internal story beats + cross-room handoff
- Caption crossfade in fixed layout (no activeId key remount)
- Pill seek at room entry (~0.12)
- PRM: snap layers, no transforms
- Mobile: legacy carousel unchanged

## MUST NOT

- Mount all six rooms persistently
- Autoplay timers / transition queues
- Chatbot theater, fake capabilities
- Epic 19 / homepage rebuild

## Success

Human checkpoint: feels like one Cohestra workspace reel, not six slides.
