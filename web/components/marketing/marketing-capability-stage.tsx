"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Globe,
  LayoutDashboard,
  ListTodo,
  Lock,
  Megaphone,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

import { CohestraLogo } from "@/components/marketing/cohestra-logo";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { FOLLOW_UP_CATEGORY_OPTIONS } from "@/lib/follow-up-category";
import { cn } from "@/lib/utils";

export const STAGE_CAPTION = "Sample state, not a customer result.";

const NAV_ITEMS: { label: string; icon: LucideIcon }[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Clients", icon: Users },
  { label: "Activities", icon: CalendarDays },
  { label: "Follow-up", icon: ListTodo },
  { label: "Analytics", icon: BarChart3 },
  { label: "Cohestra AI", icon: Sparkles },
  { label: "Website", icon: Globe },
  { label: "Campaigns", icon: Megaphone },
];

function WorkspaceRail({ activeLabel }: { activeLabel: string }) {
  return (
    <div className="hidden w-52 shrink-0 flex-col border-r border-border-warm bg-card md:flex">
      <div className="border-b border-border-warm px-3 py-3">
        <div className="flex items-center gap-2.5">
          <CohestraLogo href={null} showWordmark={false} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-warm">Cohestra</p>
            <p className="truncate text-xs text-text-muted-warm">Community platform</p>
          </div>
        </div>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map(({ label, icon: Icon }) => {
            const active = label === activeLabel;
            const locked =
              label === "Campaigns" || (label === "Website" && activeLabel !== "Website");
            return (
              <li key={label}>
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                    active
                      ? "bg-primary/5 font-medium text-text-warm"
                      : "text-text-muted-warm"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {locked ? <Lock className="size-3.5 shrink-0" aria-hidden /> : null}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function WorkspaceShell({
  activeLabel,
  title,
  badge,
  headerEnd,
  children,
}: {
  activeLabel: string;
  title: string;
  badge?: string;
  headerEnd?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className="flex h-auto overflow-hidden rounded-2xl border border-border-warm bg-card shadow-[0_24px_60px_rgba(7,13,18,0.14)] lg:h-[34rem]"
    >
      <WorkspaceRail activeLabel={activeLabel} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border-warm px-4">
          <p className="truncate text-sm font-semibold text-text-warm">{title}</p>
          <div className="flex shrink-0 items-center gap-2">
            {badge ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase text-text-warm">
                {badge}
              </span>
            ) : null}
            {headerEnd}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyField({ label }: { label: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-text-warm">{label}</span>
      <input
        readOnly
        aria-hidden
        tabIndex={-1}
        className="mt-1.5 h-11 w-full rounded-lg border border-border-warm bg-background px-3 text-sm text-text-muted-warm"
      />
    </label>
  );
}

function RegistrationStage() {
  const fields = ["Name", "Email", "Phone"] as const;
  return (
    <WorkspaceShell
      activeLabel="Activities"
      title="Published activity"
      badge="Published"
    >
      <div className="relative min-h-0 md:min-h-[20rem]">
        <div className="space-y-4 md:pr-[52%]">
          <p className="text-sm text-text-muted-warm">Public page</p>
          <div>
            <p className="text-sm font-medium text-text-warm">Share kit</p>
            <div className="mt-3 rounded-lg border border-border-warm bg-background p-3">
              <p className="text-xs font-medium text-text-warm">QR code</p>
              <p className="mt-1 text-xs text-text-muted-warm">QR preview unavailable</p>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border-warm bg-card p-4 shadow-xl md:absolute md:bottom-4 md:right-4 md:top-8 md:mt-0 md:w-[48%]">
          <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-text-warm">
            Register
          </p>
          <div className="mt-4 space-y-3">
            {fields.map((field) => (
              <EmptyField key={field} label={field} />
            ))}
            <span className="mt-2 flex h-11 w-full items-center justify-center rounded-lg bg-lagoon text-sm font-medium text-white">
              Register
            </span>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}


function ClientsStage() {
  const rows = [
    { role: "Returning client", meta: "History across activities", selected: true },
    { role: "New registration", meta: "Latest activity", selected: false },
    { role: "Guest", meta: "Earlier activity", selected: false },
  ] as const;
  return (
    <WorkspaceShell activeLabel="Clients" title="Clients">
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_13.5rem]">
        <div className="overflow-hidden rounded-xl border border-border-warm">
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] border-b border-border-warm bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            <span>Client</span>
            <span>History</span>
          </div>
          <ul>
            {rows.map((row) => (
              <li
                key={row.role}
                className={cn(
                  "grid h-12 grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-center gap-2 border-b border-border-warm px-3 text-sm last:border-b-0",
                  row.selected && "border-l-2 border-l-lagoon bg-primary/5"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={row.role} size="sm" />
                  <span className="truncate font-medium text-text-warm">{row.role}</span>
                </span>
                <span className="truncate text-text-muted-warm">{row.meta}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="flex h-full flex-col rounded-xl border border-border-warm bg-muted/15 p-3">
          <p className="text-label text-text-accent">Profile</p>
          <p className="mt-3 text-sm font-medium text-text-warm">Returning client</p>
          <p className="mt-1 text-xs text-text-muted-warm">History across activities</p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Registration history
          </p>
          <ul className="mt-2 space-y-2 text-sm text-text-warm">
            <li className="rounded-lg border border-border-warm bg-background px-2.5 py-2">Latest activity</li>
            <li className="rounded-lg border border-border-warm bg-background px-2.5 py-2">Earlier activity</li>
          </ul>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function FollowUpStage() {
  const rows = [
    { role: "New registration", meta: "No outreach yet", category: "Due now" },
    { role: "Returning client", meta: "History across activities", category: "At risk" },
    { role: "Guest", meta: "Earlier activity", category: "Opportunity" },
    { role: "New registration", meta: "Latest activity", category: "Healthy" },
  ] as const;
  return (
    <WorkspaceShell activeLabel="Follow-up" title="Follow-up">
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_11.5rem]">
        <div className="min-h-0">
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
          <ul className="mt-3 space-y-1">
            {rows.map((row) => (
              <li
                key={row.category}
                className="flex h-12 items-center gap-2 rounded-lg border border-border-warm px-2.5 text-sm"
              >
                <PersonAvatar name={row.role} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-warm">{row.role}</span>
                  <span className="block truncate text-xs text-text-muted-warm">{row.meta}</span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-text-warm">
                  {row.category}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="flex h-full flex-col rounded-xl border border-border-warm bg-muted/15 p-3">
          <p className="text-label text-text-accent">Profile note</p>
          <p className="mt-3 text-sm leading-relaxed text-text-warm">Note stays on the profile</p>
          <p className="mt-3 text-xs leading-relaxed text-text-muted-warm">
            WhatsApp and Viber open from the profile. The note stays on the timeline.
          </p>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function WebsiteStudioStage() {
  return (
    <WorkspaceShell activeLabel="Website" title="Website Studio" badge="Core">
      <div className="grid h-full gap-4 md:grid-cols-2">
        <div className="flex h-full flex-col">
          <div className="flex gap-2 text-xs font-medium">
            <span className="rounded-full bg-ink px-2.5 py-1 text-white">Sections</span>
            <span className="rounded-full px-2.5 py-1 text-text-muted-warm">Design</span>
            <span className="rounded-full px-2.5 py-1 text-text-muted-warm">Templates</span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">Sections</p>
          <ul className="mt-2 space-y-2">
            {["Hero", "Contact"].map((section) => (
              <li
                key={section}
                className="flex items-center justify-between rounded-lg border border-border-warm px-3 py-2 text-sm text-text-warm"
              >
                <span>{section}</span>
                <span className="text-xs text-text-muted-warm">Visible</span>
              </li>
            ))}
          </ul>
          <span className="mt-4 inline-flex rounded-lg border border-border-warm px-3 py-1.5 text-xs font-medium text-text-muted-warm">
            Publish
          </span>
        </div>
        <div className="flex min-h-[14rem] flex-col rounded-xl border border-border-warm bg-muted/20 p-4 md:min-h-0">
          <p className="text-label text-text-accent">Preview</p>
          <div className="mt-auto flex flex-1 flex-col justify-center rounded-lg border border-border-warm bg-background p-4">
            <p className="font-[family-name:var(--font-fraunces)] text-2xl font-medium tracking-tight text-text-warm">
              Community activities
            </p>
            <span className="mt-4 inline-flex w-fit rounded-full bg-lagoon px-4 py-2 text-sm font-medium text-white">
              Browse activities
            </span>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function FormStudioStage() {
  const fields = ["Name", "Email", "Phone"];
  return (
    <WorkspaceShell activeLabel="Activities" title="Form Studio">
      <div className="grid h-full gap-4 md:grid-cols-2">
        <ul className="space-y-2">
          {fields.map((field) => (
            <li
              key={field}
              className="flex h-12 items-center rounded-xl border border-border-warm px-3 text-sm font-medium text-text-warm"
            >
              {field}
            </li>
          ))}
        </ul>
        <div className="flex h-full flex-col rounded-xl border border-border-warm bg-muted/15 p-4">
          <p className="text-label text-text-accent">Preview</p>
          <div className="mt-3 space-y-3">
            {fields.map((field) => (
              <EmptyField key={field} label={field} />
            ))}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function AnalyticsStage() {
  const filters = ["Date", "Activity", "Community"] as const;
  return (
    <WorkspaceShell
      activeLabel="Analytics"
      title="Registration report"
      headerEnd={
        <span className="text-xs font-medium text-text-warm">CSV export</span>
      }
    >
      <div className="flex h-full flex-col">
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
        <div className="mt-3 flex-1 overflow-hidden rounded-xl border border-border-warm">
          <div className="grid grid-cols-2 border-b border-border-warm bg-muted/30 text-xs font-semibold text-text-warm">
            <p className="px-3 py-2">Activity</p>
            <p className="px-3 py-2">Status</p>
          </div>
          <ul className="divide-y divide-border-warm text-xs text-text-muted-warm">
            {Array.from({ length: 8 }).map((_, index) => (
              <li key={index} className="grid h-10 grid-cols-2 items-center">
                <span className="px-3">Sample row</span>
                <span className="px-3">Sample row</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs text-text-muted-warm">
          Core adds filters. Pro adds campaign analytics.
        </p>
      </div>
    </WorkspaceShell>
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
    <figure className={cn("min-w-0", className)}>
      <div className="relative lg:h-[34rem]">
        {chapterIds.map((id) => {
          const isActive = id === activeId;
          return (
            <div
              key={id}
              className={cn(
                "motion-reduce:transition-none transition-opacity duration-200 ease-out",
                isActive
                  ? "relative opacity-100"
                  : "pointer-events-none absolute inset-0 opacity-0"
              )}
            >
              <StageScene chapterId={id} />
            </div>
          );
        })}
      </div>
      <figcaption className="mt-3 text-xs leading-relaxed text-text-muted-warm">
        {STAGE_CAPTION}
      </figcaption>
    </figure>
  );
}
