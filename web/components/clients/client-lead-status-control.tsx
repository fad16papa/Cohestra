"use client";

import { useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  leadStatusLabels,
  leadStatusOptions,
  updateClientLeadStatus,
  type ClientDetail,
  type LeadStatus,
} from "@/lib/clients-api";

type ClientLeadStatusControlProps = {
  clientId: string;
  leadStatus: LeadStatus;
  onUpdated: (client: ClientDetail) => void;
};

export function ClientLeadStatusControl({
  clientId,
  leadStatus,
  onUpdated,
}: ClientLeadStatusControlProps) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  async function handleChange(nextStatus: LeadStatus) {
    if (nextStatus === leadStatus) {
      return;
    }

    setIsSaving(true);

    try {
      const updatedClient = await updateClientLeadStatus(
        authFetch,
        clientId,
        nextStatus
      );
      onUpdated(updatedClient);
      showToast(`Lead status updated to ${leadStatusLabels[nextStatus]}.`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not update lead status."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <Label htmlFor="client-lead-status">Lead status</Label>
      <select
        id="client-lead-status"
        value={leadStatus}
        disabled={isSaving}
        onChange={(event) => {
          void handleChange(event.target.value as LeadStatus);
        }}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
      >
        {leadStatusOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
