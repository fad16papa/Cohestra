import { getPublicApiBaseUrl } from "@/lib/api";

export type EmailDeliveryChecklistItem = {
  id: string;
  title: string;
  detail: string;
  status: "complete" | "action_required" | "warning" | "info";
  actionHint: string | null;
};

export type EmailDeliveryStatus = {
  isReady: boolean;
  apiKeyConfigured: boolean;
  sandboxMode: boolean;
  fromEmail: string;
  fromName: string;
  checklist: EmailDeliveryChecklistItem[];
};

async function parseProblemDetail(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as { detail?: string; title?: string };
    return problem.detail ?? problem.title ?? `Request failed (${response.status}).`;
  } catch {
    return `Request failed (${response.status}).`;
  }
}

export async function fetchEmailDeliveryStatus(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<EmailDeliveryStatus> {
  const response = await authFetch(
    `${getPublicApiBaseUrl()}/api/v1/admin/email-delivery/status`
  );

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("__forbidden__");
    }
    throw new Error(await parseProblemDetail(response));
  }

  return (await response.json()) as EmailDeliveryStatus;
}

export function checklistStatusLabel(status: EmailDeliveryChecklistItem["status"]): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "action_required":
      return "Action required";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
    default:
      return status;
  }
}
