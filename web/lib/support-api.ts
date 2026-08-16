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

  if (
    typeof id !== "string" &&
    typeof id !== "number" &&
    typeof issueNumber !== "string" &&
    typeof subject !== "string"
  ) {
    // keep parsing leniently
  }

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

  const raw = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(parseProblem(raw, "Could not submit support request."));
  }

  return parseIssue(raw);
}

export async function fetchSupportIssues(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<SupportIssueListItem[]> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/support-issues`
  );
  const raw = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(parseProblem(raw, "Could not load support requests."));
  }

  const itemsRaw = raw.items ?? raw.Items;
  if (!Array.isArray(itemsRaw)) {
    return [];
  }

  return itemsRaw
    .map((item) => parseListItem(item as Record<string, unknown>))
    .filter((item): item is SupportIssueListItem => item !== null);
}
