"use client";

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

const FOLLOW_UP_ROWS = [
  {
    category: "Due now",
    detail: "New registration on a published activity",
  },
  {
    category: "Opportunity",
    detail: "Returned on a later activity",
  },
  {
    category: "At risk",
    detail: "Known client with no recent registration",
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
      <div
        aria-hidden
        className="overflow-hidden rounded-[24px] border border-line bg-paper shadow-[0_28px_60px_rgba(7,13,18,0.12)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <p className="text-label text-text-accent">Product preview</p>
          <p className="text-xs text-muted-foreground">Sample workspace states</p>
        </div>

        <div className="grid sm:grid-cols-[9.5rem_minmax(0,1fr)]">
          <ul className="hidden border-r border-line bg-paper-warm py-3 sm:block">
            {ROOMS.map((room) => {
              const current = room.mark === "current";
              return (
                <li key={room.label}>
                  <div
                    className={cn(
                      "flex items-center justify-between gap-2 px-3 py-2 text-[0.8125rem]",
                      current
                        ? "border-l-2 border-lagoon bg-paper font-semibold text-ink"
                        : "border-l-2 border-transparent text-muted-foreground"
                    )}
                  >
                    <span className="truncate">{room.label}</span>
                    {room.mark && room.mark !== "current" ? (
                      <span className="shrink-0 rounded-sm bg-paper px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide text-text-accent uppercase">
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
                      ? "border-lagoon bg-lagoon/10 text-ink"
                      : "border-line text-muted-foreground"
                  )}
                >
                  {room.label}
                  {room.mark && room.mark !== "current" ? ` · ${room.mark}` : ""}
                </li>
              ))}
            </ul>

            <p className="font-[family-name:var(--font-fraunces)] text-[1.35rem] font-medium tracking-[-0.03em] text-ink">
              Follow-up
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Categories in the room, not a separate pipeline.
            </p>

            <ul className="mt-4 divide-y divide-line border-y border-line">
              {FOLLOW_UP_ROWS.map((row) => (
                <li key={row.category} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{row.category}</p>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{row.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-sm bg-lagoon/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-lagoon uppercase">
                    Open
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ul className="grid border-t border-line sm:grid-cols-3">
          {CONNECTED_STATES.map((state) => (
            <li
              key={state.label}
              className="border-b border-line px-4 py-3 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0"
            >
              <p className="text-label text-text-accent">{state.label}</p>
              <p className="mt-1 text-sm font-semibold text-ink">{state.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{state.note}</p>
            </li>
          ))}
        </ul>
      </div>
      <figcaption
        id="cohestra-product-preview-caption"
        className="mt-3 max-w-[62ch] text-xs leading-relaxed text-muted-foreground"
      >
        Product preview of Follow-up, a published activity, and public registration. Website shows
        the Core lock and Campaigns shows the Pro lock. Sample states, not a customer result.
      </figcaption>
    </figure>
  );
}
