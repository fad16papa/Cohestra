# Epic 34: Cohestra Intelligence Brief

Operator morning brief — **deterministic facts first, optional AI synthesis later**. Cinema remains a projection; this epic is the real product.

**FRs:** CAP-1..5 in `spec-cohestra-intelligence/SPEC.md`  
**Not in scope:** chatbot, autonomous mutations, attendance analytics

### Story 34.1: Deterministic operator brief API

As a **Tenant Admin or Member**,
I want **a tenant-scoped brief of what needs attention, with evidence and a next action**,
So that **I do not invent a morning from four screens**.

### Story 34.2: Operator brief surface

As a **Tenant Admin or Member**,
I want **the brief on Dashboard as a permanent surface**,
So that **opening Cohestra starts with attention, not a metric wall**.

### Story 34.3: Optional AI synthesis with fallback

As a **Tenant Admin or Member**,
I want **concise synthesized wording over the same facts**,
So that **the brief reads as a morning note without inventing numbers**.

Requires provider config; must degrade to the deterministic brief when the provider is missing or fails.

### Story 34.4: Observability and cost controls

As a **platform**,
I want **safe logs, timings, and token/cost caps on synthesis**,
So that **intelligence is operable in production**.
