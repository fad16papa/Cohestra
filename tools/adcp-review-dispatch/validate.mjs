import { HOLD, POLICY } from "./policy.mjs";

const SHA_RE = /^[0-9a-fA-F]{40}$/;
const ID_RE = /^[1-9][0-9]{0,9}$/;
const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{7,127}$/;
const BEARER_RE = /^Bearer [A-Za-z0-9._\-+/=]+$/;
const ACTIONS_RUN_URL_RE = /\/actions\/runs\/(\d+)(?:\/|$)/;
const TASK_TYPE_RE = /task_type\s*[:=]\s*([A-Za-z0-9_-]+)/gi;
const EXACT_HEAD_RE = /Exact target HEAD:\**\s*`([0-9a-fA-F]{40})`/i;
const PLANNING_PR_RE = /Planning PR:\**\s*\[#(\d+)\]/i;

const PRIVILEGED_PATH_RE = [
  /^\.github\//i,
  /^deploy\//i,
  /^docker-compose/i,
  /^Dockerfile/i,
  /^tools\/adcp-/i,
  /(^|\/)(\.env|id_rsa|id_ed25519)/i,
];

export function fail(reason, detail = null, extra = {}) {
  return { ok: false, reason, detail, ...extra };
}

export function validateDispatchContext(ctx) {
  if (!ctx || typeof ctx !== "object") {
    return fail(HOLD.MALFORMED_INPUT, "context_missing");
  }
  if (ctx.eventName !== POLICY.requiredEvent) {
    return fail(HOLD.WRONG_EVENT, ctx.eventName || "missing");
  }
  if (ctx.ref !== POLICY.requiredRef) {
    return fail(HOLD.WRONG_REF, ctx.ref || "missing");
  }
  if (ctx.repository !== POLICY.repository) {
    return fail(HOLD.WRONG_REPO, ctx.repository || "missing");
  }
  const actor = String(ctx.actor || "");
  const triggering = String(ctx.triggeringActor || "");
  if (!triggering) {
    return fail(HOLD.UNTRUSTED_ACTOR, "triggering_missing");
  }
  if (
    !POLICY.allowedActors.includes(actor) ||
    !POLICY.allowedActors.includes(triggering)
  ) {
    return fail(HOLD.UNTRUSTED_ACTOR, actor);
  }
  if (ctx.apiUrl) {
    const api = validateGithubApiUrl(ctx.apiUrl);
    if (!api.ok) {
      return api;
    }
  }
  return { ok: true };
}

export function validateGithubApiUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return fail(HOLD.GITHUB_API, "api_url_missing");
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    return fail(HOLD.GITHUB_API, "api_url_unparseable");
  }
  if (url.protocol !== "https:") {
    return fail(HOLD.GITHUB_API, "api_url_not_https");
  }
  if (url.hostname !== POLICY.trustedGithubApiHost) {
    return fail(HOLD.GITHUB_API, "api_host");
  }
  if (url.username || url.password) {
    return fail(HOLD.GITHUB_API, "api_userinfo");
  }
  if (url.pathname && url.pathname !== "/" && url.pathname !== "") {
    return fail(HOLD.GITHUB_API, "api_path");
  }
  return { ok: true };
}

export function validateInputs(inputs) {
  if (!inputs || typeof inputs !== "object") {
    return fail(HOLD.MALFORMED_INPUT, "inputs_missing");
  }
  const extra = Object.keys(inputs).filter(
    (key) =>
      !["pr_number", "expected_sha", "review_contract_issue", "request_id"].includes(
        key,
      ),
  );
  if (extra.length > 0) {
    return fail(HOLD.MALFORMED_INPUT, "unexpected_input");
  }
  if (!ID_RE.test(String(inputs.pr_number || ""))) {
    return fail(HOLD.MALFORMED_INPUT, "pr_number");
  }
  if (!SHA_RE.test(String(inputs.expected_sha || ""))) {
    return fail(HOLD.MALFORMED_INPUT, "expected_sha");
  }
  if (!ID_RE.test(String(inputs.review_contract_issue || ""))) {
    return fail(HOLD.MALFORMED_INPUT, "review_contract_issue");
  }
  if (!REQUEST_ID_RE.test(String(inputs.request_id || ""))) {
    return fail(HOLD.MALFORMED_INPUT, "request_id");
  }
  return {
    ok: true,
    value: {
      pr_number: Number(inputs.pr_number),
      expected_sha: String(inputs.expected_sha).toLowerCase(),
      review_contract_issue: Number(inputs.review_contract_issue),
      request_id: String(inputs.request_id),
    },
  };
}

