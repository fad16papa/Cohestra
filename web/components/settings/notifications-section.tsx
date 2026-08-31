"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  fetchTenantNotificationSettings,
  updateTenantNotificationSettings,
  type TenantNotificationSettings,
} from "@/lib/tenant-settings-api";

export function NotificationsSection({ embedded = false }: { embedded?: boolean }) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<TenantNotificationSettings | null>(null);
  const [emailOnNewRegistration, setEmailOnNewRegistration] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTenantNotificationSettings(authFetch);
      setSettings(data);
      setEmailOnNewRegistration(data.emailOnNewRegistration);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load notification settings."
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
      const updated = await updateTenantNotificationSettings(authFetch, emailOnNewRegistration);
      setSettings(updated);
      setEmailOnNewRegistration(updated.emailOnNewRegistration);
      showToast("Notification settings updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save notification settings."
      );
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    settings !== null && emailOnNewRegistration !== settings.emailOnNewRegistration;

  return (
    <section className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-section text-text-warm">Notifications</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Control operator email alerts from public registration and website contact forms.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted-warm">Loading notifications…</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : settings ? (
        <div className="max-w-md space-y-4">
          <div className="flex items-start gap-3">
            <input
              id="email-on-new-registration"
              type="checkbox"
              checked={emailOnNewRegistration}
              disabled={saving}
              onChange={(event) => setEmailOnNewRegistration(event.target.checked)}
              className="mt-1 size-4 shrink-0 rounded-sm border-border-warm text-primary focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <div className="space-y-1">
              <Label htmlFor="email-on-new-registration" className="cursor-pointer font-medium">
                Email me on new public form submissions
              </Label>
              <p className="text-sm text-text-muted-warm">
                Sends an email to your workspace admin contact when someone submits a public
                registration or a website contact message. Participant confirmation emails are
                separate.
              </p>
            </div>
          </div>

          {settings.adminContactEmail ? (
            <p className="text-xs text-text-muted-warm">
              Notifications go to{" "}
              <span className="font-medium text-text-warm">{settings.adminContactEmail}</span>.
            </p>
          ) : (
            <p className="text-xs text-destructive" role="alert">
              Add an admin contact email in billing or workspace settings to receive notifications.
            </p>
          )}

          <Button type="button" onClick={() => void handleSave()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save notifications"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
