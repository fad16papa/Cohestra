"use client";

import type { ReactNode } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { FOLLOW_UP_CATEGORY_OPTIONS } from "@/lib/follow-up-category";
import { cn } from "@/lib/utils";

export const STAGE_CAPTION = "Sample state, not a customer result.";

function WindowChrome({
  title,
  badge,
  children,
  className,
}: {
  title: string;
  badge?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border-warm bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border-warm px-3 py-2.5">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-border-warm" />
          <span className="size-2 rounded-full bg-border-warm" />
          <span className="size-2 rounded-full bg-border-warm" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-medium text-text-warm">{title}</p>
        {badge ? (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase text-text-warm">
            {badge}
          </span>
        ) : null}
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function RegistrationStage() {
  const fields = ["Name", "Email", "Phone"] as const;
  return (
    <div className="relative min-h-[22rem] lg:min-h-[36rem]" aria-hidden>
      <WindowChrome title="Activity admin" className="min-h-[18rem]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-warm pb-3">
          <p className="text-label text-text-accent">Activity</p>
          <span className="rounded-full border border-border-warm bg-background px-2.5 py-1 text-xs font-semibold text-text-warm">
            Published
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-text-warm">Public registration</p>
        <div className="mt-4 space-y-2.5">
          {fields.map((label) => (
            <div key={label}>
              <span className="text-xs font-medium text-text-muted-warm">{label}</span>
              <div className="mt-1 h-9 rounded-lg border border-border-warm bg-muted/20" />
            </div>
          ))}
        </div>
        <div className="mt-6 h-9 rounded-lg bg-lagoon/80 text-center text-sm font-medium leading-9 text-white">
          Register
        </div>
      </WindowChrome>
      <WindowChrome
        title="Share kit"
        className="absolute bottom-3 right-3 z-10 w-[min(100%,14rem)] shadow-md sm:bottom-5 sm:right-5"
      >
        <p className="text-xs leading-relaxed text-text-muted-warm">
          This activity includes a QR code on the share kit for the public registration page.
        </p>
      </WindowChrome>
    </div>
  );
}

function ClientsStage() {
  return (
    <div className="relative min-h-[22rem] lg:min-h-[36rem]" aria-hidden>
      <WindowChrome title="Clients" className="min-h-[18rem]">
        <ul className="space-y-2">
          {[
            { role: "Returning client", meta: "History across activities" },
            { role: "New registration", meta: "Latest activity" },
          ].map((row) => (
            <li
              key={row.role}
              className="flex items-center gap-3 rounded-xl border border-border-warm px-3 py-2.5"
            >
              <PersonAvatar name={row.role} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-warm">{row.role}</p>
                <p className="truncate text-xs text-text-muted-warm">{row.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      </WindowChrome>
      <WindowChrome
        title="Profile"
        className="absolute bottom-3 right-3 z-10 w-[min(100%,13rem)] shadow-md sm:bottom-5 sm:right-5"
      >
        <div className="flex items-center gap-2">
          <PersonAvatar name="Returning client" size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-text-warm">Returning client</p>
            <p className="truncate text-xs text-text-muted-warm">History across activities</p>
          </div>
        </div>
      </WindowChrome>
    </div>
  );
}

function FollowUpStage() {
  return (
    <div className="relative min-h-[22rem] lg:min-h-[36rem]" aria-hidden>
      <WindowChrome title="Follow-up" className="min-h-[18rem]">
        <div className="flex flex-wrap gap-1.5">
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
        <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-warm px-3 py-3">
          <PersonAvatar name="New registration" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-text-warm">New registration</p>
            <p className="truncate text-sm text-text-muted-warm">No outreach yet</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-text-warm">
            Due now
          </span>
        </div>
      </WindowChrome>
    </div>
  );
}

function WebsiteStudioStage() {
  return (
    <div className="relative min-h-[22rem] lg:min-h-[36rem]" aria-hidden>
      <WindowChrome title="Website Studio" badge="Core" className="min-h-[18rem]">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="text-xs font-medium text-text-muted-warm">Sections</p>
            <ul className="mt-2 space-y-1.5 text-sm text-text-warm">
              {["Hero", "Activity list", "Footer"].map((section) => (
                <li key={section} className="rounded-lg border border-border-warm px-2.5 py-2">
                  {section}
                </li>
              ))}
            </ul>
            <span className="mt-3 inline-flex rounded-lg border border-border-warm px-3 py-1.5 text-xs font-medium text-text-muted-warm">
              Publish
            </span>
          </div>
          <div className="rounded-lg border border-dashed border-border-warm bg-muted/20 p-3">
            <p className="text-label text-text-accent">Preview</p>
            <p className="mt-2 font-[family-name:var(--font-fraunces)] text-base text-text-warm">
              Community activities
            </p>
          </div>
        </div>
      </WindowChrome>
    </div>
  );
}

function FormStudioStage() {
  const fields = ["Name", "Email", "Phone"];
  return (
    <div className="relative min-h-[22rem] lg:min-h-[36rem]" aria-hidden>
      <WindowChrome title="Form Studio" className="min-h-[18rem]">
        <div className="grid gap-3 sm:grid-cols-2">
          <ul className="space-y-2">
            {fields.map((field) => (
              <li
                key={field}
                className="rounded-xl border border-border-warm px-3 py-2 text-sm text-text-warm"
              >
                {field}
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-dashed border-border-warm bg-muted/20 p-3">
            <p className="text-label text-text-accent">Preview</p>
            <div className="mt-2 space-y-2">
              {fields.map((field) => (
                <div
                  key={field}
                  className="h-8 rounded border border-border-warm bg-background px-2 text-xs leading-8 text-text-muted-warm"
                >
                  {field}
                </div>
              ))}
            </div>
          </div>
        </div>
      </WindowChrome>
    </div>
  );
}

function AnalyticsStage() {
  const filters = ["Date", "Activity", "Community"] as const;
  return (
    <div className="relative min-h-[22rem] lg:min-h-[36rem]" aria-hidden>
      <WindowChrome title="Registration report" className="min-h-[18rem]">
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <span
              key={filter}
              className="rounded-lg border border-border-warm px-2.5 py-1.5 text-xs font-medium text-text-warm"
            >
              {filter}
            </span>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 w-full max-w-[12rem] rounded bg-muted" />
          <div className="h-3 w-full max-w-[16rem] rounded bg-muted/70" />
          <div className="h-3 w-full max-w-[10rem] rounded bg-muted/50" />
        </div>
        <p className="mt-4 text-sm font-medium text-text-warm">CSV export</p>
      </WindowChrome>
      <WindowChrome
        title="Export"
        className="absolute bottom-3 right-3 z-10 w-[min(100%,11rem)] shadow-md sm:bottom-5 sm:right-5"
      >
        <p className="text-xs text-text-muted-warm">CSV export</p>
      </WindowChrome>
    </div>
  );
}

const STAGE_BY_ID: Record<string, () => ReactNode> = {
  registration: RegistrationStage,
  clients: ClientsStage,
  "follow-up": FollowUpStage,
  "website-studio": WebsiteStudioStage,
  "form-studio": FormStudioStage,
  analytics: AnalyticsStage,
};

function StageScene({ chapterId }: { chapterId: string }) {
  const Scene = STAGE_BY_ID[chapterId];
  if (!Scene) {
    return null;
  }
  return <Scene />;
}

export function MarketingCapabilityStage({
  activeId,
  chapterIds,
  className,
}: {
  activeId: string;
  chapterIds: string[];
  className?: string;
}) {
  return (
    <figure
      className={cn(
        "relative overflow-hidden rounded-[16px] border border-border-warm bg-card shadow-[0_20px_48px_rgba(7,13,18,0.1)]",
        className
      )}
    >
      <div className="border-b border-border-warm px-4 py-3">
        <p className="text-label text-text-accent">Product preview</p>
      </div>
      <div className="relative p-4 sm:p-5">
        {chapterIds.map((id) => {
          const isActive = id === activeId;
          return (
            <div
              key={id}
              hidden={!isActive}
              className={cn(
                "motion-reduce:transition-none transition-opacity duration-200",
                isActive ? "opacity-100" : "pointer-events-none"
              )}
            >
              <StageScene chapterId={id} />
            </div>
          );
        })}
      </div>
      <figcaption className="border-t border-border-warm px-4 py-3 text-xs leading-relaxed text-text-muted-warm">
        {STAGE_CAPTION}
      </figcaption>
    </figure>
  );
}
