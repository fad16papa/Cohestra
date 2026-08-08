import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import {
  clientsTableActionsColumnClassName,
  clientsTableCheckboxColumnClassName,
  clientsTableGridClassName,
  clientsTableStatusColumnClassName,
  clientsTableTextColumnClassName,
} from "@/components/clients/clients-table-layout";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  ViberBrandIcon,
  WhatsAppBrandIcon,
} from "@/components/shared/messenger-brand-icons";
import { Button } from "@/components/ui/button";
import {
  formatClientContactLine,
  formatLastActivityCaption,
  formatLastActivityDate,
  formatLastActivityName,
  formatLastOutreachCaption,
  isFollowUpDue,
  type ClientListItem,
} from "@/lib/clients-api";
import {
  buildViberAppDeepLink,
  buildWhatsAppWebUrl,
} from "@/lib/messenger-links";
import type { MessengerChannel } from "@/lib/messenger-prerequisites";
import { cn } from "@/lib/utils";

type ClientRowProps = {
  client: ClientListItem;
  onMarkContacted?: (client: ClientListItem) => void;
  onOpenMessenger?: (client: ClientListItem, channel: MessengerChannel) => void;
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
  const canWhatsApp = Boolean(client.phone && buildWhatsAppWebUrl(client.phone));
  const canViber = Boolean(client.phone && buildViberAppDeepLink(client.phone));
  const showQuickActions =
    client.leadStatus === "new" &&
    (onMarkContacted || (onOpenMessenger && (canWhatsApp || canViber)));
  const followUpDue = isFollowUpDue(client.nextFollowUpAt, timeZoneId);
  const lastActivityFull = formatLastActivityCaption(client);
  const lastActivityName = formatLastActivityName(client);
  const lastActivityDate = formatLastActivityDate(client);
  const lastOutreach = formatLastOutreachCaption(client);

  return (
    <div
      className={cn(
        clientsTableGridClassName,
        "group border-b border-border-warm border-l-4 border-l-transparent",
        "transition-colors hover:border-l-primary hover:bg-muted/40",
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

      <div className={clientsTableTextColumnClassName}>
        <MobileLabel>Contact</MobileLabel>
        <RowLink href={profileHref} className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={client.fullName} size="sm" />
          <span className="min-w-0 overflow-hidden">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-text-warm group-hover:text-primary">
                {client.fullName}
              </span>
              {followUpDue ? (
                <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700 dark:text-amber-300">
                  Due
                </span>
              ) : null}
            </span>
            <span className="block truncate text-[0.8125rem] text-text-muted-warm">
              {formatClientContactLine(client)}
            </span>
          </span>
        </RowLink>
      </div>

      <div className={clientsTableStatusColumnClassName}>
        <MobileLabel>Status</MobileLabel>
        <RowLink href={profileHref} className="min-w-0">
          <LeadStatusBadge status={client.leadStatus} />
        </RowLink>
      </div>

      <div className={clientsTableTextColumnClassName}>
        <MobileLabel>Last registration</MobileLabel>
        <RowLink
          href={profileHref}
          className="block min-w-0 overflow-hidden"
          title={lastActivityFull}
        >
          <span className="block truncate text-sm text-text-warm/80 group-hover:text-text-warm">
            {lastActivityName}
          </span>
          {lastActivityDate ? (
            <span className="block truncate text-xs text-text-muted-warm">
              {lastActivityDate}
            </span>
          ) : null}
        </RowLink>
      </div>

      <div className={clientsTableTextColumnClassName}>
        <MobileLabel>Last outreach</MobileLabel>
        <RowLink
          href={profileHref}
          className="block min-w-0 truncate text-sm text-text-muted-warm group-hover:text-text-warm"
          title={lastOutreach}
        >
          {lastOutreach}
        </RowLink>
      </div>

      <div className={clientsTableActionsColumnClassName}>
        {showQuickActions ? (
          <>
            <MobileLabel>Quick actions</MobileLabel>
            {onMarkContacted ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isUpdating}
                aria-label={`Mark ${client.fullName} as contacted`}
                title="Mark contacted"
                className="size-8 shrink-0 border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
                onClick={(event) => {
                  event.preventDefault();
                  onMarkContacted(client);
                }}
              >
                <Check className="size-4" aria-hidden />
              </Button>
            ) : null}
            {canWhatsApp && onOpenMessenger ? (
              <Button
                type="button"
                size="icon"
                disabled={isUpdating}
                aria-label={`Open WhatsApp for ${client.fullName}`}
                title="Open WhatsApp"
                className="size-8 shrink-0 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenMessenger(client, "whatsapp");
                }}
              >
                <WhatsAppBrandIcon />
              </Button>
            ) : null}
            {canViber && onOpenMessenger ? (
              <Button
                type="button"
                size="icon"
                disabled={isUpdating}
                aria-label={`Open Viber for ${client.fullName}`}
                title="Open Viber"
                className="size-8 shrink-0 bg-viber text-viber-foreground hover:bg-viber/90"
                onClick={(event) => {
                  event.preventDefault();
                  onOpenMessenger(client, "viber");
                }}
              >
                <ViberBrandIcon />
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
