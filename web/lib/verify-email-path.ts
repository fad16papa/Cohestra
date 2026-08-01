/** Infer tenant slug from `{slug}.localhost` during local Docker UAT. */
export function inferTenantSlugFromHost(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const host = window.location.hostname.toLowerCase();
  if (!host.endsWith(".localhost")) {
    return null;
  }

  const slug = host.slice(0, -".localhost".length);
  if (!slug || slug === "default" || slug === "cohestra.app") {
    return null;
  }

  return slug;
}

/** Route unverified users to the correct OTP screen (bootstrap register vs self-serve signup). */
export function buildVerifyEmailPath(
  email: string,
  verifyTenantSlug?: string | null
): string {
  const params = new URLSearchParams({ email: email.trim() });
  const slug = verifyTenantSlug?.trim() || inferTenantSlugFromHost();

  if (slug) {
    params.set("slug", slug);
    return `/signup/verify?${params.toString()}`;
  }

  return `/register/verify?${params.toString()}`;
}
