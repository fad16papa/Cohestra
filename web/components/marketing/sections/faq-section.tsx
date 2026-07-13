"use client";

import { MarketingFaqItem } from "@/components/marketing/marketing-primitives";
import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";

import { SectionShell, SectionTitle } from "./section-shell";

export function FaqPublicSection({ section }: { section: SiteSection }) {
  const title = typeof section.props.title === "string" ? section.props.title : "";
  const variant = readSectionVariant(section.props);
  const items = (Array.isArray(section.props.items) ? section.props.items : []).filter(
    (item) => {
      if (typeof item !== "object" || item === null) {
        return false;
      }

      const question =
        typeof (item as Record<string, unknown>).question === "string"
          ? String((item as Record<string, unknown>).question).trim()
          : "";
      return Boolean(question);
    }
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <SectionShell variant={variant}>
      {title ? <SectionTitle className="mb-6 sm:mb-8">{title}</SectionTitle> : null}
      <div className="flex w-full flex-col gap-3 sm:gap-4">
        {items.map((item, index) => {
          if (typeof item !== "object" || item === null) {
            return null;
          }

          const record = item as Record<string, unknown>;
          const question = typeof record.question === "string" ? record.question : "";
          const answer = typeof record.answer === "string" ? record.answer : "";

          return (
            <MarketingFaqItem
              key={`faq-${index}`}
              question={question}
              answer={answer || undefined}
            />
          );
        })}
      </div>
    </SectionShell>
  );
}
