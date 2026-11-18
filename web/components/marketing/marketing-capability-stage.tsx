"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Code2,
  Download,
  Globe,
  LayoutDashboard,
  Link2,
  ListTodo,
  Lock,
  Mail,
  Megaphone,
  MessageCircle,
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
      className="flex h-auto overflow-hidden rounded-2xl border border-border-warm bg-card shadow-[0_24px_60px_rgba(7,13,18,0.14)] md:h-[34rem]"
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

function EmptyField({
  label,
  placeholder,
}: {
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-text-warm">{label}</span>
      <input
        readOnly
        aria-hidden
        tabIndex={-1}
        placeholder={placeholder}
        className="mt-1.5 h-11 w-full rounded-lg border border-border-warm bg-background px-3 text-sm text-text-muted-warm placeholder:text-text-muted-warm/70"
      />
    </label>
  );
}

const QR_SAMPLE_PATTERN: readonly (readonly number[])[] = [
  [1, 1, 1, 0, 1, 1, 1],
  [1, 0, 1, 0, 1, 0, 1],
  [1, 1, 1, 0, 1, 1, 1],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 1, 0, 0, 0, 1, 1],
  [1, 1, 1, 0, 1, 1, 1],
] as const;

function QrSampleGrid() {
  return (
    <div
      aria-hidden
      className="grid w-[5.5rem] grid-cols-7 gap-px rounded-md border border-border-warm bg-border-warm p-1"
    >
      {QR_SAMPLE_PATTERN.flatMap((row, rowIndex) =>
        row.map((cell, colIndex) => (
          <span
            key={`${rowIndex}-${colIndex}`}
            className={cn(
              "aspect-square rounded-[1px]",
              cell ? "bg-ink" : "bg-background"
            )}
          />
        ))
      )}
    </div>
  );
}

