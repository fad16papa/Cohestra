import Link from "next/link";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { cn } from "@/lib/utils";
import {
  followUpCategoryLabel,
  followUpContextCaption,
  type FollowUpCategory,
} from "@/lib/follow-up-category";
import type { ClientListItem } from "@/lib/clients-api";

type FollowUpResult = ClientListItem & { category: FollowUpCategory };

type FollowUpResultsProps = {
  results: FollowUpResult[];
  timeZoneId?: string | null;
};

function ResultLink({
  client,
  category,
  timeZoneId,
  className,
}: {
  client: ClientListItem;
  category: FollowUpCategory;
  timeZoneId?: string | null;
  className?: string;
}) {
  const categoryLabel = followUpCategoryLabel(category);
  const context = followUpContextCaption(client, category, timeZoneId);

  return (
    <Link
      href={`/clients/${client.id}`}
      aria-label={`Open ${client.fullName}`}
      className={cn(
        "min-h-11 min-w-11 outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
    >
      <PersonAvatar name={client.fullName} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-text-warm">{client.fullName}</p>
        <p className="truncate text-sm text-text-muted-warm">{context}</p>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-text-warm">
        {categoryLabel}
      </span>
    </Link>
  );
}

export function FollowUpResults({ results, timeZoneId }: FollowUpResultsProps) {
  return (
    <div className="min-w-0">
      <ul className="space-y-2 lg:hidden">
        {results.map((client) => (
          <li key={client.id}>
            <ResultLink
              client={client}
              category={client.category}
              timeZoneId={timeZoneId}
              className="flex items-center gap-3 rounded-xl border border-border-warm bg-card/80 px-3 py-3 motion-local hover:bg-muted/40"
            />
          </li>
        ))}
      </ul>

      <div className="hidden min-w-0 overflow-x-auto lg:block">
        <table className="w-full min-w-0 border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
              <th className="border-b border-border-warm px-3 py-2">Client</th>
              <th className="border-b border-border-warm px-3 py-2">Category</th>
              <th className="border-b border-border-warm px-3 py-2">Follow-up</th>
            </tr>
          </thead>
          <tbody>
            {results.map((client) => (
              <tr key={client.id} className="motion-local hover:bg-muted/20">
                <td className="border-b border-border-warm px-3 py-1.5">
                  <Link
                    href={`/clients/${client.id}`}
                    aria-label={`Open ${client.fullName}`}
                    className="inline-flex min-h-11 min-w-11 items-center gap-3 rounded-sm py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <PersonAvatar name={client.fullName} size="sm" />
                    <span className="font-medium text-text-warm">{client.fullName}</span>
                  </Link>
                </td>
                <td className="border-b border-border-warm px-3 py-1.5 text-sm text-text-warm">
                  {followUpCategoryLabel(client.category)}
                </td>
                <td className="border-b border-border-warm px-3 py-1.5 text-sm text-text-muted-warm">
                  {followUpContextCaption(client, client.category, timeZoneId)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
