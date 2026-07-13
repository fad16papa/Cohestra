import { getPublicApiBaseUrl } from "@/lib/api";

export type CategoryListItem = {
  id: string;
  name: string;
  activityCount: number;
  createdAt: string;
  updatedAt: string;
};

async function parseProblemDetail(response: Response): Promise<string> {
  try {
    const raw = (await response.json()) as Record<string, unknown>;
    const detail = raw.detail ?? raw.Detail;
    if (typeof detail === "string" && detail.length > 0) {
      return detail;
    }
  } catch {
    // fall through
  }

  return `Request failed (${response.status})`;
}

function parseCategory(raw: Record<string, unknown>): CategoryListItem {
  const id = raw.id ?? raw.Id;
  const name = raw.name ?? raw.Name;
  const activityCount = raw.activityCount ?? raw.ActivityCount;
  const createdAt = raw.createdAt ?? raw.CreatedAt;
  const updatedAt = raw.updatedAt ?? raw.UpdatedAt;

  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    typeof activityCount !== "number" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    throw new Error("Invalid category payload");
  }

  return { id, name, activityCount, createdAt, updatedAt };
}

export async function fetchCategories(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>
): Promise<CategoryListItem[]> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/categories`);

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  const raw = (await response.json()) as Record<string, unknown>;
  const items = raw.items ?? raw.Items;

  if (!Array.isArray(items)) {
    throw new Error("Invalid categories list payload");
  }

  return items.map((item) => parseCategory(item as Record<string, unknown>));
}

export async function createCategory(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  name: string
): Promise<CategoryListItem> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCategory((await response.json()) as Record<string, unknown>);
}

export async function updateCategory(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string,
  name: string
): Promise<CategoryListItem> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }

  return parseCategory((await response.json()) as Record<string, unknown>);
}

export async function deleteCategory(
  authFetch: (input: string, init?: RequestInit) => Promise<Response>,
  id: string
): Promise<void> {
  const response = await authFetch(`${getPublicApiBaseUrl()}/api/v1/admin/categories/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await parseProblemDetail(response));
  }
}
