"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth/auth-provider";
import {
  PlatformDataTable,
  PlatformDataTableBody,
  PlatformDataTableCell,
  PlatformDataTableHead,
  PlatformDataTableHeaderCell,
  PlatformDataTableRow,
} from "@/components/platform/platform-data-table";
import { PlatformOmniSearch } from "@/components/platform/platform-omni-search";
import {
  createPlatformTenant,
  listPlatformTenants,
  type TenantListItem,
} from "@/lib/platform-api";

const TENANT_STATUSES = ["Active", "Suspended", "Archived"] as const;
const BILLING_STATUSES = ["Free", "Active", "PastDue", "Canceled"] as const;
const PLANS = ["Basic", "Core", "Pro"] as const;

export default function PlatformTenantDirectoryPage() {
  const router = useRouter();
  const { authFetch } = useAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [billingFilter, setBillingFilter] = useState("");
  const [hideLoadTest, setHideLoadTest] = useState(true);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TenantListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createPlan, setCreatePlan] = useState<string>("Basic");
  const [createEmail, setCreateEmail] = useState("");
  const [createComplimentary, setCreateComplimentary] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void listPlatformTenants(authFetch, {
      search: query,
      status: statusFilter || undefined,
      billingStatus: billingFilter || undefined,
      hideLoadTest,
      page,
      pageSize: 25,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }
        setItems(result.items);
        setTotalCount(result.totalCount);
        setPageSize(result.pageSize);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) {
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load tenants.");
        setItems([]);
        setTotalCount(0);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, page, query, statusFilter, billingFilter, hideLoadTest]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setPage(1);
    setStatusFilter(event.target.value);
  }

  function handleBillingChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setPage(1);
    setBillingFilter(event.target.value);
  }

  function handleHideLoadTestChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPage(1);
    setHideLoadTest(event.target.checked);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const tenant = await createPlatformTenant(authFetch, {
        name: createName.trim(),
        slug: createSlug.trim(),
        plan: createPlan,
        adminContactEmail: createEmail.trim(),
        isComplimentary: createComplimentary,
      });
      setShowCreate(false);
      setCreateName("");
      setCreateSlug("");
      setCreatePlan("Basic");
      setCreateEmail("");
      setCreateComplimentary(false);
      router.push(`/platform/tenants/${tenant.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create tenant.");
    } finally {
      setCreating(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1
            className="text-3xl tracking-tight text-[var(--plat-ink)]"
            style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
          >
            Tenant directory
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--plat-stone)]">
            Search workspaces by slug or name. Counts are aggregates only — no client export.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-[var(--plat-lagoon)] px-4 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F]"
        >
          {showCreate ? "Cancel" : "Create tenant"}
        </button>
      </div>

      <PlatformOmniSearch authFetch={authFetch} />

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-[12px] border border-[var(--plat-line)] bg-white/50 p-5"
        >
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
            New workspace
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--plat-ink-soft)]">Organization name</span>
              <input
                required
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--plat-ink-soft)]">Slug</span>
              <input
                required
                value={createSlug}
                onChange={(event) => setCreateSlug(event.target.value)}
                placeholder="acme-org"
                className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--plat-ink-soft)]">Plan</span>
              <select
                value={createPlan}
                onChange={(event) => setCreatePlan(event.target.value)}
                className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              >
                {PLANS.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--plat-ink-soft)]">Admin contact email</span>
              <input
                required
                type="email"
                value={createEmail}
                onChange={(event) => setCreateEmail(event.target.value)}
                className="min-h-11 w-full rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--plat-ink-soft)]">
            <input
              type="checkbox"
              checked={createComplimentary}
              onChange={(event) => setCreateComplimentary(event.target.checked)}
              className="size-4 rounded border-[var(--plat-line-strong)]"
            />
            Complimentary (sponsored) workspace
          </label>
          {createError ? (
            <p role="alert" className="text-sm text-[var(--plat-danger)]">
              {createError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={creating}
            className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-5 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F] disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create workspace"}
          </button>
        </form>
      ) : null}

      <form onSubmit={handleSearch} className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="sr-only" htmlFor="tenant-search">
          Search tenants
        </label>
        <input
          id="tenant-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Slug or organization name"
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        />
        <label className="sr-only" htmlFor="tenant-status">
          Filter by status
        </label>
        <select
          id="tenant-status"
          value={statusFilter}
          onChange={handleStatusChange}
          className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        >
          <option value="">All statuses</option>
          {TENANT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="tenant-billing">
          Filter by billing
        </label>
        <select
          id="tenant-billing"
          value={billingFilter}
          onChange={handleBillingChange}
          className="min-h-11 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        >
          <option value="">All billing</option>
          {BILLING_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-5 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F]"
        >
          Search
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm text-[var(--plat-stone)]">
        <input
          type="checkbox"
          checked={hideLoadTest}
          onChange={handleHideLoadTestChange}
          className="size-4 rounded border-[var(--plat-line-strong)]"
        />
        Hide demo / load-test workspaces
      </label>

      {error ? (
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--plat-stone)]">Loading directory…</p>
      ) : (
        <PlatformDataTable>
          <PlatformDataTableHead>
            <PlatformDataTableHeaderCell>Slug</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Name</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Status</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Billing</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Created</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Admin</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell>Activities</PlatformDataTableHeaderCell>
            <PlatformDataTableHeaderCell className="pr-0">Clients</PlatformDataTableHeaderCell>
          </PlatformDataTableHead>
          <PlatformDataTableBody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-[var(--plat-stone)]">
                  No tenants match this search.
                </td>
              </tr>
            ) : (
              items.map((tenant) => (
                <PlatformDataTableRow key={tenant.id}>
                  <PlatformDataTableCell>
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="font-semibold text-[var(--plat-lagoon)] underline-offset-4 hover:underline"
                    >
                      {tenant.slug}
                    </Link>
                  </PlatformDataTableCell>
                  <PlatformDataTableCell className="text-[var(--plat-ink-soft)]">
                    {tenant.name}
                  </PlatformDataTableCell>
                  <PlatformDataTableCell>{tenant.status}</PlatformDataTableCell>
                  <PlatformDataTableCell>{tenant.billingStatus}</PlatformDataTableCell>
                  <PlatformDataTableCell className="tabular-nums text-[var(--plat-stone)]">
                    {formatDate(tenant.createdAt)}
                  </PlatformDataTableCell>
                  <PlatformDataTableCell className="text-[var(--plat-ink-soft)]">
                    {tenant.adminContactEmail ?? "—"}
                  </PlatformDataTableCell>
                  <PlatformDataTableCell className="tabular-nums">
                    {tenant.activityCount}
                  </PlatformDataTableCell>
                  <PlatformDataTableCell className="tabular-nums pr-0">
                    {tenant.clientCount}
                  </PlatformDataTableCell>
                </PlatformDataTableRow>
              ))
            )}
          </PlatformDataTableBody>
        </PlatformDataTable>
      )}

      <div className="flex items-center justify-between gap-4 text-sm text-[var(--plat-stone)]">
        <p>
          {totalCount} tenant{totalCount === 1 ? "" : "s"}
          {totalCount > 0 ? ` · page ${page} of ${totalPages}` : null}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="min-h-10 rounded-[10px] border border-[var(--plat-line-strong)] px-3 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
            className="min-h-10 rounded-[10px] border border-[var(--plat-line-strong)] px-3 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString().slice(0, 10);
}
