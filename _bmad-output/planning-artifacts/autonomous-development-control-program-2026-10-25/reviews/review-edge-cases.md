---
reviewer: Edge Case Hunter
artifact: ADCP governance + orchestration + AD-6/AD-7
date: 2026-10-25
method: bmad-review-edge-case-hunter
scope:
  - 04-governance.md
  - 05-orchestration-options.md
  - architecture/ARCHITECTURE-SPINE.md (AD-6, AD-7)
also_consider:
  - timeout during CI
  - agent opens PR against Production files
  - ChatGPT invents a skill
  - GitGuardian NEUTRAL
  - self-triggering workflow
  - two agents same branch
verdict: FAIL
unhandled_count: 6
---

# Edge Case Hunter — ADCP governance / orchestration / AD-6 / AD-7

**Verdict:** FAIL
**Unhandled count:** 6

Walked every branch in `04-governance.md`, `05-orchestration-options.md`, AD-6, and AD-7. Also considered the six named paths. Handled branches discarded. Report is unhandled paths only.

## Findings

```json
[
  {
    "location": "architecture/ARCHITECTURE-SPINE.md:104-108; 05-orchestration-options.md:39-43",
    "trigger_condition": "CI check-run times out after executor already FINISHED",
    "guard_snippet": "if ci.conclusion==timed_out: cancel_ci; RECOVERY=ci_timeout; escalate; do not follow-up agent or count against review-fix budget",
    "potential_consequence": "Loop neither retries CI nor escalates; draft PR hangs"
  },
  {
    "location": "architecture/ARCHITECTURE-SPINE.md:98-102; 05-orchestration-options.md:37-42",
    "trigger_condition": "Executor opens draft PR whose diff includes Production files",
    "guard_snippet": "on pull_request after POST /v1/agents: if diff ∩ material_paths: OWNER_GATE=architecture; POST cancel; block merge",
    "potential_consequence": "Dispatch-time path gate missed; Production diffs sit mergeable"
  },
  {
    "location": "05-orchestration-options.md:39; 04-governance.md:69-73",
    "trigger_condition": "ChatGPT routing returns a skill name absent from catalog",
    "guard_snippet": "if skill not in bmad-help.csv and not in _bmad/custom: refuse; do not POST /v1/agents; escalate",
    "potential_consequence": "Invented skill name is copied into the executor prompt"
  },
  {
    "location": "05-orchestration-options.md:97; architecture/ARCHITECTURE-SPINE.md:104-108",
    "trigger_condition": "GitGuardian check-run conclusion is NEUTRAL",
    "guard_snippet": "if gg.conclusion!=success: refuse merge and MILESTONE=complete for every task; never treat neutral as green",
    "potential_consequence": "Neutral can pass GitHub checks and UAT merge"
  },
  {
    "location": "architecture/ARCHITECTURE-SPINE.md:104-108; 05-orchestration-options.md:37",
    "trigger_condition": "Agent labels adcp/task or comments /adcp run",
    "guard_snippet": "if actor is this workflow or the launched agent: ignore; concurrency.group=issue-number; cancel-in-progress true",
    "potential_consequence": "New dispatch spawns another agent outside retry budget"
  },
  {
    "location": "05-orchestration-options.md:100-104; architecture/ARCHITECTURE-SPINE.md:104-108",
    "trigger_condition": "Second dispatch reuses the same startingRef branch",
    "guard_snippet": "if branch has non-terminal agent_id: refuse POST /v1/agents; concurrency.group=startingRef",
    "potential_consequence": "Two executors clobber commits on one shared branch"
  }
]
```

## Unhandled paths

### 1. Timeout during CI

AD-7 expiry cancels the Cursor run and leaves the draft PR. Option A polls `GET` run until the **agent** is terminal or the 120-minute wall clock fires, then posts a milestone skeleton. Retry is `ERROR`/`EXPIRED` on that Cursor run only.

After `FINISHED`, the dispatch job is done. `ci.yml` `timed_out` / cancelled is not in the loop-termination set. Completeness refuses `MILESTONE=complete` without CI `SUCCESS` (flag only). Merge policy continues on routine CI failure, so a timeout can burn review-fix cycles or stall with no `RECOVERY=`. In-flight CI is never cancelled.

### 2. Agent opens PR against Production files

AD-6 stops a **dispatch that touches** the material path set. Option A detection is `paths` filters plus a pre-launch label/path gate. Triggers are `workflow_dispatch` / labeled issues / `/adcp run` / optional schedule — not `pull_request`.

The executor opens the PR after that gate. Spine flowchart reaches `Review -->|Production path| PO` only after Exact-HEAD CI. 47.1 halt-script AC is a fixture diff, not a dispatcher AC on the agent PR. Recovery leaves the draft PR open. No cancel / block-merge / fail-CI on post-launch Production paths.

### 3. ChatGPT invents a skill

Governance forbids inventing BMAD skills (policy, no else). Option A is `optional ChatGPT routing call → POST /v1/agents` with no closed-set check. AD-7 termination omits unknown skill. AD-9 / 47.1 refuse names absent from `bmad-help.csv`, but that refuse is not a step in the orchestration sequence and does not block launch.

### 4. GitGuardian NEUTRAL

Loop termination fires only when GitGuardian is not `success` **and** the task **claimed** a merge-ready Production-provenance PR. AD-7 has no GitGuardian branch. Completeness / 47.3 bar `neutral` from the Production-provenance complete flag only.

`neutral` is a completed check-run. Required CI jobs in rule 2 are Actions jobs, not the GitGuardian app check. UAT autonomous merge has no `neutral` predicate. A NEUTRAL conclusion on a non-claimed task can look green and merge.

### 5. Self-triggering workflow

AD-7 **Prevents** infinite self-dispatch; the **Rule** is only retry budget + wall clock + cancel on that run. Option A will re-enter on `adcp/task` or `/adcp run`. The implementation note forbids triggering on the workflow's own PRs **without a label**, which still allows a labeled self-reentry. No `concurrency` group. Agent-authored labels or comments spawn a new workflow run and a new `POST /v1/agents` outside the original retry budget. Orchestrator milestone comments are not excluded as `issue_comment` actors.

### 6. Two agents same branch

Pilot text: one executor per task; ChatGPT is not a second writer. No occupancy check, no `concurrency.group` on issue or `startingRef`, no refuse if a non-terminal agent already owns the branch. `startingRef` may be an approved feature branch. Two `/adcp run` events (or owner UI launch plus dispatcher) both `POST /v1/agents` against that ref and share the worktree. AD-7 timeout cancels one run, not the peer.
