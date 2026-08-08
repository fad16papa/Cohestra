"use client";

import { MessageCircle } from "lucide-react";

import { ClientLeadStatusControl } from "@/components/clients/client-lead-status-control";
import { ClientMessengerOutreach } from "@/components/clients/client-messenger-outreach";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-provider";
import {
  updateClientLeadStatus,
  type ClientDetail,
} from "@/lib/clients-api";
import { cn } from "@/lib/utils";

type ClientOutreachBarProps = {
  client: ClientDetail;
  onUpdated: (client: ClientDetail) => void;
  className?: string;
};

export function ClientOutreachBar({
  client,
  onUpdated,
  className,
}: ClientOutreachBarProps) {
  const { authFetch } = useAuth();
  const { showToast, showActionToast } = useToast();
  const showMarkContacted = client.leadStatus === "new";

  async function handleMarkContacted() {
    const previousStatus = client.leadStatus;
    try {
      const updated = await updateClientLeadStatus(authFetch, client.id, "contacted");
      onUpdated(updated);
      showActionToast(
        `${client.fullName} marked as contacted`,
        "Undo",
        () => {
          void updateClientLeadStatus(authFetch, client.id, previousStatus)
            .then(onUpdated)
            .catch(() => showToast("Could not undo status change."));
        }
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update lead status."
      );
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <section className="sticky top-4 z-10 rounded-2xl border border-border-warm bg-card/95 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <ClientLeadStatusControl
              clientId={client.id}
              leadStatus={client.leadStatus}
              onUpdated={onUpdated}
            />
          </div>
          {showMarkContacted ? (
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              onClick={() => void handleMarkContacted()}
            >
              <MessageCircle className="size-4" aria-hidden />
              Mark contacted
            </Button>
          ) : null}
        </div>
      </section>

      <ClientMessengerOutreach client={client} onUpdated={onUpdated} />
    </div>
  );
}
