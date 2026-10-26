import { HOLD, POLICY } from "./policy.mjs";
import { validateGithubApiUrl } from "./validate.mjs";

export const MAX_GITHUB_PAGES = 20;
export const MAX_PULL_FILES = 3000;
const SHA_RE = /^[0-9a-fA-F]{40}$/;

async function githubRequest(fetchFn, { apiUrl, token, path }) {
  const res = await fetchFn(`${apiUrl}${path}`, {
    method: "GET",
    headers: {
      Authorization: `${String.fromCharCode(66, 101, 97, 114, 101, 114)} ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "cohestra-adcp-review-dispatch",
    },
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 404) {
    return { status: 404, json: null, link: "" };
  }
  if (!res.ok) {
    const err = new Error(`github_http_${res.status}`);
    err.status = res.status;
    err.reason = HOLD.GITHUB_API;
    throw err;
  }
  return {
    status: res.status,
    json: await res.json(),
    link: res.headers?.get?.("link") || "",
  };
}

function paginationError(detail) {
  const err = new Error(detail);
  err.reason = HOLD.PAGINATION_INCOMPLETE;
  err.detail = detail;
  return err;
}

export function parseGithubNextPath(linkHeader, apiUrl) {
  if (!linkHeader) {
    return null;
  }
  const match = String(linkHeader)
    .split(",")
    .find((part) => part.includes('rel="next"'));
  if (!match) {
    return null;
  }
  const urlMatch = match.match(/<([^>]+)>/);
  if (!urlMatch) {
    throw paginationError("malformed_link");
  }
  let next;
  try {
    next = new URL(urlMatch[1]);
  } catch {
    throw paginationError("unparseable_link");
  }
  let base;
  try {
    base = new URL(apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`);
  } catch {
    throw paginationError("unparseable_api_url");
  }
  if (next.origin !== base.origin || next.protocol !== base.protocol) {
    throw paginationError("off_origin_link");
  }
  if (next.username || next.password) {
    throw paginationError("link_userinfo");
  }
  return `${next.pathname}${next.search}`;
}

export function createGithubClient({
  token,
  repository,
  apiUrl = "https://api.github.com",
  fetchImpl,
}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  if (typeof fetchFn !== "function") {
    throw new Error("fetch_unavailable");
  }
  const apiCheck = validateGithubApiUrl(apiUrl);
  if (!apiCheck.ok) {
    const err = new Error(apiCheck.detail || "untrusted_api_url");
    err.reason = HOLD.GITHUB_API;
    throw err;
  }
  const [owner, repo] = String(repository).split("/");

  async function paginate(path, listKey) {
    const items = [];
    let current = path;
    let guard = 0;
    while (current && guard < MAX_GITHUB_PAGES) {
      guard += 1;
      const page = await githubRequest(fetchFn, {
        apiUrl,
        token,
        path: current,
      });
      const chunk = listKey ? page.json?.[listKey] : page.json;
      if (!Array.isArray(chunk)) {
        const err = new Error("github_page_not_array");
        err.reason = HOLD.GITHUB_API;
        throw err;
      }
      items.push(...chunk);
      const next = parseGithubNextPath(page.link, apiUrl);
      if (next && guard >= MAX_GITHUB_PAGES) {
        throw paginationError("page_cap");
      }
      current = next;
    }
    return items;
  }

  return {
    async getPullRequest(number) {
      const page = await githubRequest(fetchFn, {
        apiUrl,
        token,
        path: `/repos/${owner}/${repo}/pulls/${number}`,
      });
      return page.json;
    },
    async getIssue(number) {
      const page = await githubRequest(fetchFn, {
        apiUrl,
        token,
        path: `/repos/${owner}/${repo}/issues/${number}`,
      });
      return page.json;
    },
    async getCheckRuns(sha) {
      return paginate(
        `/repos/${owner}/${repo}/commits/${encodeURIComponent(sha)}/check-runs?per_page=100`,
        "check_runs",
      );
    },
    async listWorkflowRuns(sha) {
      return paginate(
        `/repos/${owner}/${repo}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=100`,
        "workflow_runs",
      );
    },
    async listWorkflowJobs(runId) {
      return paginate(
        `/repos/${owner}/${repo}/actions/runs/${encodeURIComponent(runId)}/jobs?per_page=100`,
        "jobs",
      );
    },
    async listPullFiles(number) {
      const files = await paginate(
        `/repos/${owner}/${repo}/pulls/${number}/files?per_page=100`,
      );
      return { files, incomplete: files.length >= MAX_PULL_FILES };
    },
    async getProtectedMainSha() {
      const page = await githubRequest(fetchFn, {
        apiUrl,
        token,
        path: `/repos/${owner}/${repo}/git/ref/${POLICY.protectedMainRef}`,
      });
      const sha = page.json?.object?.sha;
      return sha ? String(sha).toLowerCase() : null;
    },
    async getWorkflow(workflowPath) {
      const page = await githubRequest(fetchFn, {
        apiUrl,
        token,
        path: `/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflowPath)}`,
      });
      return page.json;
    },
    async getFileAtRef(path, ref) {
      if (path !== POLICY.trustedActionsWorkflowPath) {
        const err = new Error("untrusted_content_path");
        err.reason = HOLD.GITHUB_API;
        throw err;
      }
      if (!SHA_RE.test(String(ref || ""))) {
        const err = new Error("untrusted_content_ref");
        err.reason = HOLD.GITHUB_API;
        throw err;
      }
      const page = await githubRequest(fetchFn, {
        apiUrl,
        token,
        path: `/repos/${owner}/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(ref)}`,
      });
      if (page.status === 404 || !page.json) {
        return { missing: true };
      }
      const json = page.json;
      if (json.type !== "file" || json.encoding !== "base64" || !json.content) {
        const err = new Error("contents_unusable");
        err.reason = HOLD.CHECK_WORKFLOW_DEFINITION;
        err.detail = "contents_unusable";
        throw err;
      }
      const bytes = Buffer.from(String(json.content).replace(/\s+/g, ""), "base64");
      return {
        blobSha: String(json.sha || ""),
        bytes,
        path: json.path || path,
        size: json.size,
      };
    },
  };
}