export function validatePullRequest(pr, expected) {
  if (!pr) {
    return fail(HOLD.PR_NOT_FOUND, "missing");
  }
  const baseRepo = pr.base?.repo?.full_name;
  const headRepo = pr.head?.repo?.full_name;
  if (baseRepo !== POLICY.repository || pr.base?.ref !== POLICY.requiredBase) {
    return fail(HOLD.PR_WRONG_BASE, `${baseRepo}@${pr.base?.ref}`);
  }
  if (
    pr.head?.repo?.fork === true ||
    pr.head?.repo?.id !== pr.base?.repo?.id ||
    headRepo !== POLICY.repository
  ) {
    return fail(HOLD.PR_FORK, headRepo || "missing");
  }
  if (pr.merged === true) {
    return fail(HOLD.PR_MERGED, "merged");
  }
  if (pr.state !== "open") {
    return fail(HOLD.PR_CLOSED, pr.state || "missing");
  }
  const headSha = String(pr.head?.sha || "").toLowerCase();
  if (headSha !== expected.expected_sha) {
    return fail(HOLD.SHA_MISMATCH, headSha);
  }
  return {
    ok: true,
    headSha,
    mergeSha: pr.merge_commit_sha
      ? String(pr.merge_commit_sha).toLowerCase()
      : null,
  };
}

export function allowedReviewContract(issueNumber) {
  const entry = POLICY.allowedReviewContracts[String(issueNumber)];
  return entry || POLICY.allowedReviewContracts[Number(issueNumber)] || null;
}

export function validateReviewContract(issue, inputs) {
  const allowed = allowedReviewContract(inputs.review_contract_issue);
  if (!allowed) {
    return fail(HOLD.REVIEW_CONTRACT, "not_allowlisted");
  }
  if (Number(allowed.pull_request) !== Number(inputs.pr_number)) {
    return fail(HOLD.REVIEW_CONTRACT, "pr_mismatch");
  }
  if (String(allowed.expected_sha).toLowerCase() !== inputs.expected_sha) {
    return fail(HOLD.REVIEW_CONTRACT, "sha_mismatch");
  }
  if (allowed.task_type !== "review-only") {
    return fail(HOLD.REVIEW_CONTRACT, "task");
  }
  if (!issue) {
    return fail(HOLD.REVIEW_CONTRACT, "missing");
  }
  if (Number(issue.number) !== Number(inputs.review_contract_issue)) {
    return fail(HOLD.REVIEW_CONTRACT, "number_mismatch");
  }
  if (issue.state !== "open") {
    return fail(HOLD.REVIEW_CONTRACT, "closed");
  }
  if (issue.pull_request) {
    return fail(HOLD.REVIEW_CONTRACT, "is_pull_request");
  }

  // Issue body is untrusted mutable data. Parse only as a consistency check;
  // never treat it as owner approval or as a substitute for the allowlist.
  const body = String(issue.body || "");
  if (!body.trim()) {
    return fail(HOLD.REVIEW_CONTRACT, "empty_body");
  }
  const exactHead = body.match(EXACT_HEAD_RE);
  if (!exactHead) {
    return fail(HOLD.REVIEW_CONTRACT, "exact_head_absent");
  }
  if (exactHead[1].toLowerCase() !== allowed.expected_sha) {
    return fail(HOLD.REVIEW_CONTRACT, "stale_body_sha");
  }
  const planningPr = body.match(PLANNING_PR_RE);
  if (planningPr && Number(planningPr[1]) !== Number(allowed.pull_request)) {
    return fail(HOLD.REVIEW_CONTRACT, "body_pr_mismatch");
  }
  const taskTypes = [...body.matchAll(TASK_TYPE_RE)];
  for (const taskType of taskTypes) {
    if (String(taskType[1]).toLowerCase() !== "review-only") {
      return fail(HOLD.REVIEW_CONTRACT, "task_substitution");
    }
  }
  if (!/review[ -]only/i.test(body)) {
    return fail(HOLD.REVIEW_CONTRACT, "review_only_absent");
  }
  return { ok: true, allowed };
}

export function isCheckEligible(check, { expectedSha, prNumber }) {
  if (!check || typeof check !== "object") {
    return false;
  }
  const sha = String(check.head_sha || "").toLowerCase();
  if (sha !== String(expectedSha).toLowerCase()) {
    return false;
  }
  if (!Array.isArray(check.pull_requests) || check.pull_requests.length === 0) {
    return false;
  }
  const numbers = check.pull_requests.map((item) => Number(item.number));
  if (!numbers.includes(Number(prNumber))) {
    return false;
  }
  if (String(check.head_branch || "") === "main") {
    return false;
  }
  return true;
}

