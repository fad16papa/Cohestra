---
id: 45.7
key: 45-7-story-acceptance-evidence-contract
title: Story acceptance evidence contract
status: in-progress
epic: 45
created: 2026-10-15
---

# Story 45.7: Story acceptance evidence contract

## Story

As a **control-plane agent**,
I want **a standard machine-readable acceptance artifact**,
so that **story close uses artifacts, not owner paste**.

## Acceptance Criteria

1. **Given** a UAT story
   **When** acceptance runs
   **Then** `acceptance-summary.json` includes `story`, `sha`, `deployment`, `runtime`, `browser`, `security`, `provider`, `tests`, and `result`

2. **Given** any required section is missing
   **When** Grok evaluates the story
   **Then** result is FAIL, never a fake PASS

3. **Given** the summary
   **When** it is stored
   **Then** it references detailed artifacts and contains no secrets

## Implementation

- `deploy/uat-acceptance-summary.sh` aggregates dispatch + host probe + public smoke + Playwright JSON
- `deploy/uat-acceptance-summary.sh --evaluate FILE` fail-closes missing sections / fake PASS
- Deploy UAT job `evidence` runs after deploy + browser, Environment `uat`, `contents: read`
- `actions/download-artifact` pinned to official v4.3.0 SHA `d3f86a106a0bac45b974a628896c90dbdf5c8093`
- CI contract: `deploy/uat-acceptance-summary.test.sh`

## Tasks / Subtasks

- [x] Task 1: Summary builder + required-section schema (AC 1)
- [x] Task 2: Evaluate mode refuses missing sections and fake PASS (AC 2)
- [x] Task 3: Secret-like refuse; artifact references only (AC 3)
- [x] Task 4: Wire evidence job + CI contract
- [ ] Task 5: Exact-HEAD review + autonomous merge
