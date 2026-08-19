import { getPublicApiBaseUrl } from "@/lib/api";

export type SupportIssue = {
  id: string;
  issueNumber: string;
  status: string;
  createdAt: string;
};

export type SupportIssueListItem = {
  id: string;
  issueNumber: string;
  subject: string;
  status: string;
  createdAt: string;
};

export type SupportIssueReply = {
  body: string;
  createdAt: string;
};

export type SupportIssueDetail = {
  id: string;
  issueNumber: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  replies: SupportIssueReply[];
};

function parseIssue(raw: Record<string, unknown>): SupportIssue {
  return {
    id: String(raw.id ?? raw.Id ?? ""),
    issueNumber: String(raw.issueNumber ?? raw.IssueNumber ?? ""),
    status: String(raw.status ?? raw.Status ?? ""),
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? ""),
  };
}

function parseListItem(raw: Record<string, unknown>): SupportIssueListItem | null {
  const id = raw.id ?? raw.Id;
  const issueNumber = raw.issueNumber ?? raw.IssueNumber;
  const subject = raw.subject ?? raw.Subject;
  const status = raw.status ?? raw.Status;
  const createdAt = raw.createdAt ?? raw.CreatedAt;

  if (!id || !issueNumber || !subject) {
    return null;
  }

  return {
    id: String(id),
    issueNumber: String(issueNumber),
    subject: String(subject),
    status: String(status ?? ""),
    createdAt: String(createdAt ?? ""),
  };
}

function parseProblem(raw: Record<string, unknown>, fallback: string): string {
  const detail = raw.detail ?? raw.Detail;
  return typeof detail === "string" ? detail : fallback;
}

async function readJsonBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function errorMessage(
  response: Response,
  raw: Record<string, unknown>,
  fallback: string
): string {
  const detail = parseProblem(raw, fallback);
  if (detail !== fallback) {
    return detail;
  }

  return `${fallback} (HTTP ${response.status})`;
}

export async function createSupportIssue(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  input: {
    subject: string;
    description: string;
    files?: File[];
  }
): Promise<SupportIssue> {
  const formData = new FormData();
  formData.append("subject", input.subject);
  formData.append("description", input.description);

  for (const file of input.files ?? []) {
    formData.append("files", file);
  }

  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/support-issues`,
    {
      method: "POST",
      body: formData,
    }
  );

  const raw = await readJsonBody(response);
  if (!response.ok) {
    throw new Error(errorMessage(response, raw, "Could not submit support request."));
  }

  return parseIssue(raw);
}

export async function fetchSupportIssues(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SupportIssueListItem[]> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/support-issues`
  );
  const raw = await readJsonBody(response);

  if (!response.ok) {
    throw new Error(errorMessage(response, raw, "Could not load support requests."));
  }

  const itemsRaw = raw.items ?? raw.Items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item) => parseListItem(item as Record<string, unknown>))
    .filter((item): item is SupportIssueListItem => item !== null);
}

function parseReply(raw: Record<string, unknown>): SupportIssueReply | null {
  const body = raw.body ?? raw.Body;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  if (typeof body !== "string" || !createdAt) {
    return null;
  }
  return {
    body,
    createdAt: String(createdAt),
  };
}

function parseDetail(raw: Record<string, unknown>): SupportIssueDetail | null {
  const id = raw.id ?? raw.Id;
  const issueNumber = raw.issueNumber ?? raw.IssueNumber;
  const subject = raw.subject ?? raw.Subject;
  const description = raw.description ?? raw.Description;
  const status = raw.status ?? raw.Status;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  const updatedAt = raw.updatedAt ?? raw.UpdatedAt;

  if (!id || !issueNumber || !subject || !description) {
    return null;
  }

  const repliesRaw = raw.replies ?? raw.Replies;
  const replies = Array.isArray(repliesRaw)
    ? repliesRaw
        .map((item) => parseReply(item as Record<string, unknown>))
        .filter((item): item is SupportIssueReply => item !== null)
    : [];

  return {
    id: String(id),
    issueNumber: String(issueNumber),
    subject: String(subject),
    description: String(description),
    status: String(status ?? ""),
    createdAt: String(createdAt ?? ""),
    updatedAt: String(updatedAt ?? ""),
    replies,
  };
}

export async function fetchSupportIssueDetail(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  issueId: string
): Promise<SupportIssueDetail> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/support-issues/${issueId}`
  );
  const raw = await readJsonBody(response);

  if (!response.ok) {
    throw new Error(errorMessage(response, raw, "Could not load support request."));
  }

  const detail = parseDetail(raw);
  if (!detail) {
    throw new Error("Invalid support request response.");
  }

  return detail;
}
