"use client";

import { useRouter } from "next/navigation";
import { CalendarDays, Search, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  commandPaletteItems,
  filterCommandPaletteItems,
  type CommandPaletteItem,
} from "@/lib/command-palette-items";
import { fetchActivities } from "@/lib/activities-api";
import { fetchClients } from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type AdminCommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ENTITY_SEARCH_DEBOUNCE_MS = 250;
const MIN_ENTITY_QUERY_LENGTH = 2;

function mergePaletteItems(
  staticItems: CommandPaletteItem[],
  entityItems: CommandPaletteItem[]
): CommandPaletteItem[] {
  if (entityItems.length === 0) {
    return staticItems;
  }

  return [...entityItems, ...staticItems];
}

export function AdminCommandPalette({
  open,
  onOpenChange,
}: AdminCommandPaletteProps) {
  const router = useRouter();
  const { authFetch, status } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entityItems, setEntityItems] = useState<CommandPaletteItem[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);

  const staticFiltered = useMemo(
    () => filterCommandPaletteItems(query, commandPaletteItems),
    [query]
  );

  const filteredItems = useMemo(
    () =>
      mergePaletteItems(
        staticFiltered,
        query.trim().length >= MIN_ENTITY_QUERY_LENGTH ? entityItems : []
      ),
    [entityItems, query, staticFiltered]
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) {
        setQuery("");
        setActiveIndex(0);
        setEntityItems([]);
        setEntityLoading(false);
      }
    },
    [onOpenChange]
  );

  useEffect(() => {
    if (!open || status !== "authenticated") {
      return;
    }

    const trimmed = query.trim();
    if (trimmed.length < MIN_ENTITY_QUERY_LENGTH) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setEntityLoading(true);
      void Promise.all([
        fetchClients(authFetch, { search: trimmed, page: 1, pageSize: 5 }),
        fetchActivities(authFetch, { search: trimmed, page: 1, pageSize: 5 }),
      ])
        .then(([clientsResult, activitiesResult]) => {
          if (cancelled) {
            return;
          }

          setEntityItems([
            ...clientsResult.items.map((client) => ({
              id: `client-${client.id}`,
              label: client.fullName,
              href: `/clients/${client.id}`,
              group: "Clients",
              keywords: client.nationality ?? "",
              icon: Users,
            })),
            ...activitiesResult.items.map((activity) => ({
              id: `activity-${activity.id}`,
              label: activity.name,
              href: `/activities/${activity.id}`,
              group: "Activities",
              keywords: `${activity.communityLabel} ${activity.category}`,
              icon: CalendarDays,
            })),
          ]);
          setActiveIndex(0);
        })
        .catch(() => {
          if (!cancelled) {
            setEntityItems([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setEntityLoading(false);
          }
        });
    }, ENTITY_SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [authFetch, open, query, status]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (filteredItems.length === 0) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filteredItems.length);
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex(
          (current) => (current - 1 + filteredItems.length) % filteredItems.length
        );
      }

      if (event.key === "Enter") {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === "BUTTON") {
          return;
        }
        event.preventDefault();
        const item = filteredItems[activeIndex];
        if (item) {
          handleOpenChange(false);
          router.push(item.href);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredItems, handleOpenChange, open, router]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        initialFocus={inputRef}
        aria-describedby="command-palette-hint"
        className="top-[min(20vh,8rem)] left-1/2 max-w-lg translate-y-0 gap-0 overflow-hidden p-0"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription id="command-palette-hint" className="sr-only">
          Search clients, activities, or pages. Escape closes.
        </DialogDescription>
        <DialogClose className="sr-only">Close</DialogClose>
        <div className="flex items-center gap-3 border-b border-border-warm px-4 py-3">
          <Search className="size-4 shrink-0 text-text-muted-warm" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search clients, activities, or pages…"
            aria-label="Search commands"
            className="min-w-0 flex-1 bg-transparent text-sm text-text-warm outline-none placeholder:text-text-muted-warm"
          />
          <kbd className="hidden rounded border border-border-warm bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-text-muted-warm sm:inline">
            esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {entityLoading && query.trim().length >= MIN_ENTITY_QUERY_LENGTH ? (
            <p className="px-3 py-2 text-xs text-text-muted-warm">Searching records…</p>
          ) : null}

          {filteredItems.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-text-muted-warm">
              No matches. Try a client name, activity title, or &ldquo;campaign&rdquo;.
            </p>
          ) : (
            <ul>
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isActive = index === activeIndex;
                const showHeader =
                  index === 0 || item.group !== filteredItems[index - 1]?.group;

                return (
                  <li key={item.id}>
                    {showHeader ? (
                      <p className="px-3 py-1.5 text-xs font-medium uppercase tracking-wide text-text-muted-warm">
                        {item.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => {
                        handleOpenChange(false);
                        router.push(item.href);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm motion-press outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        isActive
                          ? "bg-primary/10 text-text-warm"
                          : "text-foreground hover:bg-muted/60"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-text-link" aria-hidden />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border-warm bg-muted/30 px-4 py-2 text-[11px] text-text-muted-warm">
          <span>↑ ↓ navigate · Enter open · type 2+ chars to search records</span>
          <span className="hidden sm:inline">
            <kbd className="rounded border border-border-warm bg-background px-1.5 py-0.5">
              ⌘K
            </kbd>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
