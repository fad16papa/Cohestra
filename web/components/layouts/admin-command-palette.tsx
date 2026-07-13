"use client";



import { useRouter } from "next/navigation";

import { CalendarDays, Search, Users } from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";



import { useAuth } from "@/components/auth/auth-provider";

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

    () => mergePaletteItems(staticFiltered, entityItems),

    [entityItems, staticFiltered]

  );



  useEffect(() => {

    if (!open) {

      setQuery("");

      setActiveIndex(0);

      setEntityItems([]);

      setEntityLoading(false);

      return;

    }



    inputRef.current?.focus();

  }, [open]);



  useEffect(() => {

    setActiveIndex(0);

  }, [query, entityItems.length]);



  useEffect(() => {

    if (!open || status !== "authenticated") {

      return;

    }



    const trimmed = query.trim();

    if (trimmed.length < MIN_ENTITY_QUERY_LENGTH) {

      setEntityItems([]);

      setEntityLoading(false);

      return;

    }



    let cancelled = false;

    setEntityLoading(true);



    const timer = window.setTimeout(() => {

      void Promise.all([

        fetchClients(authFetch, { search: trimmed, page: 1, pageSize: 5 }),

        fetchActivities(authFetch, { search: trimmed, page: 1, pageSize: 5 }),

      ])

        .then(([clientsResult, activitiesResult]) => {

          if (cancelled) {

            return;

          }



          const nextItems: CommandPaletteItem[] = [

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

          ];



          setEntityItems(nextItems);

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

      if (event.key === "Escape") {

        event.preventDefault();

        onOpenChange(false);

        return;

      }



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

        event.preventDefault();

        const item = filteredItems[activeIndex];

        if (item) {

          onOpenChange(false);

          router.push(item.href);

        }

      }

    }



    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);

  }, [activeIndex, filteredItems, onOpenChange, open, router]);



  if (!open) {

    return null;

  }



  let lastGroup = "";



  return (

    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[min(20vh,8rem)]">

      <button

        type="button"

        aria-label="Close command palette"

        className="absolute inset-0 bg-background/70 backdrop-blur-sm"

        onClick={() => onOpenChange(false)}

      />

      <div

        role="dialog"

        aria-modal="true"

        aria-label="Command palette"

        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border-warm bg-popover shadow-2xl ring-1 ring-primary/10"

      >

        <div className="flex items-center gap-3 border-b border-border-warm px-4 py-3">

          <Search className="size-4 shrink-0 text-text-muted-warm" aria-hidden />

          <input

            ref={inputRef}

            value={query}

            onChange={(event) => setQuery(event.target.value)}

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

                const showHeader = item.group !== lastGroup;

                lastGroup = item.group;



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

                        onOpenChange(false);

                        router.push(item.href);

                      }}

                      className={cn(

                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",

                        isActive

                          ? "bg-primary/10 text-text-warm"

                          : "text-foreground hover:bg-muted/60"

                      )}

                    >

                      <Icon className="size-4 shrink-0 text-primary" aria-hidden />

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

      </div>

    </div>

  );

}


