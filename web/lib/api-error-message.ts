const INFRA_ERROR_PATTERN =
  /stackexchange\.redis|redis server|connectionfailuretype|no connection became available/i;

/** Never show raw infrastructure errors in the UI. */
export function sanitizeClientErrorMessage(
  message: string,
  status?: number,
  errorCode?: string
): string {
  if (
    status === 503
    || errorCode === "rate_limiter_unavailable"
    || INFRA_ERROR_PATTERN.test(message)
  ) {
    return "Service is temporarily unavailable. Try again in a few minutes.";
  }

  return message;
}
