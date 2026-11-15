"use client";

import type { ReactNode } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { FOLLOW_UP_CATEGORY_OPTIONS } from "@/lib/follow-up-category";
import { cn } from "@/lib/utils";

export const STAGE_CAPTION = "Sample state, not a customer result.";

const WORKSPACE_ROOMS = [
  "Dashboard",
  "Clients",
  "Activities",
  "Follow-up",
  "Analytics",
  "Website",
] as const;

type WorkspaceRoom = (typeof WORKSPACE_ROOMS)[number];

function WorkspaceRail({ highlight }: { highlight: WorkspaceRoom }) {
  return (
    <div className="hidden w-[9.5rem] shrink-0 border-r border-border-warm bg-paper-warm sm:flex sm:flex-col">
      <ul className="py-2">
        {WORKSPACE_ROOMS.map((room) => {
          const current = room === highlight;
          return (
            <li key={room}>
              <div
                className={cn(
                  "border-l-2 px-3 py-2 text-[0.8125rem]",
                  current
                    ? "border-lagoon bg-background font-semibold text-text-warm"
                    : "border-transparent text-text-muted-warm"
                )}
              >
                {room}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SecondaryCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <aside className="rounded-xl border border-border-warm bg-card p-3 shadow-md">
      {title ? <p className="text-label text-text-accent">{title}</p> : null}
      {children}
    </aside>
  );
}

function WorkspaceFrame({
  highlightRoom,
  headerTitle,
  badge,
  children,
  secondary,
}: {
  highlightRoom: WorkspaceRoom;
  headerTitle: string;
  badge?: string;
  children: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div
      aria-hidden
      className="flex h-[30rem] overflow-hidden rounded-xl border border-border-warm bg-card lg:h-[34rem]"
    >
      <WorkspaceRail highlight={highlightRoom} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-border-warm px-3 sm:px-4">
          <p className="truncate text-sm font-semibold text-text-warm">{headerTitle}</p>
          {badge ? (
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase text-text-warm">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="relative min-h-0 flex-1 overflow-hidden p-3 sm:p-4">
          {children}
          {secondary ? (
            <div className="absolute bottom-0 right-0 z-10 max-w-[13.5rem] translate-y-1 sm:max-w-[14.5rem]">
              {secondary}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RegistrationStage() {
  const fields = ["Name", "Email", "Phone"] as const;
  return (
    <WorkspaceFrame
      highlightRoom="Activities"
      headerTitle="Activity"
      secondary={
        <SecondaryCard title="Share kit">
          <p className="text-xs leading-relaxed text-text-muted-warm">
            This activity includes a QR code on the share kit.
          </p>
        </SecondaryCard>
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-label text-text-accent">Status</p>
        <span className="rounded-full border border-border-warm bg-background px-2.5 py-1 text-xs font-semibold text-text-warm">
          Published
        </span>
      </div>
      <p className="mt-3 text-sm font-medium text-text-warm">Public registration</p>
      <div className="mt-3 space-y-2">
        {fields.map((label) => (
          <div key={label}>
            <span className="text-xs font-medium text-text-muted-warm">{label}</span>
            <div className="mt-1 h-9 rounded-lg border border-border-warm bg-muted/20" />
          </div>
        ))}
      </div>
      <span className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg bg-lagoon/80 text-sm font-medium text-white">
        Register
      </span>
    </WorkspaceFrame>
  );
}

function ClientsStage() {
  const rows = [
    { role: "Returning client", meta: "History across activities" },
    { role: "New registration", meta: "Latest activity" },
    { role: "Returning client", meta: "History across activities" },
    { role: "New registration", meta: "Latest activity" },
  ] as const;
  return (
    <WorkspaceFrame
      highlightRoom="Clients"
      headerTitle="Clients"
      secondary={
        <SecondaryCard title="Profile">
          <div className="flex items-center gap-2">
            <PersonAvatar name="Returning client" size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-warm">Returning client</p>
              <p className="truncate text-xs text-text-muted-warm">History across activities</p>
            </div>
          </div>
        </SecondaryCard>
      }
    >
      <ul className="space-y-2">
        {rows.map((row, index) => (
          <li
            key={`${row.role}-${index}`}
            className="flex items-center gap-3 rounded-xl border border-border-warm px-3 py-2"
          >
            <PersonAvatar name={row.role} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-warm">{row.role}</p>
              <p className="truncate text-xs text-text-muted-warm">{row.meta}</p>
            </div>
          </li>
        ))}
      </ul>
    </WorkspaceFrame>
  );
}

function FollowUpStage() {
  return (
    <WorkspaceFrame
      highlightRoom="Follow-up"
      headerTitle="Follow-up"
      secondary={
        <SecondaryCard title="Profile note">
          <p className="text-xs leading-relaxed text-text-muted-warm">Note stays on the profile</p>
        </SecondaryCard>
      }
    >
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
      <ul className="mt-3 space-y-2">
        <li className="flex items-center gap-3 rounded-xl border border-border-warm px-3 py-2">
          <PersonAvatar name="New registration" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-warm">New registration</p>
            <p className="truncate text-xs text-text-muted-warm">No outreach yet</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-text-warm">
            Due now
          </span>
        </li>
        <li className="flex items-center gap-3 rounded-xl border border-border-warm bg-muted/20 px-3 py-2">
          <PersonAvatar name="Returning client" size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-warm">Returning client</p>
            <p className="truncate text-xs text-text-muted-warm">History across activities</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs font-medium text-text-warm">
            Opportunity
          </span>
        </li>
      </ul>
    </WorkspaceFrame>
  );
}

function WebsiteStudioStage() {
  return (
    <WorkspaceFrame
      highlightRoom="Website"
      headerTitle="Website Studio"
      badge="Core"
      secondary={
        <SecondaryCard title="Preview">
          <p className="mt-1 font-[family-name:var(--font-fraunces)] text-sm text-text-warm">
            Community activities
          </p>
        </SecondaryCard>
      }
    >
      <p className="text-xs font-medium text-text-muted-warm">Sections</p>
      <ul className="mt-2 space-y-2">
        {["Hero", "Contact"].map((section) => (
          <li
            key={section}
            className="rounded-lg border border-border-warm px-3 py-2 text-sm text-text-warm"
          >
            {section}
          </li>
        ))}
      </ul>
      <span className="mt-3 inline-flex rounded-lg border border-border-warm px-3 py-1.5 text-xs font-medium text-text-muted-warm">
        Publish
      </span>
    </WorkspaceFrame>
  );
}

function FormStudioStage() {
  const fields = ["Name", "Email", "Phone"];
  return (
    <WorkspaceFrame highlightRoom="Activities" headerTitle="Form Studio">
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
        <div>
          <p className="text-label text-text-accent">Preview</p>
          <div className="mt-2 space-y-2">
            {fields.map((field) => (
              <div
                key={field}
                className="h-9 rounded-lg border border-border-warm bg-background px-2 text-xs leading-9 text-text-muted-warm"
              >
                {field}
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function AnalyticsStage() {
  const filters = ["Date", "Activity", "Community"] as const;
  return (
    <WorkspaceFrame highlightRoom="Analytics" headerTitle="Registration report">
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
      <div className="mt-3 overflow-hidden rounded-xl border border-border-warm">
        <div className="grid grid-cols-2 border-b border-border-warm bg-muted/30 text-xs font-medium text-text-warm">
          <p className="px-3 py-2">Activity</p>
          <p className="px-3 py-2">Status</p>
        </div>
        <ul className="divide-y divide-border-warm text-xs text-text-muted-warm">
          <li className="grid grid-cols-2">
            <span className="px-3 py-2">Sample row</span>
            <span className="px-3 py-2">Sample row</span>
          </li>
          <li className="grid grid-cols-2 bg-muted/15">
            <span className="px-3 py-2">Sample row</span>
            <span className="px-3 py-2">Sample row</span>
          </li>
        </ul>
      </div>
      <span className="mt-3 inline-flex text-sm font-medium text-text-warm">CSV export</span>
    </WorkspaceFrame>
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
      <div className="relative p-3 sm:p-4">
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
