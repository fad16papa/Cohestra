"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  fetchTenantRegistrationTimeZone,
  updateTenantRegistrationTimeZone,
  type TenantRegistrationTimeZone,
} from "@/lib/tenant-settings-api";

export function OrganizationTimezoneSection({ embedded = false }: { embedded?: boolean }) {
  const { authFetch } = useAuth();
  const { refreshShell } = useTenantShell();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<TenantRegistrationTimeZone | null>(null);
  const [selectedId, setSelectedId] = useState("UTC");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTenantRegistrationTimeZone(authFetch);
      setSettings(data);
      setSelectedId(data.registrationTimeZoneId);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load organization timezone."
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTenantRegistrationTimeZone(authFetch, selectedId);
      setSettings(updated);
      setSelectedId(updated.registrationTimeZoneId);
      await refreshShell();
      showToast("Registration month timezone updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save timezone."
      );
    } finally {
      setSaving(false);
    }
  }

  const dirty = settings !== null && selectedId !== settings.registrationTimeZoneId;

  return (
    <section className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-section text-text-warm">Registration month timezone</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Monthly registration limits reset at midnight on the 1st in this timezone.
            Used for plan headroom and public registration caps.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted-warm">Loading timezone…</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : settings ? (
        <div className="space-y-3 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="registration-timezone">Organization timezone</Label>
            <select
              id="registration-timezone"
              className="w-full rounded-md border border-border-warm bg-background px-3 py-2 text-sm"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={saving}
            >
              {settings.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label} ({option.id})
                </option>
              ))}
            </select>
          </div>
          {settings.registrationMonthResetsAt ? (
            <p className="text-xs text-text-muted-warm">
              Current month resets{" "}
              {new Date(settings.registrationMonthResetsAt).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              (your browser local display).
            </p>
          ) : null}
          <Button type="button" onClick={() => void handleSave()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save timezone"}
          </Button>
          <p className="text-xs text-text-muted-warm">
            Changing timezone recalculates this month&apos;s registration count immediately.
          </p>
        </div>
      ) : null}
    </section>
  );
}
