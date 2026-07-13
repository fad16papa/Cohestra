"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import {
  checklistStatusLabel,
  fetchEmailDeliveryStatus,
  type EmailDeliveryChecklistItem,
  type EmailDeliveryStatus,
} from "@/lib/email-delivery-api";
import { cn } from "@/lib/utils";

type EmailDeliveryChecklistProps = {
  variant?: "banner" | "panel";
  showWhenReady?: boolean;
};

function statusIcon(status: EmailDeliveryChecklistItem["status"]): string {
  switch (status) {
    case "complete":
      return "✓";
    case "action_required":
      return "!";
    case "warning":
      return "⚠";
    case "info":
      return "i";
    default:
      return "•";
  }
}

function ChecklistItems({ items }: { items: EmailDeliveryChecklistItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="space-y-1">
          <div className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                item.status === "complete" && "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100",
                item.status === "action_required" && "bg-destructive/10 text-destructive",
                item.status === "warning" && "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
                item.status === "info" && "bg-muted text-text-muted-warm"
              )}
            >
              {statusIcon(item.status)}
            </span>
            <div className="min-w-0 space-y-1">
              <p className="font-medium text-text-warm">
                {item.title}
                <span className="sr-only"> — {checklistStatusLabel(item.status)}</span>
              </p>
              <p className="text-sm text-text-muted-warm">{item.detail}</p>
              {item.actionHint ? (
                <p className="text-sm text-text-warm">{item.actionHint}</p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function EmailDeliveryChecklist({
  variant = "banner",
  showWhenReady = false,
}: EmailDeliveryChecklistProps) {
  const { authFetch } = useAuth();
  const [status, setStatus] = useState<EmailDeliveryStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void fetchEmailDeliveryStatus(authFetch)
      .then((result) => {
        if (!cancelled) {
          setStatus(result);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setStatus(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load email delivery status."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error}
      </p>
    );
  }

  if (!status) {
    return (
      <p className="text-sm text-text-muted-warm">Checking email delivery setup…</p>
    );
  }

  if (status.isReady && !showWhenReady) {
    return null;
  }

  if (variant === "panel") {
    return (
      <section className="space-y-4">
        <div>
          <h2 className="text-section text-text-warm">Email delivery</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            SendGrid setup for campaign delivery. Secrets stay on the server — only
            checklist status is shown here.
          </p>
        </div>

        {status.isReady ? (
          <p
            role="status"
            className="rounded-lg border border-emerald-200/80 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100"
          >
            Email delivery is ready. Campaigns send from {status.fromEmail}
            {status.fromName ? ` (${status.fromName})` : ""}.
          </p>
        ) : (
          <p
            role="status"
            className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
          >
            Email delivery is not fully configured yet. Complete the checklist below
            before expecting campaigns to reach inboxes.
          </p>
        )}

        <ChecklistItems items={status.checklist} />
      </section>
    );
  }

  return (
    <div
      role="status"
      className="rounded-lg border border-amber-200/80 bg-amber-50 px-4 py-4 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <p className="font-medium">Email delivery needs attention</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        Campaigns may not reach inboxes until SendGrid is configured and verified.
        Sending from {status.fromEmail || "an unconfigured address"}.
      </p>
      <div className="mt-4 text-text-warm">
        <ChecklistItems items={status.checklist.filter((item) => item.status !== "complete")} />
      </div>
    </div>
  );
}
