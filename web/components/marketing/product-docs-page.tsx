"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";

import {
  MarketingFooter,
  MarketingShell,
  marketingCardClass,
} from "@/components/marketing/marketing-shell";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import {
  PRODUCT_DOCS_EYEBROW,
  PRODUCT_DOCS_GROUPS,
  PRODUCT_DOCS_INTRO,
  PRODUCT_DOCS_SECTIONS,
  PRODUCT_DOCS_START_PATHS,
  PRODUCT_DOCS_TITLE,
  type DocsBlock,
  type DocsSection,
} from "@/lib/marketing/product-docs-content";
import { cn } from "@/lib/utils";

function DocsBlockView({ block }: { block: DocsBlock }) {
  if (block.type === "p") {
    return <p>{block.text}</p>;
  }

  if (block.type === "note") {
    return (
      <p className="rounded-[12px] border border-lagoon/25 bg-lagoon/[0.06] px-4 py-3 text-ink">
        <span className="font-semibold text-lagoon-deep">Remember: </span>
        {block.text}
      </p>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-1.5 pl-5">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }

  if (block.type === "steps") {
    return (
      <ol className="list-decimal space-y-2 pl-5">
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-line">
            {block.headers.map((header) => (
              <th key={header} className="px-3 py-2 font-semibold text-ink">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row) => (
            <tr key={row.join("|")} className="border-b border-line/70 align-top">
              {row.map((cell, index) => (
                <td
                  key={`${row[0]}-${index}`}
                  className={index === 0 ? "px-3 py-2.5 font-medium text-ink" : "px-3 py-2.5"}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function sectionMatchesQuery(section: DocsSection, query: string): boolean {
  if (!query) {
    return true;
  }

  const haystack = [
    section.title,
    ...section.blocks.flatMap((block) => {
      if (block.type === "p" || block.type === "note") {
        return [block.text];
      }
      if (block.type === "steps" || block.type === "list") {
        return block.items;
      }
      return [...block.headers, ...block.rows.flat()];
    }),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function ProductDocsPage() {
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(PRODUCT_DOCS_SECTIONS[0]?.id ?? "");

  const normalizedQuery = query.trim().toLowerCase();
  const visibleSections = useMemo(
    () =>
      PRODUCT_DOCS_SECTIONS.filter((section) =>
        sectionMatchesQuery(section, normalizedQuery)
      ),
    [normalizedQuery]
  );

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && PRODUCT_DOCS_SECTIONS.some((section) => section.id === hash)) {
      setActiveId(hash);
    }

    const headings = PRODUCT_DOCS_SECTIONS.map((section) =>
      document.getElementById(section.id)
    ).filter((node): node is HTMLElement => Boolean(node));

    if (headings.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0.15, 0.4, 0.7] }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, []);

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <div className="border-b border-line bg-paper-warm">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-lagoon/10 text-lagoon">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <div>
              <p className="text-section text-gold">{PRODUCT_DOCS_EYEBROW}</p>
              <h1 className="text-marketing-section mt-2 text-ink">{PRODUCT_DOCS_TITLE}</h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone">
                {PRODUCT_DOCS_INTRO} This is the official Cohestra user manual.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {PRODUCT_DOCS_START_PATHS.map((path) => (
              <a
                key={path.href}
                href={path.href}
                className={marketingCardClass(
                  "default",
                  "block p-4 transition-colors hover:border-lagoon/40"
                )}
              >
                <p className="font-semibold text-ink">{path.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-stone">{path.detail}</p>
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-5 py-10 sm:px-8 lg:flex-row lg:px-10 lg:py-12">
        <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
          <label className="relative block">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the manual"
              className="h-10 w-full rounded-xl border-0 bg-muted/55 pr-3 pl-9 text-sm text-ink outline-none ring-0 placeholder:text-stone focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-lagoon/30"
            />
            <span className="sr-only">Search the Document</span>
          </label>

          <nav aria-label="Document chapters" className="mt-6 space-y-5">
            {PRODUCT_DOCS_GROUPS.map((group) => {
              const items = visibleSections.filter((section) => section.group === group.id);
              if (items.length === 0) {
                return null;
              }

              return (
                <div key={group.id}>
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-gold uppercase">
                    {group.label}
                  </p>
                  <ol className="mt-2 space-y-0.5">
                    {items.map((section) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          onClick={() => setActiveId(section.id)}
                          className={cn(
                            "block rounded-lg px-2.5 py-1.5 text-sm leading-snug",
                            activeId === section.id
                              ? "bg-lagoon/10 font-medium text-lagoon-deep"
                              : "text-stone hover:bg-muted/60 hover:text-ink"
                          )}
                        >
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0 flex-1">
          {visibleSections.length === 0 ? (
            <p className="text-sm text-stone">No chapters match that search. Try a shorter word.</p>
          ) : (
            <div className="space-y-14">
              {visibleSections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-28">
                  <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-[-0.03em] text-ink sm:text-[1.75rem]">
                    {section.title}
                  </h2>
                  <div className="mt-5 space-y-4 text-[0.95rem] leading-relaxed text-stone">
                    {section.blocks.map((block, blockIndex) => (
                      <DocsBlockView
                        key={`${section.id}-${block.type}-${blockIndex}`}
                        block={block}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </article>
      </div>

      <MarketingFooter />
    </MarketingShell>
  );
}
