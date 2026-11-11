"use client";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { FOLLOW_UP_CATEGORY_OPTIONS } from "@/lib/follow-up-category";
import { cn } from "@/lib/utils";

const ROOMS = [
  { label: "Dashboard", mark: null },
  { label: "Clients", mark: null },
  { label: "Activities", mark: null },
  { label: "Follow-up", mark: "current" as const },
  { label: "Analytics", mark: null },
  { label: "Cohestra AI", mark: null },
  { label: "Website", mark: "Core" as const },
  { label: "Campaigns", mark: "Pro" as const },
] as const;

/**
 * Same row anatomy as Follow-up results: avatar, title, context caption, category chip.
 * Titles are roles, not people. Captions are the product's own empty-state strings.
 */
const FOLLOW_UP_ROWS = [
  {
    title: "New registration",
    caption: "No outreach yet",
    category: "Due now",
  },
  {
    title: "Returning client",
    caption: "Next conversation not scheduled",
    category: "Opportunity",
  },
  {
    title: "Known client",
    caption: "No recorded outreach",
    category: "At risk",
  },
] as const;

const CONNECTED_STATES = [
  { label: "Activities", value: "Published", note: "Registration open" },
  { label: "Registration", value: "Public page", note: "QR code included" },
  { label: "Clients", value: "One profile", note: "History across activities" },
] as const;

export function MarketingHeroProductStack({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "marketing-product-lift relative mx-auto w-full max-w-[640px] lg:mx-0 lg:max-w-none",
        className
      )}
      aria-labelledby="cohestra-product-preview-caption"
    >
      <div className="overflow-hidden rounded-[24px] border border-border-warm bg-card shadow-[0_28px_60px_rgba(7,13,18,0.12)]">
        <div className="flex items-center justify-between gap-3 border-b border-border-warm px-4 py-3 sm:px-5">
          <p className="text-label text-text-accent">Product preview</p>
          <p className="text-xs text-text-muted-warm">Follow-up room</p>
        </div>

        <div className="grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <ul className="hidden border-r border-border-warm bg-muted/30 py-3 sm:block">
            {ROOMS.map((room) => {
              const current = room.mark === "current";
              return (
                <li key={room.label}>
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2 text-[0.8125rem]",
                      current
                        ? "border-l-2 border-lagoon bg-background font-semibold text-text-warm"
                        : "border-l-2 border-transparent text-text-muted-warm"
                    )}
                  >
                    <span className="truncate">{room.label}</span>
                    {room.mark && room.mark !== "current" ? (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem] font-medium text-text-warm uppercase">
                        {room.mark}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 px-4 py-4 sm:px-5 sm:py-5">
            <ul className="mb-4 flex flex-wrap gap-1.5 sm:hidden">
              {ROOMS.map((room) => (
                <li
                  key={room.label}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium",
                    room.mark === "current"
                      ? "border-lagoon bg-lagoon/10 text-text-warm"
                      : "border-border-warm text-text-muted-warm"
                  )}
                >
                  {room.label}
                  {room.mark && room.mark !== "current" ? ` · ${room.mark}` : ""}
                </li>
              ))}
            </ul>

            <p className="font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tracking-[-0.03em] text-text-warm">
              Follow-up
            </p>
            <div className="mt-3 flex min-w-0 flex-wrap gap-1.5" aria-hidden>
              {FOLLOW_UP_CATEGORY_OPTIONS.map((option) => {
                const selected = option.value === "due-now";
                return (
                  <span
                    key={option.value}
                    className={cn(
                      "inline-flex items-center rounded-xl border px-2.5 py-1.5 text-xs font-medium",
                      selected
                        ? "border-border-warm bg-background text-text-warm shadow-sm"
                        : "border-transparent bg-muted/40 text-text-muted-warm"
                    )}
                  >
                    {option.label}
                  </span>
                );
              })}
            </div>

            <ul className="mt-4 space-y-2">
              {FOLLOW_UP_ROWS.map((row) => (
                <li
                  key={row.category}
                  className="flex items-center gap-3 rounded-xl border border-border-warm bg-card/80 px-3 py-3"
                >
                  <PersonAvatar name={row.title} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text-warm">{row.title}</p>
                    <p className="truncate text-sm text-text-muted-warm">{row.caption}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-text-warm">
                    {row.category}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="grid border-t border-border-warm sm:grid-cols-3">
          {CONNECTED_STATES.map((state) => (
            <li
              key={state.label}
              className="border-b border-border-warm px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
            >
              <p className="text-label text-text-accent">{state.label}</p>
              <p className="mt-1 text-sm font-semibold text-text-warm">{state.value}</p>
              <p className="mt-0.5 text-xs text-text-muted-warm">{state.note}</p>
            </li>
          ))}
        </ul>
      </div>
      <figcaption
        id="cohestra-product-preview-caption"
        className="mt-3 max-w-[62ch] text-xs leading-relaxed text-text-muted-warm"
      >
        Product preview of the Follow-up room, using the same category chips and row layout as the
        workspace. Website shows the Core lock and Campaigns shows the Pro lock. Sample states, not
        a customer result.
      </figcaption>
    </figure>
  );
}
