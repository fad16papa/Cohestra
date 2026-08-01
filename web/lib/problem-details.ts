export type ParsedProblemDetails = {
  message: string;
  errorCode?: string;
  verifyTenantSlug?: string;
};

function readStringField(
  raw: Record<string, unknown>,
  key: string
): string | undefined {
  const direct = raw[key];
  if (typeof direct === "string" && direct.length > 0) {
    return direct;
  }

  const extensions = raw.extensions ?? raw.Extensions;
  if (extensions && typeof extensions === "object") {
    const nested = (extensions as Record<string, unknown>)[key];
    if (typeof nested === "string" && nested.length > 0) {
      return nested;
    }
  }

  return undefined;
}

/** Parse RFC 7807 ProblemDetails — ASP.NET emits extension keys at the JSON root. */
export function parseProblemFields(raw: Record<string, unknown>): ParsedProblemDetails {
  const detail = raw.detail ?? raw.Detail;
  const title = raw.title ?? raw.Title;
  const errorCode = readStringField(raw, "errorCode");
  const verifyTenantSlug = readStringField(raw, "verifyTenantSlug");

  if (typeof detail === "string" && detail.length > 0) {
    return { message: detail, errorCode, verifyTenantSlug };
  }

  if (typeof title === "string" && title.length > 0) {
    return { message: title, errorCode, verifyTenantSlug };
  }

  return { message: "Request failed.", errorCode, verifyTenantSlug };
}
