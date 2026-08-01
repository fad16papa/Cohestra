import type { TenantShell } from "@/lib/shell/tenant-shell-api";

export function resolvePlanRegistrationLimit(shell: TenantShell | null): number | null {
  if (!shell) {
    return null;
  }

  const fromLimits = shell.limits.registrationsPerMonth;
  if (Number.isFinite(fromLimits) && fromLimits > 0) {
    return fromLimits;
  }

  const registrationsDial = shell.limitDials.find((dial) => dial.key === "registrations");
  if (registrationsDial && registrationsDial.limit > 0) {
    return registrationsDial.limit;
  }

  return null;
}

export function validateActivityMaxRegistrantsAgainstPlan(
  maxRegistrants: number | null,
  planRegistrationsPerMonth: number
): string | null {
  if (maxRegistrants === null) {
    return null;
  }

  if (!Number.isFinite(maxRegistrants) || maxRegistrants < 1) {
    return "Enter a whole number of at least 1, or leave blank for unlimited.";
  }

  if (maxRegistrants > planRegistrationsPerMonth) {
    return `Max registrants cannot exceed your plan limit of ${planRegistrationsPerMonth.toLocaleString()} registrations per month.`;
  }

  return null;
}

export function formatPlanRegistrationLimit(planRegistrationsPerMonth: number): string {
  return planRegistrationsPerMonth.toLocaleString();
}