function ShareKitAction({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-warm bg-background px-2.5 text-xs font-medium text-text-warm">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

function RegistrationStage() {
  const fields = ["Name", "Email", "Phone"] as const;
  return (
    <WorkspaceShell
      activeLabel="Activities"
      title="Spring community signup"
      badge="Published"
    >
      <div className="relative min-h-0">
        <div className="space-y-3 md:pr-[48%]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-warm pb-3">
            <p className="text-sm font-semibold text-text-warm">Activity admin</p>
            <span className="text-xs text-text-muted-warm">Published</span>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
              Share kit
            </p>
            <div className="space-y-2">
              <span className="text-sm font-medium text-text-warm">Registration link</span>
              <input
                readOnly
                aria-hidden
                tabIndex={-1}
                value="https://sample.cohestra.app/register/spring-signup"
                className="h-10 w-full truncate rounded-lg border border-border-warm bg-muted/20 px-3 font-mono text-[0.6875rem] text-text-muted-warm"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <ShareKitAction icon={Link2} label="Copy link" />
              <ShareKitAction icon={MessageCircle} label="Copy WhatsApp" />
              <ShareKitAction icon={Download} label="QR PNG" />
              <ShareKitAction icon={Download} label="Share pack" />
            </div>
            <div className="flex w-fit flex-col gap-2 rounded-xl border border-border-warm bg-background p-3">
              <p className="text-sm font-medium text-text-warm">QR code</p>
              <QrSampleGrid />
            </div>
            <p className="text-xs text-text-muted-warm">Website embed</p>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-warm px-2.5 py-1.5 text-xs font-medium text-text-muted-warm">
              <Code2 className="size-3.5" aria-hidden />
              Copy embed bundle
            </span>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border-warm bg-card p-4 shadow-xl md:absolute md:right-0 md:top-0 md:mt-0 md:w-[46%]">
          <p className="font-[family-name:var(--font-fraunces)] text-lg font-medium text-text-warm">
            Register
          </p>
          <p className="mt-1 text-xs text-text-muted-warm">Public registration page</p>
          <ul className="mt-4 space-y-3">
            {fields.map((field) => (
              <li key={field}>
                <EmptyField label={field} placeholder={`Your ${field.toLowerCase()}`} />
              </li>
            ))}
            <li className="flex gap-2 rounded-lg border border-border-warm bg-muted/15 px-3 py-2.5 text-xs leading-relaxed text-text-muted-warm">
              <span
                aria-hidden
                className="mt-0.5 size-4 shrink-0 rounded border border-border-warm bg-background"
              />
              <span>I agree to be contacted about this activity.</span>
            </li>
          </ul>
          <span className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-lagoon text-sm font-medium text-white">
            Register
          </span>
        </div>
      </div>
    </WorkspaceShell>
  );
}


function ClientsStage() {
  const rows = [
    {
      role: "Returning client",
      status: "Active",
      lastActivity: "Latest activity",
      registered: "Sample date",
      selected: true,
    },
    {
      role: "New registration",
      status: "New",
      lastActivity: "Latest activity",
      registered: "Sample date",
      selected: false,
    },
    {
      role: "Guest",
      status: "Contacted",
      lastActivity: "Earlier activity",
      registered: "Sample date",
      selected: false,
    },
    {
      role: "New registration",
      status: "New",
      lastActivity: "Earlier activity",
      registered: "Sample date",
      selected: false,
    },
  ] as const;
  return (
    <WorkspaceShell activeLabel="Clients" title="Clients">
      <div className="flex h-full min-h-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            readOnly
            aria-hidden
            tabIndex={-1}
            placeholder="Search clients"
            className="h-9 w-full max-w-xs rounded-lg border border-border-warm bg-background px-3 text-sm text-text-muted-warm sm:w-56"
          />
          <span className="rounded-lg border border-border-warm px-2.5 py-1.5 text-xs font-medium text-text-warm">
            Export CSV
          </span>
        </div>
        <div className="overflow-hidden rounded-xl border border-border-warm">
          <div className="grid grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)] border-b border-border-warm bg-muted/30 px-3 py-2 text-[0.625rem] font-semibold uppercase tracking-wide text-text-muted-warm">
            <span>Contact</span>
            <span>Status</span>
            <span>Last registration</span>
          </div>
          <ul>
            {rows.map((row, index) => (
              <li
                key={`${row.role}-${index}`}
                className={cn(
                  "grid h-11 grid-cols-[minmax(0,1.4fr)_5.5rem_minmax(0,1fr)] items-center gap-2 border-b border-border-warm px-3 text-sm last:border-b-0",
                  row.selected && "border-l-2 border-l-lagoon bg-primary/5"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PersonAvatar name={row.role} size="sm" />
                  <span className="min-w-0 truncate font-medium text-text-warm">{row.role}</span>
                </span>
                <span className="truncate text-xs text-text-warm">{row.status}</span>
                <span className="truncate text-xs text-text-muted-warm">{row.lastActivity}</span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-xl border border-border-warm bg-muted/15 p-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <PersonAvatar name="Returning client" size="sm" />
              <div className="min-w-0">
                <p className="text-label text-text-accent">Profile</p>
                <p className="truncate text-sm font-medium text-text-warm">Returning client</p>
              </div>
            </div>
            <dl className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <div>
                <dt className="text-text-muted-warm">Lead status</dt>
                <dd className="font-medium text-text-warm">Active</dd>
              </div>
              <div>
                <dt className="text-text-muted-warm">Last outreach</dt>
                <dd className="text-text-warm">Never</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Registration history
          </p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-3">
            <li className="rounded-lg border border-border-warm bg-background px-2.5 py-2">
              <p className="text-sm font-medium text-text-warm">Latest activity</p>
              <p className="mt-0.5 text-xs text-text-muted-warm">Registered · sample timeline</p>
            </li>
            <li className="rounded-lg border border-border-warm bg-background px-2.5 py-2">
              <p className="text-sm font-medium text-text-warm">Earlier activity</p>
              <p className="mt-0.5 text-xs text-text-muted-warm">Registered · sample timeline</p>
            </li>
            <li className="rounded-lg border border-border-warm bg-background px-2.5 py-2">
              <p className="text-sm font-medium text-text-warm">Community open day</p>
              <p className="mt-0.5 text-xs text-text-muted-warm">Registered · sample timeline</p>
            </li>
          </ul>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function FollowUpStage() {
  const categoryCounts: Record<string, number> = {
    "due-now": 2,
    "at-risk": 1,
    opportunity: 1,
    healthy: 2,
  };
  const rows = [
    { id: "a", role: "New registration", meta: "No outreach yet", category: "Due now" },
    { id: "b", role: "Returning client", meta: "No recorded outreach", category: "At risk" },
    { id: "c", role: "Guest", meta: "Earlier activity", category: "Opportunity" },
    { id: "d", role: "New registration", meta: "Latest activity", category: "Healthy" },
    { id: "e", role: "Guest", meta: "No outreach yet", category: "Due now" },
    { id: "f", role: "Returning client", meta: "Latest activity", category: "Healthy" },
  ] as const;
  return (
    <WorkspaceShell activeLabel="Follow-up" title="Follow-up">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_12.5rem]">
        <div className="flex min-h-0 flex-col">
          <div className="flex min-w-0 flex-wrap gap-2">
            {FOLLOW_UP_CATEGORY_OPTIONS.map((option) => {
              const selected = option.value === "due-now";
              const count = categoryCounts[option.value] ?? 0;
              return (
                <span
                  key={option.value}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium",
                    selected
                      ? "border-border-warm bg-background text-text-warm shadow-sm"
                      : "border-transparent bg-muted/40 text-text-muted-warm"
                  )}
                >
                  <span>{option.label}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs tabular-nums",
                      selected ? "bg-muted text-text-warm" : "bg-background/80 text-text-muted-warm"
                    )}
                  >
                    {count}
                  </span>
                </span>
              );
            })}
          </div>
          <ul className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-auto">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-border-warm bg-card/80 px-3 py-2 text-sm"
              >
                <PersonAvatar name={row.role} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-warm">{row.role}</span>
                  <span className="block truncate text-xs text-text-muted-warm">{row.meta}</span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-text-warm">
                  {row.category}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <aside className="flex min-h-0 flex-col rounded-xl border border-border-warm bg-muted/15 p-3">
          <p className="text-label text-text-accent">Profile note</p>
          <div className="mt-3 flex items-center gap-2">
            <PersonAvatar name="New registration" size="sm" />
            <p className="text-sm font-medium text-text-warm">New registration</p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-text-warm">Note stays on the profile</p>
          <div className="mt-3 rounded-lg border border-border-warm bg-background px-2.5 py-2 text-xs leading-relaxed text-text-muted-warm">
            Follow-up context stays on the client timeline — not in the outreach channel.
          </div>
          <p className="mt-3 text-xs leading-relaxed text-text-muted-warm">
            WhatsApp and Viber open from the profile. The note stays on the timeline.
          </p>
          <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
            <span className="rounded-lg border border-border-warm bg-background px-2 py-1 text-[0.6875rem] font-medium text-text-warm">
              WhatsApp
            </span>
            <span className="rounded-lg border border-border-warm bg-background px-2 py-1 text-[0.6875rem] font-medium text-text-warm">
              Viber
            </span>
          </div>
        </aside>
      </div>
    </WorkspaceShell>
  );
}

function WebsiteStudioStage() {
  const sections = [
    { name: "Hero", type: "hero", visible: true },
    { name: "Contact", type: "contact", visible: true },
  ] as const;
  return (
    <WorkspaceShell activeLabel="Website" title="Website Studio" badge="Core">
      <div className="grid h-full min-h-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <div className="flex min-h-0 flex-col">
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full border border-border-warm px-2.5 py-1 text-text-muted-warm">
              Design
            </span>
            <span className="rounded-full bg-ink px-2.5 py-1 text-white">Sections</span>
            <span className="rounded-full border border-border-warm px-2.5 py-1 text-text-muted-warm">
              Templates
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Section list
          </p>
          <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
            {sections.map((section, index) => (
              <li
                key={section.name}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg border border-border-warm px-3 py-2.5 text-sm",
                  index === 0 && "border-lagoon/40 bg-primary/5"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {section.type === "hero" ? (
                    <Sparkles className="size-4 shrink-0 text-lagoon" aria-hidden />
                  ) : (
                    <Mail className="size-4 shrink-0 text-lagoon" aria-hidden />
                  )}
                  <span className="font-medium text-text-warm">{section.name}</span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.625rem] font-medium uppercase text-text-muted-warm">
                  {section.visible ? "Visible" : "Hidden"}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border-warm pt-3">
            <span className="inline-flex rounded-lg border border-border-warm px-3 py-1.5 text-xs font-medium text-text-muted-warm">
              Save draft
            </span>
            <span className="inline-flex rounded-lg border border-border-warm px-3 py-1.5 text-xs font-medium text-text-muted-warm">
              Share preview
            </span>
            <span className="inline-flex rounded-lg bg-lagoon px-3 py-1.5 text-xs font-semibold text-white">
              Publish
            </span>
          </div>
        </div>
        <div className="flex min-h-0 flex-col rounded-xl border border-border-warm bg-muted/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-label text-text-accent">Preview</p>
            <span className="text-[0.625rem] font-medium uppercase text-text-muted-warm">Sample</span>
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-hidden rounded-lg border border-border-warm bg-background">
            <p className="border-b border-border-warm px-4 py-2 text-[0.625rem] text-text-muted-warm">
              your-community.cohestra.app
            </p>
            <div className="space-y-4 p-4">
              <div className="rounded-lg bg-muted/30 px-4 py-6">
                <p className="font-[family-name:var(--font-fraunces)] text-xl font-medium tracking-tight text-text-warm">
                  Community activities
                </p>
                <p className="mt-2 text-xs text-text-muted-warm">
                  Discover programs, register, and stay connected.
                </p>
                <span className="mt-4 inline-flex rounded-full bg-lagoon px-4 py-2 text-sm font-medium text-white">
                  Browse activities
                </span>
              </div>
              <div className="rounded-lg border border-border-warm px-3 py-3">
                <p className="text-xs font-semibold uppercase text-text-muted-warm">Contact</p>
                <p className="mt-1 text-sm text-text-warm">Questions about registration</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function FormStudioStage() {
  const fields = [
    { label: "Name", type: "Text", required: true },
    { label: "Email", type: "Email", required: true },
    { label: "Phone", type: "Phone", required: true },
    { label: "Consent", type: "Consent", required: true },
  ] as const;
  return (
    <WorkspaceShell activeLabel="Activities" title="Form Studio">
      <div className="grid h-full min-h-0 gap-4 md:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Field order
          </p>
          <ul className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto">
            {fields.map((field, index) => (
              <li
                key={field.label}
                className={cn(
                  "rounded-xl border border-border-warm px-3 py-2.5",
                  index === 0 && "border-lagoon/40 bg-primary/5"
                )}
              >
                <p className="text-sm font-medium text-text-warm">
                  {index + 1}. {field.label}
                </p>
                <p className="mt-0.5 text-xs text-text-muted-warm">
                  {field.type}
                  {field.required ? " · Required" : ""}
                </p>
              </li>
            ))}
          </ul>
          <span className="mt-3 inline-flex w-fit rounded-lg border border-border-warm px-3 py-1.5 text-xs font-medium text-text-muted-warm">
            Add field
          </span>
        </div>
        <div className="flex min-h-0 flex-col rounded-xl border border-border-warm bg-muted/15 p-4">
          <p className="text-label text-text-accent">Live preview</p>
          <p className="mt-1 text-xs text-text-muted-warm">Registration form sample</p>
          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-auto">
            {fields.slice(0, 3).map((field) => (
              <EmptyField key={field.label} label={field.label} />
            ))}
            <div className="flex gap-2 rounded-lg border border-border-warm bg-background px-3 py-2.5 text-xs leading-relaxed text-text-muted-warm">
              <span
                aria-hidden
                className="mt-0.5 size-4 shrink-0 rounded border border-border-warm"
              />
              <span>I agree to be contacted about this activity.</span>
            </div>
            <span className="flex h-10 w-full items-center justify-center rounded-lg bg-lagoon text-sm font-medium text-white">
              Register
            </span>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

function AnalyticsStage() {
  const filters = [
    { label: "Date preset", value: "This week" },
    { label: "Activity", value: "All activities" },
    { label: "Community", value: "All communities" },
  ] as const;
  const metrics = [
    { label: "Registrations", value: "24" },
    { label: "New leads", value: "6" },
    { label: "Activities hosted", value: "3" },
    { label: "Follow-up coverage", value: "80%" },
  ] as const;
  const ranking = [
    { activity: "Spring community signup", count: "12" },
    { activity: "Community open day", count: "8" },
    { activity: "Evening program", count: "4" },
  ] as const;
  return (
    <WorkspaceShell
      activeLabel="Analytics"
      title="Analytics"
      headerEnd={
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-border-warm px-2.5 py-1 text-xs font-medium text-text-warm">
          <Download className="size-3.5" aria-hidden />
          Export CSV
        </span>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <p className="text-xs text-text-muted-warm">Sample report layout — not live totals.</p>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <span
              key={filter.label}
              className="inline-flex min-w-0 flex-col rounded-lg border border-border-warm bg-background px-2.5 py-1.5"
            >
              <span className="text-[0.625rem] font-semibold uppercase text-text-muted-warm">
                {filter.label}
              </span>
              <span className="text-xs font-medium text-text-warm">{filter.value}</span>
            </span>
          ))}
        </div>
        <p className="text-xs text-text-muted-warm">
          CSV export uses the same filters and totals shown here.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border-warm bg-background px-3 py-2.5">
              <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-text-muted-warm">
                {metric.label}
              </p>
              <p className="mt-1 font-[family-name:var(--font-fraunces)] text-2xl font-medium text-text-warm">
                {metric.value}
              </p>
            </div>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border-warm">
          <p className="border-b border-border-warm bg-muted/30 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
            Activity ranking
          </p>
          <ul className="divide-y divide-border-warm text-sm">
            {ranking.map((row) => (
              <li key={row.activity} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0 truncate text-text-warm">{row.activity}</span>
                <span className="shrink-0 tabular-nums text-text-muted-warm">{row.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-text-muted-warm">
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
      <div className="relative overflow-hidden md:h-[34rem]">
        {chapterIds.map((id) => {
          const isActive = id === activeId;
          return (
            <div
              key={id}
              className={cn(
                "motion-reduce:transition-none",
                isActive ? "relative" : "hidden"
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