export function resolveActionsProvenance(check, workflowRuns, { trustedWorkflow = null } = {}) {
  const html = String(check.html_url || "");
  const match = html.match(ACTIONS_RUN_URL_RE);
  if (!match) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "missing_run_url");
  }
  const runId = Number(match[1]);
  const run = (workflowRuns || []).find((item) => Number(item.id) === runId);
  if (!run) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "run_not_found");
  }
  if (String(run.path || "") !== POLICY.trustedActionsWorkflowPath) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "untrusted_path");
  }
  if (!POLICY.trustedActionsEvents.includes(String(run.event || ""))) {
    return fail(HOLD.CHECK_WRONG_EVENT, String(run.event || "missing"));
  }
  if (String(run.head_sha || "").toLowerCase() !== String(check.head_sha || "").toLowerCase()) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "run_sha");
  }
  if (!Array.isArray(run.pull_requests) || run.pull_requests.length === 0) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "run_pr");
  }
  const numbers = run.pull_requests.map((item) => Number(item.number));
  const checkPrs = (check.pull_requests || []).map((item) => Number(item.number));
  const overlap = numbers.filter((n) => checkPrs.includes(n));
  if (overlap.length === 0) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "run_pr");
  }
  if (
    check.check_suite?.id != null &&
    run.check_suite_id != null &&
    Number(check.check_suite.id) !== Number(run.check_suite_id)
  ) {
    return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "suite");
  }
  if (trustedWorkflow) {
    if (Number(run.workflow_id) !== Number(trustedWorkflow.id)) {
      return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "workflow_id");
    }
    if (String(trustedWorkflow.path || "") !== POLICY.trustedActionsWorkflowPath) {
      return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "trusted_workflow_path");
    }
    if (String(trustedWorkflow.state || "") !== "active") {
      return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, "workflow_inactive");
    }
  }
  return { ok: true, run };
}

export function validateCheckRuns(
  checks,
  { expectedSha, prNumber, workflowRuns = [], jobsByRunId = {}, trustedWorkflow = null } = {},
) {
  const ci_evidence = {};
  const list = Array.isArray(checks) ? checks : [];

  for (const required of POLICY.requiredChecks) {
    const named = list.filter(
      (check) => String(check.name || "").trim() === required.name,
    );
    const eligible = named.filter((check) =>
      isCheckEligible(check, { expectedSha, prNumber }),
    );

    const trusted = [];
    const untrusted = [];
    for (const check of eligible) {
      const appSlug = check.app?.slug || "";
      if (appSlug !== required.appSlug) {
        untrusted.push({ check, reason: HOLD.CHECK_UNTRUSTED_APP });
        continue;
      }
      if (required.appSlug === "github-actions") {
        const provenance = resolveActionsProvenance(check, workflowRuns, {
          trustedWorkflow,
        });
        if (!provenance.ok) {
          untrusted.push({ check, reason: provenance.reason, detail: provenance.detail });
          continue;
        }
        const jobs =
          jobsByRunId[provenance.run.id] ||
          jobsByRunId[String(provenance.run.id)] ||
          [];
        if (
          !Array.isArray(jobs) ||
          !jobs.some((job) => String(job.name || "").trim() === required.name)
        ) {
          untrusted.push({
            check,
            reason: HOLD.CHECK_UNTRUSTED_WORKFLOW,
            detail: "job_not_on_run",
          });
          continue;
        }
        trusted.push({ check, run: provenance.run });
      } else {
        trusted.push({ check, run: null });
      }
    }

    if (trusted.length === 0) {
      ci_evidence[required.name] = {
        result: named.length === 0 ? "missing" : "untrusted_origin",
        app: named[0]?.app?.slug || null,
      };
      if (untrusted.some((item) => item.reason === HOLD.CHECK_UNTRUSTED_APP)) {
        return fail(HOLD.CHECK_UNTRUSTED_APP, required.name, { ci_evidence });
      }
      if (untrusted.some((item) => item.reason === HOLD.CHECK_WRONG_EVENT)) {
        return fail(HOLD.CHECK_WRONG_EVENT, required.name, { ci_evidence });
      }
      if (untrusted.length > 0) {
        return fail(HOLD.CHECK_UNTRUSTED_WORKFLOW, required.name, { ci_evidence });
      }
      return fail(HOLD.CHECK_MISSING, required.name, { ci_evidence });
    }

    const workflowIds = new Set(
      trusted
        .map((item) => item.run?.workflow_id)
        .filter((id) => id !== undefined && id !== null),
    );
    if (required.appSlug === "github-actions" && workflowIds.size > 1) {
      ci_evidence[required.name] = { result: "ambiguous", app: required.appSlug };
      return fail(HOLD.CHECK_AMBIGUOUS, required.name, { ci_evidence });
    }

    trusted.sort((a, b) => {
      const aTime = Date.parse(a.check.completed_at || a.check.started_at || 0);
      const bTime = Date.parse(b.check.completed_at || b.check.started_at || 0);
      return bTime - aTime;
    });
    const latest = trusted[0].check;
    const appSlug = latest.app?.slug || "";
    ci_evidence[required.name] = {
      result: latest.conclusion || latest.status || "unknown",
      app: appSlug,
      head_sha: latest.head_sha || null,
      workflow_path:
        trusted[0].run?.path ||
        (required.appSlug === "gitguardian" ? "gitguardian" : null),
      event: trusted[0].run?.event || null,
    };

    if (appSlug !== required.appSlug) {
      return fail(HOLD.CHECK_UNTRUSTED_APP, required.name, { ci_evidence });
    }
    if (latest.conclusion === "stale") {
      return fail(HOLD.CHECK_STALE, required.name, { ci_evidence });
    }
    const forbidden = POLICY.forbiddenCheckConclusions.includes(
      String(latest.conclusion || ""),
    );
    if (latest.status !== "completed" || latest.conclusion !== "success" || forbidden) {
      const reason =
        latest.conclusion === "stale" ? HOLD.CHECK_STALE : HOLD.CHECK_NOT_SUCCESS;
      return fail(reason, `${required.name}:${latest.conclusion || latest.status}`, {
        ci_evidence,
      });
    }
  }

  return { ok: true, ci_evidence };
}

