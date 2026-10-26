#!/usr/bin/env node
/**
 * Trusted ADCP review-dispatch CLI.
 * Secrets are read from the environment only. Do not echo them.
 */

import fs from "node:fs";
import path from "node:path";
import { createGithubClient } from "./github.mjs";
import { livePost, runDispatch, runPreflight } from "./dispatch.mjs";
import { containsSecretLike } from "./validate.mjs";

function contextFromEnv() {
  return {
    eventName: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
    repository: process.env.GITHUB_REPOSITORY,
    actor: process.env.GITHUB_ACTOR,
    triggeringActor: process.env.GITHUB_TRIGGERING_ACTOR,
    sha: process.env.GITHUB_SHA,
    runAttempt: Number(process.env.GITHUB_RUN_ATTEMPT || "1"),
    token: process.env.GITHUB_TOKEN,
    apiUrl: process.env.GITHUB_API_URL || "https://api.github.com",
    inputs: {
      pr_number: process.env.ADCP_PR_NUMBER,
      expected_sha: process.env.ADCP_EXPECTED_SHA,
      review_contract_issue: process.env.ADCP_REVIEW_CONTRACT_ISSUE,
      request_id: process.env.ADCP_REQUEST_ID,
    },
    webhookUrl: process.env.ADCP_CURSOR_WEBHOOK_URL,
    webhookAuth: process.env.ADCP_CURSOR_WEBHOOK_AUTH,
    allowLiveDispatch: process.env.ADCP_ALLOW_LIVE_DISPATCH === "1",
  };
}

function writeEvidence(evidence) {
  const json = `${JSON.stringify(evidence)}\n`;
  if (containsSecretLike(json)) {
    console.error("REFUSE: evidence contained secret-like material");
    process.exit(1);
  }
  console.log(`ADCP_DISPATCH_STATUS=${evidence.dispatch_status}`);
  console.log(`ADCP_REVIEW_TARGET_PR=${evidence.review_target_pr ?? ""}`);
  console.log(`ADCP_REVIEW_TARGET_SHA=${evidence.review_target_sha ?? ""}`);
  console.log(`ADCP_ATTEMPT_ID=${evidence.attempt_id ?? ""}`);
  console.log(`ADCP_LIVE_DISPATCH=${evidence.live_dispatch}`);
  console.log(`ADCP_REVIEW_COMPLETION_STATUS=${evidence.review_completion_status}`);
  console.log(`ADCP_EXACTLY_ONCE=${evidence.exactly_once}`);
  console.log(`ADCP_HOLD_REASON=${evidence.hold_reason ?? ""}`);
  console.log(`EVIDENCE_JSON=${JSON.stringify(evidence)}`);
  const dir = process.env.ADCP_EVIDENCE_DIR;
  if (dir) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "adcp-review-dispatch-evidence.json"), json);
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "preflight" && mode !== "dispatch") {
    console.error("usage: node run.mjs <preflight|dispatch>");
    process.exit(2);
  }

  const ctx = contextFromEnv();
  const github = ctx.token
    ? createGithubClient({
        token: ctx.token,
        repository: ctx.repository,
        apiUrl: ctx.apiUrl,
      })
    : null;

  if (mode === "preflight") {
    const result = await runPreflight(ctx, { github });
    writeEvidence(result.evidence);
    process.exit(result.ok ? 0 : 1);
  }

  let transport = null;
  if (ctx.allowLiveDispatch) {
    transport = {
      kind: "live",
      post: (url, init) => livePost(url, init),
    };
  }
  const result = await runDispatch(ctx, { github, transport });
  writeEvidence(result.evidence);
  process.exit(result.ok ? 0 : 1);
}

try {
  await main();
} catch {
  console.error("HOLD: unexpected_failure");
  process.exit(1);
}
