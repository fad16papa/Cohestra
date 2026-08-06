"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  TriangleAlert,
  X,
} from "lucide-react";

import { ActivityStatusBadge } from "@/components/activities/activity-status-badge";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { fetchAllActivities, type ActivityStatus } from "@/lib/activities-api";
import {
  countActivitiesByStatusOnDay,
  dayHasScheduleConflicts,
  enrichActivitiesForCalendar,
  findActivityConflictsForDay,
  formatActivityTime,
  formatCalendarMonthLabel,
  formatConflictSummary,
  formatDayHeading,
  fromDateKey,
  getMonthGridDays,
  getUnscheduledActivities,
  groupScheduledActivitiesByDay,
  STATUS_DOT_STYLES,
  STATUS_RING_STYLES,
  toDateKey,
  type CalendarActivity,
} from "@/lib/activity-calendar-utils";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_FILTERS: { id: ActivityStatus; label: string }[] = [
  { id: "draft", label: "Draft" },
  { id: "published", label: "Published" },
  { id: "archived", label: "Archived" },
];

function activityFormHref(activityId: string): string {
  return `/activities/${activityId}?tab=form`;
}

type ActivityCalendarItemProps = {
  activity: CalendarActivity;
  defaultExpanded?: boolean;
  conflictingActivities?: CalendarActivity[];
};

function formatConflictMessage(conflicts: CalendarActivity[]): string {
  if (conflicts.length === 0) {
    return "";
  }

  if (conflicts.length === 1) {
    return `Conflicts with ${conflicts[0].name}.`;
  }

  const preview = conflicts
    .slice(0, 2)
    .map((activity) => activity.name)
    .join(", ");
  const remainder = conflicts.length - 2;

  return remainder > 0
    ? `Conflicts with ${preview}, and ${remainder} more.`
    : `Conflicts with ${preview}.`;
}

function ActivityCalendarItem({
  activity,
  defaultExpanded = false,
  conflictingActivities = [],
}: ActivityCalendarItemProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const timeLabel = activity.parsedSchedule
    ? formatActivityTime(activity.parsedSchedule)
    : "No time";
  const hasConflict = conflictingActivities.length > 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border-warm bg-card/80 transition-colors",
        STATUS_RING_STYLES[activity.status],
        hasConflict && "border-amber-300/80 dark:border-amber-800/80",
        expanded && "ring-1"
      )}
    >
      <div className="flex items-start gap-1.5 p-2">
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded p-0.5 text-text-muted-warm hover:bg-muted/60 hover:text-text-warm"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse activity title" : "Expand activity title"}
          onClick={() => setExpanded((current) => !current)}
        >
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </button>
        <Link
          href={activityFormHref(activity.id)}
          className="min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium text-text-warm",
                  !expanded && "truncate"
                )}
              >
                {activity.name}
              </p>
              <p className="mt-0.5 text-xs text-text-muted-warm">
                {timeLabel}
                {activity.location.trim()
                  ? ` · ${activity.location.trim()}`
                  : null}
              </p>
              {hasConflict ? (
                <p className="mt-1 flex items-start gap-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                  <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span>{formatConflictMessage(conflictingActivities)}</span>
                </p>
              ) : null}
            </div>
            <ActivityStatusBadge status={activity.status} className="shrink-0" />
          </div>
        </Link>
      </div>
    </div>
  );
}

type ActivityCalendarPopoutProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ActivityCalendarPopout({
  open,
  onOpenChange,
}: ActivityCalendarPopoutProps) {
  const { authFetch } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(today));
  const [statusFilters, setStatusFilters] = useState<Record<ActivityStatus, boolean>>({
    draft: true,
    published: true,
    archived: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<CalendarActivity[]>([]);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await fetchAllActivities(authFetch);
      setActivities(enrichActivitiesForCalendar(items));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load activities."
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (open) {
      void loadActivities();
    }
  }, [open, loadActivities]);

  const filteredActivities = useMemo(
    () => activities.filter((activity) => statusFilters[activity.status]),
    [activities, statusFilters]
  );

  const groupedByDay = useMemo(
    () => groupScheduledActivitiesByDay(filteredActivities),
    [filteredActivities]
  );

  const unscheduled = useMemo(
    () => getUnscheduledActivities(filteredActivities),
    [filteredActivities]
  );

  const monthDays = useMemo(
    () => getMonthGridDays(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const selectedDayActivities = groupedByDay.get(selectedDateKey) ?? [];
  const selectedDate = fromDateKey(selectedDateKey);
  const selectedDayConflicts = useMemo(
    () => findActivityConflictsForDay(selectedDayActivities),
    [selectedDayActivities]
  );
  const selectedDayConflictCount = selectedDayConflicts.size;

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  function toggleStatusFilter(status: ActivityStatus) {
    setStatusFilters((current) => ({
      ...current,
      [status]: !current[status],
    }));
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Activity calendar"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        aria-label="Close activity calendar"
        onClick={() => onOpenChange(false)}
      />

      <section
        className={cn(
          "relative flex max-h-[min(82dvh,720px)] w-full max-w-md flex-col overflow-hidden",
          "rounded-2xl border border-border-warm bg-card shadow-2xl ring-1 ring-border-warm/60",
          "motion-safe:animate-page-enter"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border-warm px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden />
              <h2 className="text-section text-text-warm">Activity calendar</h2>
            </div>
            <p className="mt-0.5 text-xs text-text-muted-warm">
              Draft, published, and archived — click an activity to open its form.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close calendar"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </header>

        <div className="flex flex-wrap gap-1.5 border-b border-border-warm px-4 py-2.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => toggleStatusFilter(filter.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                statusFilters[filter.id]
                  ? "border-border-warm bg-surface-warm/60 text-text-warm"
                  : "border-transparent bg-muted/40 text-text-muted-warm line-through opacity-60"
              )}
            >
              <span
                className={cn("size-1.5 rounded-full", STATUS_DOT_STYLES[filter.id])}
                aria-hidden
              />
              {filter.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-text-muted-warm">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading activities…
            </div>
          ) : error ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={() => void loadActivities()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-border-warm bg-surface-warm/30 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Previous month"
                    onClick={() => shiftMonth(-1)}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <p className="text-sm font-semibold text-text-warm">
                    {formatCalendarMonthLabel(viewYear, viewMonth)}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Next month"
                    onClick={() => shiftMonth(1)}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-text-muted-warm">
                  {WEEKDAY_LABELS.map((label) => (
                    <span key={label} className="py-1">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-1 grid grid-cols-7 gap-1">
                  {monthDays.map((day) => {
                    const key = toDateKey(day);
                    const inMonth = day.getMonth() === viewMonth;
                    const isSelected = key === selectedDateKey;
                    const isToday = key === toDateKey(today);
                    const dayActivities = groupedByDay.get(key) ?? [];
                    const statusCounts = countActivitiesByStatusOnDay(dayActivities);
                    const activityCount = dayActivities.length;
                    const hasConflicts = dayHasScheduleConflicts(dayActivities);

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSelectedDateKey(key)}
                        className={cn(
                          "flex min-h-11 flex-col items-center justify-start rounded-lg px-0.5 py-1 text-xs transition-colors",
                          inMonth ? "text-text-warm" : "text-text-muted-warm/50",
                          isSelected && "bg-primary/15 ring-1 ring-primary/40",
                          !isSelected && isToday && "ring-1 ring-primary/25",
                          !isSelected && hasConflicts && "ring-1 ring-amber-400/50",
                          !isSelected && "hover:bg-muted/50"
                        )}
                        aria-pressed={isSelected}
                        aria-label={`${formatDayHeading(day)}${activityCount ? `, ${activityCount} activities` : ""}${hasConflicts ? ", scheduling conflict" : ""}`}
                      >
                        <span className="font-medium">{day.getDate()}</span>
                        <span className="mt-0.5 flex flex-col items-center gap-0.5">
                          <span className="flex gap-0.5">
                            {STATUS_FILTERS.map((filter) =>
                              statusCounts[filter.id] > 0 ? (
                                <span
                                  key={filter.id}
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    STATUS_DOT_STYLES[filter.id]
                                  )}
                                  aria-hidden
                                />
                              ) : null
                            )}
                          </span>
                          {activityCount > 1 ? (
                            <span className="rounded-full bg-muted px-1 text-[9px] font-semibold leading-none text-text-muted-warm">
                              {activityCount}
                            </span>
                          ) : null}
                          {hasConflicts ? (
                            <TriangleAlert
                              className="size-3 text-amber-600 dark:text-amber-400"
                              aria-hidden
                            />
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-warm">
                    {formatDayHeading(selectedDate)}
                  </h3>
                  <div className="text-right text-xs text-text-muted-warm">
                    <p>
                      {selectedDayActivities.length} activit
                      {selectedDayActivities.length === 1 ? "y" : "ies"}
                      {selectedDayActivities.length > 1 ? " on this day" : ""}
                    </p>
                    {selectedDayConflictCount > 0 ? (
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {formatConflictSummary(selectedDayConflictCount)}
                      </p>
                    ) : selectedDayActivities.length > 1 ? (
                      <p>No scheduling conflicts</p>
                    ) : null}
                  </div>
                </div>

                {selectedDayActivities.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border-warm px-3 py-4 text-center text-xs text-text-muted-warm">
                    No activities on this day for the selected filters.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayActivities.map((activity) => (
                      <ActivityCalendarItem
                        key={activity.id}
                        activity={activity}
                        conflictingActivities={selectedDayConflicts.get(activity.id) ?? []}
                      />
                    ))}
                  </div>
                )}
              </div>

              {unscheduled.length > 0 ? (
                <div className="space-y-2 border-t border-border-warm pt-3">
                  <h3 className="text-sm font-semibold text-text-warm">
                    No schedule set
                  </h3>
                  <p className="text-xs text-text-muted-warm">
                    These activities could not be placed on the calendar.
                  </p>
                  <div className="space-y-2">
                    {unscheduled.map((activity) => (
                      <ActivityCalendarItem
                        key={activity.id}
                        activity={activity}
                        defaultExpanded
                      />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

type ActivityCalendarNudgeProps = {
  className?: string;
};

export function ActivityCalendarNudge({ className }: ActivityCalendarNudgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("pointer-events-none fixed inset-0 z-40", className)}>
        <div className="pointer-events-auto absolute right-3 bottom-3 sm:right-5 sm:bottom-5">
          <Button
            type="button"
            size="lg"
            className={cn(
              "h-12 gap-2 rounded-full px-4 shadow-lg shadow-primary/20",
              open && "ring-2 ring-primary/30"
            )}
            aria-expanded={open}
            aria-controls="activity-calendar-popout"
            onClick={() => setOpen((current) => !current)}
          >
            <CalendarDays className="size-4" aria-hidden />
            <span className="hidden sm:inline">Calendar</span>
          </Button>
        </div>
      </div>

      <ActivityCalendarPopout open={open} onOpenChange={setOpen} />
    </>
  );
}