export function normalizeRepoPath(name) {
  return String(name || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

export function ciWorkflowTouched(files) {
  const trusted = POLICY.trustedActionsWorkflowPath.toLowerCase();
  for (const file of files || []) {
    for (const name of [file.filename, file.previous_filename, file.path]) {
      if (name && normalizeRepoPath(name).toLowerCase() === trusted) {
        return true;
      }
    }
  }
  return false;
}

export function validateTrustedCiDefinition({
  files = [],
  filesIncomplete = false,
  dispatchSha = null,
  protectedMainSha = null,
  headFile = null,
  mainFile = null,
}) {
  if (filesIncomplete) {
    return fail(HOLD.FILES_INCOMPLETE, "truncated");
  }
  if (ciWorkflowTouched(files)) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "ci_yml_in_pr_files");
  }
  if (!SHA_RE.test(String(dispatchSha || "")) || !SHA_RE.test(String(protectedMainSha || ""))) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "main_sha_unverified");
  }
  if (String(dispatchSha).toLowerCase() !== String(protectedMainSha).toLowerCase()) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "main_baseline_race");
  }
  if (!headFile || headFile.missing || !headFile.blobSha || !headFile.bytes) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "head_ci_missing");
  }
  if (!mainFile || mainFile.missing || !mainFile.blobSha || !mainFile.bytes) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "main_ci_missing");
  }
  if (String(headFile.blobSha) !== String(mainFile.blobSha)) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "ci_blob_mismatch");
  }
  const headBytes = Buffer.from(headFile.bytes);
  const mainBytes = Buffer.from(mainFile.bytes);
  if (headBytes.length === 0 || mainBytes.length === 0 || Buffer.compare(headBytes, mainBytes) !== 0) {
    return fail(HOLD.CHECK_WORKFLOW_DEFINITION, "ci_bytes_mismatch");
  }
  return { ok: true };
}

export function validateWebhookUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return fail(HOLD.WEBHOOK_URL, "missing");
  }
  if (/[\r\n\0]/.test(raw)) {
    return fail(HOLD.WEBHOOK_URL, "crlf");
  }
  if (/%0[da]/i.test(raw) || /%00/i.test(raw)) {
    return fail(HOLD.WEBHOOK_URL, "encoded_control");
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    return fail(HOLD.WEBHOOK_URL, "unparseable");
  }
  if (url.protocol !== "https:") {
    return fail(HOLD.WEBHOOK_URL, "not_https");
  }
  if (url.hostname !== POLICY.webhookHost) {
    return fail(HOLD.WEBHOOK_URL, "host");
  }
  if (url.port && url.port !== "443") {
    return fail(HOLD.WEBHOOK_URL, "port");
  }
  if (url.username || url.password) {
    return fail(HOLD.WEBHOOK_URL, "userinfo");
  }
  if (url.search || url.hash) {
    return fail(HOLD.WEBHOOK_URL, "query_or_fragment");
  }
  if (!POLICY.webhookPathRe.test(url.pathname)) {
    return fail(HOLD.WEBHOOK_URL, "path");
  }
  return { ok: true };
}

