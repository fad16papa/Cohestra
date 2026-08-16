"use client";

import Link from "next/link";

import {
  MarketingFooter,
  MarketingShell,
  marketingAtelierButtonClass,
  marketingCardClass,
} from "@/components/marketing/marketing-shell";
import { MarketingReveal } from "@/components/marketing/marketing-reveal";
import { useMarketingHeaderScroll } from "@/components/marketing/use-marketing-header-scroll";
import {
  PRODUCT_DOCS_EYEBROW,
  PRODUCT_DOCS_INTRO,
  PRODUCT_DOCS_SECTIONS,
  PRODUCT_DOCS_TITLE,
  type DocsBlock,
} from "@/lib/marketing/product-docs-content";

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

export function ProductDocsPage() {
  const { scrolled, anchorRef } = useMarketingHeaderScroll(true);

  return (
    <MarketingShell scrolled={scrolled}>
      <div ref={anchorRef} aria-hidden className="pointer-events-none absolute top-0 h-px w-full" />

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 py-12 sm:px-8 lg:flex-row lg:px-10 lg:py-16">
        <aside className="lg:sticky lg:top-24 lg:h-fit lg:w-64 lg:shrink-0">
          <p className="text-section text-gold">{PRODUCT_DOCS_EYEBROW}</p>
          <p className="mt-2 text-sm text-stone">Jump to a part</p>
          <nav aria-label="Document sections" className="mt-4">
            <ol className="space-y-1.5 text-sm">
              {PRODUCT_DOCS_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-stone hover:text-ink"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 flex-1">
          <MarketingReveal immediate delayMs={80}>
            <h1 className="text-marketing-section text-ink">{PRODUCT_DOCS_TITLE}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone">
              {PRODUCT_DOCS_INTRO}
            </p>
          </MarketingReveal>

          <div className="mt-10 space-y-10">
            {PRODUCT_DOCS_SECTIONS.map((section, index) => (
              <MarketingReveal key={section.id} delayMs={100 + index * 20}>
                <section
                  id={section.id}
                  className={`${marketingCardClass("default")} scroll-mt-28 p-5 sm:p-7`}
                >
                  <h2 className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-[-0.03em] text-ink">
                    {section.title}
                  </h2>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed text-stone sm:text-[0.9375rem]">
                    {section.blocks.map((block, blockIndex) => (
                      <DocsBlockView
                        key={`${section.id}-${block.type}-${blockIndex}`}
                        block={block}
                      />
                    ))}
                  </div>
                </section>
              </MarketingReveal>
            ))}
          </div>

          <MarketingReveal delayMs={200} className="mt-12 flex flex-wrap gap-3">
            <Link href="/signup" className={marketingAtelierButtonClass("lagoon")}>
              Start free
            </Link>
            <Link href="/login" className={marketingAtelierButtonClass("ghost")}>
              Sign in
            </Link>
          </MarketingReveal>
        </article>
      </div>

      <MarketingFooter />
    </MarketingShell>
  );
}
