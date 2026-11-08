# Issue 536 trusted evaluator

Stacked on PR 551 head `bb16fa2406dd1882be5a57b5cb48c10655cf4a11`. PR 551 is not edited. The host rules are AD-7 through AD-11 in PR 553.

The evaluator reads one owner-signed version-2 manifest and GitHub check-runs. `PASS` means that evidence matched. It is not merge, dispatch, or deploy authority. `side_effect_gate` returns HOLD for every request, including PASS and replay. Live flags stay false.

Reviewer roles are the numeric App ids in `COHESTRA_REVIEW_APP_BMAD_ID` and `COHESTRA_REVIEW_APP_CATSEC_ID`, with exact check names. `BMAD` and `CAT-SEC` are not those roles. App id `15368` is never a reviewer. A required-check pin of `15368` without a workflow path stays HOLD. With a path, it counts only when every matching check run is that app, slug `github-actions`, completed success, on the exact head, and its workflow run has the same path, head, check suite, and repository, event `pull_request` or `push`, and no referenced workflow. The workflow file at the head must equal the file at the base. Permissions are read from YAML mappings only. A workflow-level block, or a block on every job, must list unquoted `read` or `none` values. Command text is not a grant. Quoted, duplicate, aliased, tagged, and elevated declarations are refused, including a quoted key whose YAML 1.1 escapes decode to `permissions`. A file that leaves any job on the default token is not accepted. The workflow token has `actions: read` for that lookup. This is not a live verification.

Replay is one local file under the runner temp directory, keyed by event id. The same fingerprint returns the stored result and does not read the network again. A different fingerprint is HOLD and does not change the stored result. The store does not survive a new runner.

No unit test performs a live GitHub read. A fake transport is not live verification.
