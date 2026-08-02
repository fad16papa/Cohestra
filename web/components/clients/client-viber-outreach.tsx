"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { clientProfileCardClassName } from "@/components/clients/client-profile-motion";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { recordViberInitiated, type ClientDetail } from "@/lib/clients-api";
import {
  buildViberChatUrl,
  formatPhoneDisplay,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ClientViberOutreachProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
};

export function ClientViberOutreach({
  client,
  onUpdated,
}: ClientViberOutreachProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const viberChatUrl = buildViberChatUrl(client.phone);
  const phoneLabel = formatPhoneDisplay(client.phone)?.display ?? null;

  async function handleOpenViber() {
    if (!viberChatUrl) {
      showToast("This client has no phone number on file.");
      return;
    }

    setBusy(true);
    try {
      const updated = await recordViberInitiated(authFetch, client.id);
      onUpdated(updated);
      window.open(viberChatUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not log Viber initiation."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border-warm bg-card p-4",
        clientProfileCardClassName
      )}
    >
      <div>
        <h3 className="text-sm font-semibold text-text-warm">Viber outreach</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Open Viber with this client&apos;s number. Follow-up status recording
          arrives in a later update.
        </p>
      </div>

      <Button
        type="button"
        disabled={!viberChatUrl || busy}
        onClick={() => void handleOpenViber()}
        className="w-full bg-viber text-viber-foreground hover:bg-viber/90 sm:w-auto"
      >
        Open Viber
      </Button>
      {phoneLabel ? (
        <p className="text-xs text-text-muted-warm">
          Opens chat for{" "}
          <span className="font-medium tabular-nums text-text-warm">
            {phoneLabel}
          </span>
        </p>
      ) : (
        <p className="text-xs text-text-muted-warm">
          Add a phone number to enable Viber outreach.
        </p>
      )}
    </div>
  );
}
