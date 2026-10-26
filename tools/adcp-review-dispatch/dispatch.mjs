import { HOLD, POLICY } from "./policy.mjs";
import {
  buildEvidence,
  buildReviewPayload,
  containsSecretLike,
  privilegedPaths,
  sanitizeHttpBody,
  validateCheckRuns,
  validateDispatchContext,
  validateInputs,
  validatePullRequest,
  validateReviewContract,
  validateTrustedCiDefinition,
  validateWebhookAuth,
  validateWebhookUrl,
} from "./validate.mjs";

let postedInProcess = false;

export function resetInProcessGuard() {
  postedInProcess = false;
}

export function createMockTransport(result = {}) {
  const calls = [];
  const {
    status = 200,
    body = { success: true, runUuid: "mock-run", backgroundComposerId: "mock-bc" },
    redirect = false,
    timeout = false,
    throwCode = null,
  } = result;
  return {
    kind: "mock",
    calls,
    async post(url, init) {
      calls.push({ url, init });
      if (timeout) {
        const err = new Error("aborted");
        err.name = "TimeoutError";
        throw err;
      }
      if (redirect) {
        const err = new Error("redirect");
        err.cause = { code: "ERR_UNESCAPED_REDIRECT" };
        throw err;
      }
      if (throwCode) {
        const err = new Error(throwCode);
        err.code = throwCode;
        throw err;
      }
      return { status, body, redirected: false };
    },
  };
}

export async function livePost(url, { headers, body, timeoutMs = 10000, fetchImpl }) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const res = await fetchFn(url, {
    method: "POST",
    headers,
    body,
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });
  let parsed = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, redirected: res.redirected === true };
}

async function loadPrWorld(github, inputs, { dispatchSha = null } = {}) {
  let pr;
  try {
    pr = await github.getPullRequest(inputs.pr_number);
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.GITHUB_API,
      detail: String(err.status || err.message || "github"),
    };
  }
  const prCheck = validatePullRequest(pr, inputs);
  if (!prCheck.ok) {
    return prCheck;
  }

  if (
    typeof github.getIssue !== "function" ||
    typeof github.listWorkflowRuns !== "function" ||
    typeof github.listWorkflowJobs !== "function" ||
    typeof github.getProtectedMainSha !== "function" ||
    typeof github.getFileAtRef !== "function" ||
    typeof github.getWorkflow !== "function"
  ) {
    return { ok: false, reason: HOLD.GITHUB_API, detail: "client" };
  }

  let issue;
  try {
    issue = await github.getIssue(inputs.review_contract_issue);
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.GITHUB_API,
      detail: String(err.status || err.message || "issue"),
    };
  }
  const contract = validateReviewContract(issue, inputs);
  if (!contract.ok) {
    return contract;
  }

  let trustedWorkflow;
  try {
    trustedWorkflow = await github.getWorkflow(POLICY.trustedActionsWorkflowPath);
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.CHECK_WORKFLOW_DEFINITION,
      detail: String(err.status || err.message || "workflow"),
    };
  }
  if (!trustedWorkflow || !trustedWorkflow.id) {
    return { ok: false, reason: HOLD.CHECK_WORKFLOW_DEFINITION, detail: "workflow_unverified" };
  }

  let checks = [];
  let workflowRuns = [];
  try {
    const headChecks = await github.getCheckRuns(prCheck.headSha);
    checks = Array.isArray(headChecks) ? [...headChecks] : [];
    const runs = await github.listWorkflowRuns(prCheck.headSha);
    workflowRuns = Array.isArray(runs) ? runs : [];
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.GITHUB_API,
      detail: String(err.status || err.message || "checks"),
    };
  }

  const jobsByRunId = {};
  try {
    const trustedRunIds = [
      ...new Set(
        workflowRuns
          .filter((run) => String(run.path || "") === POLICY.trustedActionsWorkflowPath)
          .map((run) => run.id),
      ),
    ];
    for (const runId of trustedRunIds) {
      const jobs = await github.listWorkflowJobs(runId);
      jobsByRunId[runId] = Array.isArray(jobs) ? jobs : [];
    }
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.GITHUB_API,
      detail: String(err.status || err.message || "jobs"),
    };
  }

  const ci = validateCheckRuns(checks, {
    expectedSha: prCheck.headSha,
    prNumber: inputs.pr_number,
    workflowRuns,
    jobsByRunId,
    trustedWorkflow,
  });
  if (!ci.ok) {
    return ci;
  }

  let filesResult;
  try {
    filesResult = await github.listPullFiles(inputs.pr_number);
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.GITHUB_API,
      detail: String(err.status || err.message || "files"),
    };
  }
  if (!filesResult || filesResult.incomplete) {
    return { ok: false, reason: HOLD.FILES_INCOMPLETE, detail: "truncated" };
  }

  let protectedMainSha;
  try {
    protectedMainSha = await github.getProtectedMainSha();
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.CHECK_WORKFLOW_DEFINITION,
      detail: String(err.status || err.message || "main_ref"),
    };
  }

  let headFile;
  let mainFile;
  try {
    headFile = await github.getFileAtRef(POLICY.trustedActionsWorkflowPath, prCheck.headSha);
    mainFile = await github.getFileAtRef(
      POLICY.trustedActionsWorkflowPath,
      String(protectedMainSha || dispatchSha || ""),
    );
  } catch (err) {
    return {
      ok: false,
      reason: err.reason || HOLD.CHECK_WORKFLOW_DEFINITION,
      detail: String(err.status || err.message || "ci_blob"),
    };
  }

  const definition = validateTrustedCiDefinition({
    files: filesResult.files || [],
    filesIncomplete: Boolean(filesResult.incomplete),
    dispatchSha,
    protectedMainSha,
    headFile,
    mainFile,
  });
  if (!definition.ok) {
    return definition;
  }

  const privileged = privilegedPaths(filesResult.files || []);
  return {
    ok: true,
    pr,
    headSha: prCheck.headSha,
    mergeSha: prCheck.mergeSha,
    ci_evidence: ci.ci_evidence,
    privileged,
    payload: buildReviewPayload({
      inputs,
      privileged,
      expectedSha: prCheck.headSha,
    }),
  };
}

