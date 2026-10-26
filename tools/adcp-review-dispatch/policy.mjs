/**
 * Trusted ADCP review-dispatch policy.
 * Loaded only from the workflow dispatch SHA (main), never from the reviewed PR.
 */

export const POLICY = Object.freeze({
  repository: "fad16papa/Cohestra",
  allowedActors: Object.freeze(["fad16papa"]),
  requiredRef: "refs/heads/main",
  requiredEvent: "workflow_dispatch",
  requiredBase: "main",
  modelRequired: "Grok 4.6 High Fast",
  bmadSkills: Object.freeze(["bmad-code-review"]),
  webhookHost: "api2.cursor.sh",
  webhookPathRe:
    /^\/automations\/webhook\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
  trustedActionsWorkflowPath: ".github/workflows/ci.yml",
  trustedActionsEvents: Object.freeze(["pull_request"]),
  trustedGithubApiHost: "api.github.com",
  protectedMainRef: "heads/main",
  allowedReviewContracts: Object.freeze({
    518: Object.freeze({
      pull_request: 507,
      expected_sha: "aeb7d0fbe34240359dd21af3583eae4f387add97",
      task_type: "review-only",
    }),
  }),
  requiredChecks: Object.freeze([
    Object.freeze({
      name: ".NET build and test",
      appSlug: "github-actions",
    }),
    Object.freeze({
      name: "API integration tests",
      appSlug: "github-actions",
    }),
    Object.freeze({
      name: "Next.js build",
      appSlug: "github-actions",
    }),
    Object.freeze({
      name: "UAT isolation contract",
      appSlug: "github-actions",
    }),
    Object.freeze({
      name: "Docker stack smoke",
      appSlug: "github-actions",
    }),
    Object.freeze({
      name: "GitGuardian Security Checks",
      appSlug: "gitguardian",
    }),
  ]),
  forbiddenCheckConclusions: Object.freeze([
    "neutral",
    "skipped",
    "cancelled",
    "timed_out",
    "action_required",
    "stale",
    "failure",
  ]),
  reviewInstructions:
    "Independent Grok 4.6 High Fast BMAD code/security review of the pinned repository, pull request, and exact SHA only. Use installed bmad-code-review (Blind Hunter, Edge Case Hunter, Acceptance Auditor) plus CAT-SEC. Review-only: do not edit files, approve or merge PRs, change secrets, or dispatch UAT or Production. HTTP dispatch acceptance is not REVIEW_PASS. Zero unresolved BLOCKER or MAJOR is required for PASS. Publish one GitHub PR comment with PASS/FAIL/INCOMPLETE, exact SHA, model selection evidence, skills actually executed, and findings. If HEAD moved, HOLD.",
});

export const HOLD = Object.freeze({
  WRONG_EVENT: "untrusted_event",
  WRONG_REF: "ref_not_main",
  WRONG_REPO: "wrong_repository",
  UNTRUSTED_ACTOR: "untrusted_actor",
  MALFORMED_INPUT: "malformed_input",
  PR_NOT_FOUND: "pr_not_found",
  PR_WRONG_BASE: "pr_base_not_main",
  PR_WRONG_REPO: "pr_not_same_repo",
  PR_FORK: "pr_is_fork",
  PR_MERGED: "pr_merged_main_ci_not_pr_head",
  PR_CLOSED: "pr_not_open",
  SHA_MISMATCH: "sha_mismatch",
  HEAD_CHANGED: "head_changed_during_approval",
  CHECK_MISSING: "required_check_missing",
  CHECK_NOT_SUCCESS: "required_check_not_success",
  CHECK_UNTRUSTED_APP: "required_check_untrusted_app",
  CHECK_UNTRUSTED_WORKFLOW: "required_check_untrusted_workflow",
  CHECK_WRONG_EVENT: "required_check_wrong_event",
  CHECK_AMBIGUOUS: "required_check_ambiguous_origin",
  CHECK_STALE: "required_check_stale",
  CHECK_WORKFLOW_DEFINITION: "required_check_untrusted_workflow_definition",
  REVIEW_CONTRACT: "review_contract_untrusted",
  GITHUB_API: "github_api_fail_closed",
  PAGINATION_INCOMPLETE: "github_pagination_incomplete",
  WEBHOOK_URL: "webhook_url_invalid",
  WEBHOOK_AUTH: "webhook_auth_invalid",
  LIVE_NOT_ENABLED: "live_dispatch_not_enabled",
  RERUN: "github_rerun_unsupported",
  HTTP_REJECTED: "dispatch_http_rejected",
  REDIRECT: "webhook_redirect_disallowed",
  TIMEOUT: "webhook_timeout",
  FILES_INCOMPLETE: "pr_files_incomplete",
  SECRET_OUTPUT: "secret_like_output",
});
