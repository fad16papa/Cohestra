"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refresh = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setReady(false);
    setError(null);

    void fetchAllActivities(authFetch)
      .then((activities) => {
        if (cancelled) {
          return;
        }

        setConflictIndex(buildActivityScheduleConflictIndex(activities));
        setError(null);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setConflictIndex(new Map());
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load schedule conflicts."
          );
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
  }, [authFetch, reloadToken]);

  const getConflictsForActivity = useMemo(
    () => (activityId: string) => conflictIndex.get(activityId) ?? [],
    [conflictIndex]
  );

  return {
    ready,
    error,
    refresh,
    conflictIndex,
    getConflictsForActivity,
  };
}
