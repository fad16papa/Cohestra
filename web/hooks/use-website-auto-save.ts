"use client";

import { useEffect, useRef, useState } from "react";

export type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const AUTO_SAVE_DELAY_MS = 2000;
const SAVED_INDICATOR_MS = 3000;

type UseWebsiteAutoSaveOptions = {
  isDirty: boolean;
  draftFingerprint: string;
  canAutoSave: () => boolean;
  onSave: (options: { silent: boolean }) => Promise<boolean>;
  enabled?: boolean;
};

export function useWebsiteAutoSave({
  isDirty,
  draftFingerprint,
  canAutoSave,
  onSave,
  enabled = true,
}: UseWebsiteAutoSaveOptions) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const saveGenerationRef = useRef(0);
  const onSaveRef = useRef(onSave);
  const canAutoSaveRef = useRef(canAutoSave);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    canAutoSaveRef.current = canAutoSave;
  }, [canAutoSave]);

  useEffect(() => {
    if (!enabled || !isDirty) {
      if (!isDirty && status !== "saving") {
        setStatus("idle");
      }
      return;
    }

    if (!canAutoSaveRef.current()) {
      setStatus("idle");
      return;
    }

    setStatus("pending");
    const generation = ++saveGenerationRef.current;

    const timer = window.setTimeout(() => {
      if (generation !== saveGenerationRef.current) {
        return;
      }

      if (!canAutoSaveRef.current()) {
        setStatus("idle");
        return;
      }

      setStatus("saving");
      void onSaveRef
        .current({ silent: true })
        .then((saved) => {
          if (generation !== saveGenerationRef.current) {
            return;
          }

          setStatus(saved ? "saved" : "error");
        })
        .catch(() => {
          if (generation !== saveGenerationRef.current) {
            return;
          }

          setStatus("error");
        });
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftFingerprint, enabled, isDirty]);

  useEffect(() => {
    if (status !== "saved") {
      return;
    }

    const timer = window.setTimeout(() => {
      setStatus("idle");
    }, SAVED_INDICATOR_MS);

    return () => window.clearTimeout(timer);
  }, [status]);

  return { autoSaveStatus: status };
}

export function autoSaveStatusLabel(status: AutoSaveStatus): string | null {
  switch (status) {
    case "pending":
      return "Saving soon…";
    case "saving":
      return "Auto-saving…";
    case "saved":
      return "All changes saved";
    case "error":
      return "Auto-save failed — use Save draft";
    default:
      return null;
  }
}
