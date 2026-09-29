"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Sparkles, X } from "lucide-react";

import { BUILDER_PRESENCE_ENTER_CLASS } from "@/lib/builder-motion";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "error" | "success";

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastOptions = {
  variant?: ToastVariant;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
  showErrorToast: (message: string) => void;
  showSuccessToast: (message: string) => void;
  showActionToast: (
    message: string,
    actionLabel: string,
    onAction: () => void,
    options?: { durationMs?: number }
  ) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 6000;
const ACTION_TOAST_DURATION_MS = 12000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const visibleMessagesRef = useRef(new Set<string>());
  const timersRef = useRef(new Map<number, number>());

  const dismissToast = useCallback((id: number) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }

    setToasts((current) => {
      const toast = current.find((item) => item.id === id);
      if (toast) {
        visibleMessagesRef.current.delete(`${toast.variant}:${toast.message}`);
      }

      return current.filter((item) => item.id !== id);
    });
  }, []);

  const pushToast = useCallback(
    (toast: Omit<ToastItem, "id">, durationMs = TOAST_DURATION_MS) => {
      const dedupeKey = `${toast.variant}:${toast.message}`;
      if (!toast.actionLabel && visibleMessagesRef.current.has(dedupeKey)) {
        return;
      }

      if (!toast.actionLabel) {
        visibleMessagesRef.current.add(dedupeKey);
      }

      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [...current, { id, ...toast }]);

      const timer = window.setTimeout(() => {
        dismissToast(id);
      }, durationMs);

      timersRef.current.set(id, timer);
    },
    [dismissToast]
  );

  const showToast = useCallback(
    (message: string, options?: ToastOptions) => {
      pushToast({ message, variant: options?.variant ?? "default" });
    },
    [pushToast]
  );

  const showErrorToast = useCallback(
    (message: string) => {
      pushToast({ message, variant: "error" });
    },
    [pushToast]
  );

  const showSuccessToast = useCallback(
    (message: string) => {
      pushToast({ message, variant: "success" });
    },
    [pushToast]
  );

  const showActionToast = useCallback(
    (
      message: string,
      actionLabel: string,
      onAction: () => void,
      options?: { durationMs?: number }
    ) => {
      pushToast(
        { message, actionLabel, onAction, variant: "default" },
        options?.durationMs ?? ACTION_TOAST_DURATION_MS
      );
    },
    [pushToast]
  );

  const value = useMemo(
    () => ({
      showToast,
      showErrorToast,
      showSuccessToast,
      showActionToast,
    }),
    [showActionToast, showErrorToast, showSuccessToast, showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-50 flex w-full max-w-sm flex-col items-end gap-2 px-4 sm:max-w-md sm:px-0"
      >
        {toasts.map((toast) => {
          const isError = toast.variant === "error";
          const isSuccess = toast.variant === "success";
          const Icon = isError ? AlertCircle : isSuccess ? CheckCircle2 : Sparkles;

          return (
          <div
            key={toast.id}
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
            className={cn(
              BUILDER_PRESENCE_ENTER_CLASS,
              "pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border border-l-4 bg-card/95 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur-md",
              isError && "border-danger/30 border-l-danger bg-surface-danger",
              isSuccess && "border-success/30 border-l-success bg-surface-success",
              !isError &&
                !isSuccess &&
                "border-border-warm border-l-primary"
            )}
          >
            <Icon
              className={cn(
                "mt-0.5 shrink-0",
                isError && "size-5 text-text-danger",
                isSuccess && "size-4 text-text-success",
                !isError && !isSuccess && "size-4 text-primary"
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 leading-snug">
              {isError ? (
                <p className="text-xs font-bold uppercase tracking-wide text-text-danger">
                  Error
                </p>
              ) : isSuccess ? (
                <p className="text-xs font-bold uppercase tracking-wide text-text-success">
                  Success
                </p>
              ) : null}
              <p className={cn((isError || isSuccess) && "mt-1 font-medium", "text-foreground")}>
                {toast.message}
              </p>
            </div>
            {toast.actionLabel && toast.onAction ? (
              <button
                type="button"
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-sm font-medium motion-press",
                  isError
                    ? "text-text-danger hover:bg-danger/10"
                    : "text-primary hover:bg-primary/10"
                )}
                onClick={() => {
                  toast.onAction?.();
                  dismissToast(toast.id);
                }}
              >
                {toast.actionLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="shrink-0 rounded-md p-1 text-text-muted motion-press hover:bg-muted hover:text-foreground"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
