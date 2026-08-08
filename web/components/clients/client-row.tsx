import Link from "next/link";
import type { ReactNode } from "react";
import { MessageCircle, Send } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import {
  clientsTableActionsColumnClassName,
  clientsTableCheckboxColumnClassName,
  clientsTableGridClassName,
  clientsTableStatusColumnClassName,
} from "@/components/clients/clients-table-layout";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import {
  formatClientContactLine,
  formatLastActivityCaption,
  formatLastOutreachCaption,
  formatNextFollowUpDate,
  isFollowUpDue,
  type ClientListItem,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ClientRowProps = {
  client: ClientListItem;
  onMarkContacted?: (client: ClientListItem) => void;
  onOpenMessenger?: (client: ClientListItem) => void;
  isUpdating?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (client: ClientListItem, selected: boolean) => void;
  timeZoneId?: string | null;
};

function RowLink({
  href,
  children,
  className,
  title,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <Link
      href={href}
      title={title}
      className={cn(
        "min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
        className
      )}
    >
      {children}
    </Link>
  );
}

function MobileLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted-warm sm:hidden">
      {children}
    </span>
  );
}

export function ClientRow({
  client,
  onMarkContacted,
  onOpenMessenger,
  isUpdating = false,
  selectable = false,
  selected = false,
  onSelectedChange,
  timeZoneId,
}: ClientRowProps) {
  const profileHref = `/clients/${client.id}`;
  const showQuickActions =
    client.leadStatus === "new" && (onMarkContacted || onOpenMessenger);
  const canOpenMessenger = Boolean(client.phone && onOpenMessenger);
  const followUpDue = isFollowUpDue(client.nextFollowUpAt, timeZoneId);

  return (
    <div
      className={cn(
        clientsTableGridClassName,
        "group border-b border-border-warm border-l-4 border-l-transparent",
        "transition-all hover:-translate-y-px hover:border-l-primary hover:bg-muted/40 hover:shadow-sm",
        selected && "border-l-primary bg-primary/5"
      )}
    >
      {selectable ? (
        <div className={clientsTableCheckboxColumnClassName}>
          <input
            type="checkbox"
            checked={selected}
            aria-label={`Select ${client.fullName}`}
            className="size-4 rounded border-input accent-primary"
            onChange={(event) =>
              onSelectedChange?.(client, event.target.checked)
            }
          />
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}

      <div className="min-w-0">
        <MobileLabel>Contact</MobileLabel>
        <RowLink href={profileHref} className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={client.fullName} size="sm" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate font-semibold text-text-warm group-hover:text-primary">
                {client.fullName}
              </span>
              {followUpDue ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[0.6875rem] font-medium text-amber-700 dark:text-amber-300">
                  Follow-up due
                </span>
              ) : null}
            </span>
            <span className="block truncate text-sm text-text-muted-warm group-hover:text-text-warm">
              {formatClientContactLine(client)}
            </span>
            {client.nextFollowUpAt ? (
              <span className="block truncate text-xs text-text-muted-warm">
                Next follow-up: {formatNextFollowUpDate(client.nextFollowUpAt, timeZoneId)}
              </span>
            ) : null}
          </span>
        </RowLink>
      </div>

      <div className={cn(clientsTableStatusColumnClassName, "gap-2")}>
        <MobileLabel>Status</MobileLabel>
        <RowLink href={profileHref} className="min-w-0">
          <LeadStatusBadge status={client.leadStatus} />
        </RowLink>
      </div>

      <div className="min-w-0">
        <MobileLabel>Last registration</MobileLabel>
        <RowLink
          href={profileHref}
          className="min-w-0 truncate text-sm text-text-muted-warm group-hover:text-text-warm"
          title={formatLastActivityCaption(client)}
        >
          {formatLastActivityCaption(client)}
        </RowLink>
      </div>

      <div className="min-w-0">
        <MobileLabel>Last outreach</MobileLabel>
        <RowLink
          href={profileHref}
          className="min-w-0 truncate text-sm text-text-muted-warm group-hover:text-text-warm"
        >
          {formatLastOutreachCaption(client)}
        </RowLink>
      </div>

      {showQuickActions ? (
        <div className={clientsTableActionsColumnClassName}>
          <MobileLabel>Quick actions</MobileLabel>
          {onMarkContacted ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isUpdating}
              className="h-8 shrink-0 gap-1.5 border-primary/20 px-2 text-xs"
              onClick={(event) => {
                event.preventDefault();
                onMarkContacted(client);
              }}
            >
              <MessageCircle className="size-3.5" aria-hidden />
              Mark contacted
            </Button>
          ) : null}
          {canOpenMessenger ? (
            <Button
              type="button"
              size="sm"
              disabled={isUpdating}
              className="h-8 shrink-0 gap-1.5 bg-whatsapp px-2 text-xs text-whatsapp-foreground hover:bg-whatsapp/90"
              onClick={(event) => {
                event.preventDefault();
                onOpenMessenger?.(client);
              }}
            >
              <Send className="size-3.5" aria-hidden />
              Open messenger
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="hidden sm:block" aria-hidden />
      )}
    </div>
  );
}
