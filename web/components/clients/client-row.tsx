import Link from "next/link";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import {
  clientsTableActionsColumnClassName,
  clientsTableCheckboxColumnClassName,
  clientsTableContactColumnClassName,
  clientsTableGridClassName,
  clientsTableOutreachColumnClassName,
  clientsTableRegistrationColumnClassName,
  clientsTableStatusColumnClassName,
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

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-[0.6875rem] font-medium uppercase tracking-wide text-text-muted-warm">
      {children}
    </span>
  );
}

type ClientRowActionsProps = {
  client: ClientListItem;
  canWhatsApp: boolean;
  canViber: boolean;
  showQuickActions: boolean;
  isUpdating: boolean;
  onMarkContacted?: (client: ClientListItem) => void;
  onOpenMessenger?: (client: ClientListItem, channel: MessengerChannel) => void;
  className?: string;
};

function ClientRowActions({
  client,
  canWhatsApp,
  canViber,
  showQuickActions,
  isUpdating,
  onMarkContacted,
  onOpenMessenger,
  className,
}: ClientRowActionsProps) {
  if (!showQuickActions) {
    return null;
  }

  return (
    <div className={cn(clientsTableActionsColumnClassName, className)}>
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
    </div>
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
    Boolean(onMarkContacted || (onOpenMessenger && (canWhatsApp || canViber)));
  const followUpDue = isFollowUpDue(client.nextFollowUpAt, timeZoneId);
  const lastActivityFull = formatLastActivityCaption(client);
  const lastActivityName = formatLastActivityName(client);
  const lastActivityDate = formatLastActivityDate(client);
  const lastOutreach = formatLastOutreachCaption(client);

  const rowStateClassName = cn(
    "border-b border-border-warm border-l-4 border-l-transparent transition-colors",
    "hover:border-l-primary hover:bg-muted/40",
    selected && "border-l-primary bg-primary/5"
  );

  const contactBlock = (
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
  );

  return (
    <>
      <article
        className={cn("group px-4 py-3.5 sm:hidden", rowStateClassName)}
        aria-label={client.fullName}
      >
        <div className="flex items-start gap-3">
          {selectable ? (
            <input
              type="checkbox"
              checked={selected}
              aria-label={`Select ${client.fullName}`}
              className="mt-1 size-4 shrink-0 rounded border-input accent-primary"
              onChange={(event) =>
                onSelectedChange?.(client, event.target.checked)
              }
            />
          ) : null}
          <div className="min-w-0 flex-1">{contactBlock}</div>
          <ClientRowActions
            client={client}
            canWhatsApp={canWhatsApp}
            canViber={canViber}
            showQuickActions={showQuickActions}
            isUpdating={isUpdating}
            onMarkContacted={onMarkContacted}
            onOpenMessenger={onOpenMessenger}
            className="shrink-0"
          />
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 pl-7 text-sm">
          <div className="min-w-0">
            <FieldLabel>Status</FieldLabel>
            <LeadStatusBadge status={client.leadStatus} />
          </div>
          <div className="min-w-0">
            <FieldLabel>Last outreach</FieldLabel>
            <p className="truncate text-text-muted-warm" title={lastOutreach}>
              {lastOutreach}
            </p>
          </div>
          <div className="col-span-2 min-w-0">
            <FieldLabel>Last registration</FieldLabel>
            <RowLink
              href={profileHref}
              className="block min-w-0 overflow-hidden"
              title={lastActivityFull}
            >
              <span className="block truncate text-text-warm/80">
                {lastActivityName}
              </span>
              {lastActivityDate ? (
                <span className="block truncate text-xs text-text-muted-warm">
                  {lastActivityDate}
                </span>
              ) : null}
            </RowLink>
          </div>
        </dl>
      </article>

      <div className={cn(clientsTableGridClassName, "group hidden sm:grid", rowStateClassName)}>
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
          <div aria-hidden />
        )}

        <div className={clientsTableContactColumnClassName}>{contactBlock}</div>

        <div className={clientsTableStatusColumnClassName}>
          <LeadStatusBadge status={client.leadStatus} />
        </div>

        <div className={clientsTableRegistrationColumnClassName}>
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

        <div className={clientsTableOutreachColumnClassName}>
          <RowLink
            href={profileHref}
            className="block min-w-0 truncate text-sm text-text-muted-warm group-hover:text-text-warm"
            title={lastOutreach}
          >
            {lastOutreach}
          </RowLink>
        </div>

        <ClientRowActions
          client={client}
          canWhatsApp={canWhatsApp}
          canViber={canViber}
          showQuickActions={showQuickActions}
          isUpdating={isUpdating}
          onMarkContacted={onMarkContacted}
          onOpenMessenger={onOpenMessenger}
        />
      </div>
    </>
  );
}
