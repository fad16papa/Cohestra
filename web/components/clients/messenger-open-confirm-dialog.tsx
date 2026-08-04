"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  messengerPrerequisites,
  type MessengerChannel,
} from "@/lib/messenger-prerequisites";
import { cn } from "@/lib/utils";

type MessengerOpenConfirmDialogProps = {
  channel: MessengerChannel | null;
  clientPhoneLabel: string | null;
  open: boolean;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function MessengerOpenConfirmDialog({
  channel,
  clientPhoneLabel,
  open,
  busy = false,
  onOpenChange,
  onConfirm,
}: MessengerOpenConfirmDialogProps) {
  if (!channel) {
    return null;
  }

  const copy = messengerPrerequisites[channel];
  const isWhatsApp = channel === "whatsapp";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {copy.intro}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ul className="list-disc space-y-2 pl-5 text-sm text-text-warm">
          {copy.requirements.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {clientPhoneLabel ? (
          <p className="rounded-lg border border-border-warm bg-surface-warm/50 px-3 py-2 text-sm text-text-muted-warm">
            Client chat number:{" "}
            <span className="font-medium tabular-nums text-text-warm">
              {clientPhoneLabel}
            </span>
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={cn(
              isWhatsApp
                ? "bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
                : "bg-viber text-viber-foreground hover:bg-viber/90"
            )}
          >
            {copy.continueLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type MessengerPrerequisitesNoticeProps = {
  className?: string;
};

export function MessengerPrerequisitesNotice({
  className,
}: MessengerPrerequisitesNoticeProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border-warm bg-surface-warm/40 px-3 py-3 text-sm text-text-muted-warm",
        className
      )}
    >
      <p className="font-medium text-text-warm">Operator requirements</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        <li>
          Send from your organisation&apos;s{" "}
          <strong className="font-medium">business mobile number</strong> registered
          in WhatsApp or Viber — Cohestra only opens the chat and logs outreach.
        </li>
        <li>
          <strong className="font-medium">WhatsApp:</strong> use{" "}
          <a
            href="https://web.whatsapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            web.whatsapp.com
          </a>{" "}
          or the mobile app.
        </li>
        <li>
          <strong className="font-medium">Viber:</strong> install the desktop or mobile
          app — browser chat is not supported.
        </li>
      </ul>
    </div>
  );
}