function evidenceFromHold(hold, inputs, extras = {}) {
  return buildEvidence({
    prNumber: inputs?.pr_number ?? null,
    sha: inputs?.expected_sha ?? null,
    requestId: inputs?.request_id ?? null,
    dispatchStatus: "HOLD",
    holdReason: hold.reason,
    ciEvidence: hold.ci_evidence || extras.ci_evidence || {},
    securityEscalation: extras.securityEscalation || false,
    liveDispatch: "NOT_EXECUTED",
    transport: extras.transport || "none",
  });
}

export async function runPreflight(ctx, { github } = {}) {
  const ctxCheck = validateDispatchContext(ctx);
  const inputCheck = validateInputs(ctx?.inputs);
  const inputs = inputCheck.ok ? inputCheck.value : ctx?.inputs;
  if (!ctxCheck.ok) {
    return { ok: false, evidence: evidenceFromHold(ctxCheck, inputCheck.value || inputs) };
  }
  if (!inputCheck.ok) {
    return { ok: false, evidence: evidenceFromHold(inputCheck, ctx?.inputs) };
  }
  if (Number(ctx.runAttempt || 1) > 1) {
    return {
      ok: false,
      evidence: evidenceFromHold({ reason: HOLD.RERUN }, inputCheck.value),
    };
  }
  if (!github) {
    return {
      ok: false,
      evidence: evidenceFromHold({ reason: HOLD.GITHUB_API, detail: "client" }, inputCheck.value),
    };
  }

  const world = await loadPrWorld(github, inputCheck.value, { dispatchSha: ctx.sha });
  if (!world.ok) {
    return { ok: false, evidence: evidenceFromHold(world, inputCheck.value) };
  }

  return {
    ok: true,
    inputs: inputCheck.value,
    world,
    evidence: buildEvidence({
      prNumber: inputCheck.value.pr_number,
      sha: world.headSha,
      requestId: inputCheck.value.request_id,
      dispatchStatus: "PREFLIGHT_OK",
      ciEvidence: world.ci_evidence,
      securityEscalation: world.privileged.length > 0,
      liveDispatch: "NOT_EXECUTED",
      transport: "none",
    }),
  };
}

