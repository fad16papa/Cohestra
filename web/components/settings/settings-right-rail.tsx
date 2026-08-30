"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { LimitMeter } from "@/components/shell/limit-meter";
import { PlanBadge } from "@/components/shell/plan-badge";
import { SponsoredBadge } from "@/components/shell/sponsored-badge";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import type { SettingsSectionId } from "@/components/settings/settings-sections";
import { cn } from "@/lib/utils";

type SettingsRightRailProps = {
  activeId: SettingsSectionId;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  hideCollapseToggle?: boolean;
  className?: string;
};

function ContextBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted-warm">
        {title}
      </p>
      <div className="text-sm leading-relaxed text-text-muted-warm">{children}</div>
    </div>
  );
}

function sectionTips(activeId: SettingsSectionId): { title: string; body: string } {
  switch (activeId) {
    case "settings-plan":
      return {
        title: "Plan headroom",
        body: "Upgrade before you hit published activity or monthly registration caps. Limits reset on the 1st in your organization timezone.",
      };
    case "settings-brand":
      return {
        title: "Brand accent",
        body: "Accent color applies to primary actions and highlights. Lead status colors stay semantic for clarity.",
      };
    case "settings-organization":
      return {
        title: "Timezone",
        body: "Changing timezone recalculates this month's registration count immediately for plan enforcement.",
      };
    case "settings-notifications":
      return {
        title: "New registrations",
        body: "Operator emails include participant contact details and a link to Activity registrations. Hidden campaign fields may appear in operator mail only.",
      };
    case "settings-domain":
      return {
        title: "Enterprise",
        body: "Custom domains map your public homepage and registration links to your own hostname.",
      };
    case "settings-account":
      return {
        title: "Security",
        body: "Use a unique password for this workspace. Password changes apply across all devices immediately.",
      };
    case "settings-support":
      return {
        title: "Support ID",
        body: "Save your SUP issue number from the confirmation screen — it matches email subjects for faster replies.",
      };
    case "settings-appearance":
      return {
        title: "Theme sync",
        body: "Appearance preference syncs with the sun/moon toggle in the top bar on every page.",
      };
    default:
      return { title: "Tip", body: "Select a section on the left to edit settings." };
  }
}

export function SettingsRightRail({
  activeId,
  collapsed,
  onToggleCollapsed,
  hideCollapseToggle = false,
  className,
}: SettingsRightRailProps) {
  const { shell } = useTenantShell();
  const tip = sectionTips(activeId);
  const usageDials =
    shell?.limitDials.filter((dial) => dial.key !== "seats") ?? [];

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-border-warm/80 bg-card/50 transition-[width] duration-200",
        collapsed ? "w-14" : "w-72 xl:w-80",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border-warm/80 px-2 py-3">
        {!hideCollapseToggle ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand context panel" : "Collapse context panel"}
            className="flex size-9 items-center justify-center rounded-lg text-text-muted-warm hover:bg-muted/60 hover:text-text-warm"
          >
            {collapsed ? (
              <ChevronLeft className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </button>
        ) : null}
        {!collapsed ? (
          <p className={cn("px-2 text-xs font-medium uppercase tracking-[0.12em] text-text-muted-warm", hideCollapseToggle && "ml-2")}>
            Context
          </p>
        ) : null}
      </div>

      {!collapsed ? (
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {shell ? (
            <div className="rounded-xl border border-border-warm/80 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-text-muted-warm">
                Workspace
              </p>
              <p className="mt-2 font-heading text-lg font-semibold text-text-warm">
                {shell.tenantName}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PlanBadge plan={shell.plan} />
                {shell.billingStatus && shell.billingStatus !== "Free" ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-text-muted-warm">
                    {shell.billingStatus}
                  </span>
                ) : null}
                {shell.isComplimentary ? <SponsoredBadge /> : null}
              </div>
            </div>
          ) : null}

          {activeId === "settings-plan" && usageDials.length > 0 ? (
            <div className="rounded-xl border border-border-warm/80 bg-muted/20 p-4">
              <LimitMeter dials={usageDials} compact />
            </div>
          ) : null}

          <ContextBlock title={tip.title}>
            <p>{tip.body}</p>
          </ContextBlock>

          {shell?.isTenantAdmin ? (
            <ContextBlock title="Quick links">
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/settings/team"
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                  >
                    Team settings
                    <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                </li>
                {(shell.plan === "Basic" || shell.isBillingOwner) && (
                  <li>
                    <Link
                      href="/settings/billing"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      Billing & plan
                      <ExternalLink className="size-3.5" aria-hidden />
                    </Link>
                  </li>
                )}
              </ul>
            </ContextBlock>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
