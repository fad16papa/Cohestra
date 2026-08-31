import { getPublicApiBaseUrl } from "@/lib/api";
import { parseProblemFields } from "@/lib/problem-details";

export type SubmitWebsiteInquiryPayload = {
  name: string;
  email?: string | null;
  phone?: string | null;
  message: string;
  consentGiven: boolean;
};

export type WebsiteInquirySubmitResult =
  | {
      ok: true;
      clientId: string;
      clientCreated: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
      errorCode?: string | null;
      status: number;
    };

export async function submitWebsiteInquiry(
  payload: SubmitWebsiteInquiryPayload
): Promise<WebsiteInquirySubmitResult> {
  const response = await fetch(`${getPublicApiBaseUrl()}/api/v1/public/website-inquiries`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      message: payload.message,
      consentGiven: payload.consentGiven,
    }),
  });

  if (response.ok) {
    const raw = (await response.json()) as Record<string, unknown>;
    const clientId = raw.clientId ?? raw.ClientId;
    const clientCreated = raw.clientCreated ?? raw.ClientCreated;
    const message = raw.message ?? raw.Message;

    if (typeof clientId !== "string" && typeof clientId !== "number") {
      return {
        ok: false,
        error: "Unexpected response from server.",
        status: response.status,
      };
    }

    return {
      ok: true,
      clientId: String(clientId),
      clientCreated: Boolean(clientCreated),
      message: typeof message === "string" ? message : "Thank you!",
    };
  }

  const problemRaw = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const problem = problemRaw ? parseProblemFields(problemRaw) : { message: "Unable to send your message." };
  return {
    ok: false,
    error: problem.message,
    errorCode: problem.errorCode ?? null,
    status: response.status,
  };
}