export function validateWebhookAuth(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return fail(HOLD.WEBHOOK_AUTH, "missing");
  }
  if (/[\r\n\0]/.test(raw)) {
    return fail(HOLD.WEBHOOK_AUTH, "crlf");
  }
  if (!BEARER_RE.test(raw)) {
    return fail(HOLD.WEBHOOK_AUTH, "format");
  }
  if (raw.length < 16 || raw.length > 8192) {
    return fail(HOLD.WEBHOOK_AUTH, "length");
  }
  return { ok: true };
}

export function privilegedPaths(files) {
  const names = [];
  for (const file of files || []) {
    for (const name of [file.filename, file.previous_filename, file.path]) {
      if (name) {
        names.push(name);
      }
    }
  }
  return [...new Set(names.filter((name) =>
    PRIVILEGED_PATH_RE.some((pattern) => pattern.test(name)),
  ))];
}

export function buildReviewPayload({ inputs, privileged, expectedSha }) {
  const paths = (privileged || []).slice(0, 50);
  return {
    task_type: "review-only",
    authorization_notice:
      "This payload is not owner approval, merge authority, UAT authority, or Production authority.",
    repository: POLICY.repository,
    pull_request: inputs.pr_number,
    expected_sha: expectedSha,
    review_contract_issue: inputs.review_contract_issue,
    model_required: POLICY.modelRequired,
    bmad_skills_required: [...POLICY.bmadSkills],
    cat_sec_required: true,
    http_acceptance_is_not_review_pass: true,
    no_pr_approval: true,
    no_merge: true,
    no_uat: true,
    no_production: true,
    request_id: inputs.request_id,
    security_escalation: paths.length > 0,
    privileged_path_count: (privileged || []).length,
    privileged_paths: paths,
    instructions: POLICY.reviewInstructions,
  };
}

export function sanitizeEvidenceValue(value, secrets = []) {
  let text = typeof value === "string" ? value : JSON.stringify(value);
  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      text = text.split(secret).join("[REDACTED]");
    }
  }
  text = text.replace(/Bearer [A-Za-z0-9._\-+/=]+/g, "Bearer [REDACTED]");
  text = text.replace(/crsr_[A-Za-z0-9._\-]+/gi, "crsr_[REDACTED]");
  text = text.replace(
    /https:\/\/api2\.cursor\.sh\/automations\/webhook\/[0-9a-f-]+/gi,
    "[REDACTED_WEBHOOK_URL]",
  );
  return text;
}

export function containsSecretLike(text) {
  return /Bearer [A-Za-z0-9._\-+/=]{8,}|crsr_[A-Za-z0-9]|BEGIN (OPENSSH |RSA )?PRIVATE KEY|ADCP_CURSOR_WEBHOOK_AUTH\s*=|https:\/\/api2\.cursor\.sh\/automations\/webhook\//i.test(
    text,
  );
}

export function buildEvidence({
  prNumber = null,
  sha = null,
  requestId = null,
  dispatchStatus,
  holdReason = null,
  ciEvidence = {},
  httpStatus = null,
  sanitizedRunId = null,
  securityEscalation = false,
  liveDispatch = "NOT_EXECUTED",
  transport = "none",
}) {
  return {
    review_target_pr: prNumber,
    review_target_sha: sha,
    attempt_id: requestId,
    dispatch_status: dispatchStatus,
    model_expected: POLICY.modelRequired,
    ci_evidence: ciEvidence,
    review_completion_status: "NOT_CLAIMED",
    review_pass: false,
    live_dispatch: liveDispatch,
    transport,
    hold_reason: holdReason,
    http_status: httpStatus,
    cursor_run_id: sanitizedRunId,
    security_escalation: Boolean(securityEscalation),
    exactly_once: "UNSUPPORTED",
  };
}

export function sanitizeHttpBody(body, secrets = []) {
  let parsed = body;
  if (typeof body === "string") {
    try {
      parsed = JSON.parse(body);
    } catch {
      return { raw: "unparsed" };
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { raw: "empty" };
  }
  const picked = {
    success: parsed.success === true,
    runUuid: parsed.runUuid ? "present" : null,
    backgroundComposerId: parsed.backgroundComposerId ? "present" : null,
  };
  const redacted = JSON.parse(
    sanitizeEvidenceValue(JSON.stringify(picked), secrets),
  );
  return redacted;
}
