import Link from "next/link";
import type { ReactNode } from "react";
import { MessageCircle, Send } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import {
  clientsTableActionsColumnClassName,
  clientsTableGridClassName,
  clientsTableStatusColumnClassName,
} from "@/components/clients/clients-table-layout";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import {
  formatClientContactLine,
  formatLastActivityCaption,
  formatLastOutreachCaption,
  type ClientListItem,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ClientRowProps = {
  client: ClientListItem;
  onMarkContacted?: (client: ClientListItem) => void;
  onOpenMessenger?: (client: ClientListItem) => void;
  isUpdating?: boolean;
};

function RowLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
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
}: ClientRowProps) {
  const profileHref = `/clients/${client.id}`;
  const showQuickActions =
    client.leadStatus === "new" && (onMarkContacted || onOpenMessenger);
  const canOpenMessenger = Boolean(client.phone && onOpenMessenger);

  return (
    <div
      className={cn(
        clientsTableGridClassName,
        "group border-b border-border-warm border-l-4 border-l-transparent",
        "transition-all hover:-translate-y-px hover:border-l-primary hover:bg-muted/40 hover:shadow-sm"
      )}
    >
      <div className="min-w-0">
        <MobileLabel>Contact</MobileLabel>
        <RowLink href={profileHref} className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={client.fullName} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-text-warm group-hover:text-primary">
              {client.fullName}
            </span>
            <span className="block truncate text-sm text-text-muted-warm group-hover:text-text-warm">
              {formatClientContactLine(client)}
            </span>
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
