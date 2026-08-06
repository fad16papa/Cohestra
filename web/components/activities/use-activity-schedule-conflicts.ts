"use client";

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { fetchAllActivities } from "@/lib/activities-api";
import {
  buildActivityScheduleConflictIndex,
  type CalendarActivity,
} from "@/lib/activity-calendar-utils";

export function useActivityScheduleConflicts() {
  const { authFetch } = useAuth();
  const [conflictIndex, setConflictIndex] = useState<
    Map<string, CalendarActivity[]>
  >(new Map());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void fetchAllActivities(authFetch)
      .then((activities) => {
        if (cancelled) {
          return;
        }

        setConflictIndex(buildActivityScheduleConflictIndex(activities));
      })
      .catch(() => {
        if (!cancelled) {
          setConflictIndex(new Map());
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  const getConflictsForActivity = useMemo(
    () => (activityId: string) => conflictIndex.get(activityId) ?? [],
    [conflictIndex]
  );

  return {
    ready,
    conflictIndex,
    getConflictsForActivity,
  };
}
