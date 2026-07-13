export function isOperatorOnlyCtaTarget(target: string): boolean {
  const normalized = target.trim().toLowerCase();
  return (
    normalized === "/login" ||
    normalized === "/register" ||
    normalized.startsWith("/login/") ||
    normalized.startsWith("/register/")
  );
}

export function readPublicCta(
  props: Record<string, unknown>,
  key: string
): { label: string; target: string } | null {
  const cta = props[key];
  if (typeof cta !== "object" || cta === null) {
    return null;
  }

  const record = cta as Record<string, unknown>;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const target = typeof record.target === "string" ? record.target.trim() : "";

  if (!label || !target || isOperatorOnlyCtaTarget(target)) {
    return null;
  }

  return { label, target };
}