export async function runDispatch(ctx, { github, transport } = {}) {
  const pre = await runPreflight(ctx, { github });
  if (!pre.ok) {
    if (pre.evidence?.hold_reason === HOLD.SHA_MISMATCH) {
      pre.evidence.hold_reason = HOLD.HEAD_CHANGED;
    }
    return pre;
  }

  const secrets = [ctx.webhookUrl, ctx.webhookAuth].filter(Boolean);
  const urlCheck = validateWebhookUrl(ctx.webhookUrl);
  if (!urlCheck.ok) {
    return { ok: false, evidence: evidenceFromHold(urlCheck, pre.inputs) };
  }
  const authCheck = validateWebhookAuth(ctx.webhookAuth);
  if (!authCheck.ok) {
    return { ok: false, evidence: evidenceFromHold(authCheck, pre.inputs) };
  }

  const allowLive = ctx.allowLiveDispatch === true;
  const activeTransport = transport || null;
  if (!activeTransport) {
    return {
      ok: false,
      evidence: evidenceFromHold(
        { reason: allowLive ? HOLD.LIVE_NOT_ENABLED : HOLD.LIVE_NOT_ENABLED },
        pre.inputs,
      ),
    };
  }

  if (postedInProcess) {
    return {
      ok: false,
      evidence: evidenceFromHold({ reason: HOLD.RERUN, detail: "in_process" }, pre.inputs),
    };
  }

  const payloadText = JSON.stringify(pre.world.payload);
  if (containsSecretLike(payloadText)) {
    return {
      ok: false,
      evidence: evidenceFromHold({ reason: HOLD.SECRET_OUTPUT }, pre.inputs),
    };
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: ctx.webhookAuth,
    Accept: "application/json",
  };
  for (const [key, value] of Object.entries(headers)) {
    if (/[\r\n\0]/.test(key) || /[\r\n\0]/.test(value)) {
      return {
        ok: false,
        evidence: evidenceFromHold({ reason: HOLD.WEBHOOK_AUTH, detail: "header_crlf" }, pre.inputs),
      };
    }
  }

  postedInProcess = true;
  let response;
  try {
    response = await activeTransport.post(ctx.webhookUrl, {
      headers,
      body: payloadText,
      timeoutMs: 10000,
    });
  } catch (err) {
    const timeout = err?.name === "TimeoutError" || err?.name === "AbortError";
    const redirect =
      err?.cause?.code === "ERR_UNESCAPED_REDIRECT" ||
      String(err?.message || "").includes("redirect");
    return {
      ok: false,
      evidence: buildEvidence({
        prNumber: pre.inputs.pr_number,
        sha: pre.world.headSha,
        requestId: pre.inputs.request_id,
        dispatchStatus: "HOLD",
        holdReason: timeout ? HOLD.TIMEOUT : redirect ? HOLD.REDIRECT : HOLD.HTTP_REJECTED,
        ciEvidence: pre.world.ci_evidence,
        securityEscalation: pre.world.privileged.length > 0,
        liveDispatch: allowLive ? "ATTEMPTED" : "NOT_EXECUTED",
        transport: activeTransport.kind || (allowLive ? "live" : "mock"),
      }),
    };
  }

  if (response.redirected) {
    return {
      ok: false,
      evidence: evidenceFromHold({ reason: HOLD.REDIRECT }, pre.inputs, {
        ci_evidence: pre.world.ci_evidence,
        transport: activeTransport.kind || "mock",
      }),
    };
  }

  const httpStatus = Number(response.status);
  const sanitized = sanitizeHttpBody(response.body, secrets);
  if (httpStatus < 200 || httpStatus > 299) {
    return {
      ok: false,
      evidence: buildEvidence({
        prNumber: pre.inputs.pr_number,
        sha: pre.world.headSha,
        requestId: pre.inputs.request_id,
        dispatchStatus: "DISPATCH_REJECTED",
        holdReason: HOLD.HTTP_REJECTED,
        ciEvidence: pre.world.ci_evidence,
        httpStatus,
        sanitizedRunId: sanitized.runUuid || null,
        securityEscalation: pre.world.privileged.length > 0,
        liveDispatch: allowLive ? "ATTEMPTED" : "NOT_EXECUTED",
        transport: activeTransport.kind || (allowLive ? "live" : "mock"),
      }),
    };
  }

  const evidence = buildEvidence({
    prNumber: pre.inputs.pr_number,
    sha: pre.world.headSha,
    requestId: pre.inputs.request_id,
    dispatchStatus: "DISPATCH_ACCEPTED",
    ciEvidence: pre.world.ci_evidence,
    httpStatus,
    sanitizedRunId: sanitized.runUuid || null,
    securityEscalation: pre.world.privileged.length > 0,
    liveDispatch: allowLive ? "ATTEMPTED" : "NOT_EXECUTED",
    transport: activeTransport.kind || (allowLive ? "live" : "mock"),
  });
  const dumped = JSON.stringify(evidence);
  if (containsSecretLike(dumped) || secrets.some((secret) => dumped.includes(secret))) {
    return {
      ok: false,
      evidence: evidenceFromHold({ reason: HOLD.SECRET_OUTPUT }, pre.inputs),
    };
  }
  return { ok: true, evidence, payload: pre.world.payload };
}

export function requiredCheckNames() {
  return POLICY.requiredChecks.map((item) => item.name);
}
