import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight, MessageCircle } from "lucide-react";

import { LeadStatusBadge } from "@/components/clients/lead-status-badge";
import {
  clientsTableGridClassName,
  clientsTableStatusColumnClassName,
} from "@/components/clients/clients-table-layout";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import {
  formatLastActivityCaption,
  type ClientListItem,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ClientRowProps = {
  client: ClientListItem;
  onMarkContacted?: (client: ClientListItem) => void;
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

export function ClientRow({
  client,
  onMarkContacted,
  isUpdating = false,
}: ClientRowProps) {
  const profileHref = `/clients/${client.id}`;
  const showQuickContact = client.leadStatus === "new" && onMarkContacted;

  return (
    <div
      className={cn(
        clientsTableGridClassName,
        "group border-b border-border-warm border-l-4 border-l-transparent py-3 sm:py-4",
        "transition-all hover:-translate-y-px hover:border-l-primary hover:bg-muted/40 hover:shadow-sm"
      )}
    >
      <RowLink href={profileHref} className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={client.fullName} size="sm" />
        <span className="min-w-0 truncate font-semibold text-text-warm group-hover:text-primary">
          {client.fullName}
        </span>
      </RowLink>

      <RowLink
        href={profileHref}
        className="min-w-0 truncate text-center text-sm text-text-muted-warm group-hover:text-text-warm"
      >
        {client.nationality ?? "—"}
      </RowLink>

      <RowLink href={profileHref} className={clientsTableStatusColumnClassName}>
        <LeadStatusBadge status={client.leadStatus} />
      </RowLink>

      <RowLink
        href={profileHref}
        className="min-w-0 truncate text-sm text-text-muted-warm group-hover:text-text-warm"
      >
        {formatLastActivityCaption(client)}
      </RowLink>

      <div className="flex min-w-0 items-center justify-end">
        {showQuickContact ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUpdating}
            className={cn(
              "h-8 gap-1.5 border-primary/20 px-2 text-xs opacity-100 sm:opacity-0",
              "sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
              "focus-visible:opacity-100"
            )}
            onClick={(event) => {
              event.preventDefault();
              onMarkContacted(client);
            }}
          >
            <MessageCircle className="size-3.5" aria-hidden />
            <span className="hidden sm:inline">Contacted</span>
          </Button>
        ) : (
          <span className="hidden h-8 sm:block" aria-hidden />
        )}
      </div>

      <RowLink href={profileHref} className="flex justify-end">
        <ChevronRight
          className="size-4 shrink-0 text-text-muted-warm transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
          aria-hidden
        />
      </RowLink>
    </div>
  );
}
