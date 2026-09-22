import { parseProblemFields, type ParsedProblemDetails } from "@/lib/problem-details";
import { isBasicPlan } from "@/lib/shell/tenant-shell-api";

export const PLAN_LOCKED_ERROR_CODE = "plan_locked";

export type PlanLockedDetails = {
  message: string;
  errorCode: typeof PLAN_LOCKED_ERROR_CODE;
  feature?: string;
  requiredPlan?: string;
};

export class PlanLockedError extends Error {
  readonly errorCode = PLAN_LOCKED_ERROR_CODE;
  readonly feature?: string;
  readonly requiredPlan?: string;
  readonly status: number;

  constructor(details: PlanLockedDetails, status = 403) {
    super(details.message);
    this.name = "PlanLockedError";
    this.feature = details.feature;
    this.requiredPlan = details.requiredPlan;
    this.status = status;
  }
}

export function isPlanLockedError(error: unknown): error is PlanLockedError {
  return error instanceof PlanLockedError;
}

export function shouldSkipWebsiteAdminFetch(plan: string | null | undefined): boolean {
  return typeof plan === "string" && isBasicPlan(plan);
}

export function planLockedFromProblem(
  problem: ParsedProblemDetails,
  status: number
): PlanLockedError | null {
  if (status !== 403 || problem.errorCode !== PLAN_LOCKED_ERROR_CODE) {
    return null;
  }

  return new PlanLockedError(
    {
      message: problem.message,
      errorCode: PLAN_LOCKED_ERROR_CODE,
      feature: problem.feature,
      requiredPlan: problem.requiredPlan,
    },
    status
  );
}

export async function throwIfSiteRequestFailed(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    try {
      const raw = (await response.json()) as Record<string, unknown>;
      const problem = parseProblemFields(raw);
      const locked = planLockedFromProblem(problem, response.status);
      if (locked) {
        throw locked;
      }
      throw new Error(problem.message);
    } catch (error) {
      if (error instanceof PlanLockedError) {
        throw error;
      }
      if (error instanceof SyntaxError) {
        // Fall through to the generic status error.
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Request failed (${response.status})`);
}
