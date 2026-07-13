export function getDisplayNameFromEmail(email: string): string {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) {
    return "Operator";
  }

  const normalized = localPart.replace(/[._+-]+/g, " ").trim();
  if (!normalized) {
    return "Operator";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getInitials(fullName: string, maxLength = 2): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }

  if (parts.length === 1) {
    return parts[0]!.slice(0, maxLength).toUpperCase();
  }

  return parts
    .slice(0, maxLength)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
