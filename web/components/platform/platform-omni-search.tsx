"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

import { platformOmniSearch, type PlatformOmniSearchResult } from "@/lib/platform-api";

type PlatformOmniSearchProps = {
  authFetch: (input: string, init?: RequestInit) => Promise<Response>;
  placeholder?: string;
};

export function PlatformOmniSearch({
  authFetch,
  placeholder = "Slug, email, or SUP issue number",
}: PlatformOmniSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlatformOmniSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSearch(term: string) {
    if (!term.trim()) {
      setResults(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await platformOmniSearch(authFetch, term);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(query);
  }

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
    }
  }, [query]);

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="platform-omni-search">
          Search tenants and issues
        </label>
        <input
          id="platform-omni-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          className="min-h-11 flex-1 rounded-[10px] border border-[var(--plat-line-strong)] bg-white/80 px-3 text-sm outline-none focus:border-[var(--plat-lagoon)] focus:ring-2 focus:ring-[var(--plat-lagoon)]/20"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-[10px] bg-[var(--plat-lagoon)] px-5 text-sm font-semibold text-[var(--plat-lagoon-fg)] transition-colors hover:bg-[#08554F] disabled:opacity-50"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-sm text-[var(--plat-danger)]">
          {error}
        </p>
      ) : null}

      {results ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <SearchGroup title="Tenants">
            {results.tenants.length === 0 ? (
              <p className="text-sm text-[var(--plat-stone)]">No tenants matched.</p>
            ) : (
              <ul className="space-y-2">
                {results.tenants.map((tenant) => (
                  <li key={tenant.id}>
                    <Link
                      href={`/platform/tenants/${tenant.id}`}
                      className="block rounded-[10px] border border-[var(--plat-line)] px-3 py-2 text-sm hover:bg-white/60"
                    >
                      <span className="font-semibold text-[var(--plat-ink)]">{tenant.slug}</span>
                      <span className="block text-[var(--plat-stone)]">{tenant.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SearchGroup>
          <SearchGroup title="Issues">
            {results.issues.length === 0 ? (
              <p className="text-sm text-[var(--plat-stone)]">No issues matched.</p>
            ) : (
              <ul className="space-y-2">
                {results.issues.map((issue) => (
                  <li key={issue.id}>
                    <Link
                      href={`/platform/support/${issue.id}`}
                      className="block rounded-[10px] border border-[var(--plat-line)] px-3 py-2 text-sm hover:bg-white/60"
                    >
                      <span className="font-semibold text-[var(--plat-ink)]">{issue.issueNumber}</span>
                      <span className="block text-[var(--plat-stone)]">{issue.subject}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SearchGroup>
        </div>
      ) : null}
    </div>
  );
}

function SearchGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[var(--plat-line)] bg-white/50 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--plat-stone)]">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}
