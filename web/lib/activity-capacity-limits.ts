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
