import type {
  ActivityFormSchema,
  FormFieldDefinition,
  FormFieldVisibleWhen,
} from "@/lib/activities-api";

export function normalizeComparableAnswer(value: unknown): string {
  if (value === true) {
    return "yes";
  }

  if (value === false) {
    return "no";
  }

  if (typeof value !== "string") {
    return value == null ? "" : String(value);
  }

  const trimmed = value.trim();
  if (/^(true|yes)$/i.test(trimmed)) {
    return "yes";
  }

  if (/^(false|no)$/i.test(trimmed)) {
    return "no";
  }

  return trimmed;
}

export function isFieldVisible(
  field: FormFieldDefinition,
  answers: Record<string, unknown>,
  fields: FormFieldDefinition[] = [],
  visiting: Set<string> = new Set()
): boolean {
  const rule = field.visibleWhen;
  if (!rule) {
    return true;
  }

  if (!rule.fieldId.trim()) {
    return false;
  }

  if (visiting.has(field.id)) {
    return false;
  }

  visiting.add(field.id);
  const controller = fields.find((candidate) => candidate.id === rule.fieldId);
  if (controller && !isFieldVisible(controller, answers, fields, visiting)) {
    return false;
  }

  const actual = normalizeComparableAnswer(answers[rule.fieldId]);
  if (rule.equals) {
    return actual === normalizeComparableAnswer(rule.equals);
  }

  if (rule.notEquals) {
    return actual !== normalizeComparableAnswer(rule.notEquals);
  }

  return false;
}

export function collectVisibleWhenIssues(
  fields: FormFieldDefinition[]
): string[] {
  const ids = new Set(fields.map((field) => field.id));
  const edges = new Map<string, string>();
  const issues: string[] = [];

  for (const field of fields) {
    const rule = field.visibleWhen;
    if (!rule) {
      continue;
    }

    if (!rule.fieldId.trim()) {
      issues.push(`Field "${field.label || field.id}" Recipe is missing a controller Field.`);
      continue;
    }

    if (!ids.has(rule.fieldId)) {
      issues.push(
        `Field "${field.label || field.id}" Recipe points at unknown Field "${rule.fieldId}".`
      );
      continue;
    }

    if (rule.fieldId === field.id) {
      issues.push(`Field "${field.label || field.id}" Recipe cannot reference itself.`);
      continue;
    }

    const hasEquals = Boolean(rule.equals?.trim());
    const hasNotEquals = Boolean(rule.notEquals?.trim());
    if (hasEquals === hasNotEquals) {
      issues.push(
        `Field "${field.label || field.id}" Recipe must set exactly one of equals or not equals.`
      );
      continue;
    }

    edges.set(field.id, rule.fieldId);
  }

  if (hasVisibleWhenCycle(edges)) {
    issues.push("Recipes cannot form a cycle.");
  }

  return issues;
}

function hasVisibleWhenCycle(edges: Map<string, string>): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(node: string): boolean {
    if (visiting.has(node)) {
      return true;
    }

    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    visiting.add(node);
    const next = edges.get(node);
    if (next && dfs(next)) {
      return true;
    }

    visiting.delete(node);
    return false;
  }

  return [...edges.keys()].some(dfs);
}

export function recipeSummary(rule: FormFieldVisibleWhen | null | undefined): string | null {
  if (!rule?.fieldId) {
    return null;
  }

  if (rule.equals) {
    return `Shown when ${rule.fieldId} is ${rule.equals}`;
  }

  if (rule.notEquals) {
    return `Shown when ${rule.fieldId} is not ${rule.notEquals}`;
  }

  return null;
}
