"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import {
  fetchTenantEmbedSettings,
  updateTenantEmbedSettings,
  type TenantEmbedSettings,
} from "@/lib/tenant-settings-api";

export function AllowedEmbedHostsSection({ embedded = false }: { embedded?: boolean }) {
  const { authFetch } = useAuth();
  const { showToast } = useToast();
  const [settings, setSettings] = useState<TenantEmbedSettings | null>(null);
  const [origins, setOrigins] = useState<string[]>([]);
  const [draftOrigin, setDraftOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTenantEmbedSettings(authFetch);
      setSettings(data);
      setOrigins(data.allowedEmbedOrigins);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load embed host settings."
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleAddOrigin() {
    const trimmed = draftOrigin.trim();
    if (!trimmed) {
      return;
    }

    setOrigins((current) => [...current, trimmed]);
    setDraftOrigin("");
  }

  function handleRemoveOrigin(index: number) {
    setOrigins((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateTenantEmbedSettings(authFetch, origins);
      setSettings(updated);
      setOrigins(updated.allowedEmbedOrigins);
      showToast("Allowed embed hosts updated.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save embed host settings."
      );
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    settings !== null &&
    (settings.allowedEmbedOrigins.length !== origins.length ||
      settings.allowedEmbedOrigins.some((origin, index) => origin !== origins[index]));

  return (
    <section className="space-y-4">
      {!embedded ? (
        <div>
          <h2 className="text-section text-text-warm">Allowed embed hosts</h2>
          <p className="mt-1 text-sm text-text-muted-warm">
            Only these origins may iframe your public registration embed. Leave empty to block all
            framing.
          </p>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted-warm">Loading embed hosts…</p>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : settings ? (
        <div className="max-w-xl space-y-4">
          <p className="text-xs text-text-muted-warm">
            Examples: <code className="text-xs">https://www.notion.so</code>,{" "}
            <code className="text-xs">https://club.example.com</code>. Use scheme + host only — no
            paths or wildcards.
          </p>

          <div className="space-y-2">
            <Label htmlFor="embed-origin-draft">Add origin</Label>
            <div className="flex gap-2">
              <Input
                id="embed-origin-draft"
                placeholder="https://club.example.com"
                value={draftOrigin}
                onChange={(event) => setDraftOrigin(event.target.value)}
                disabled={saving}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddOrigin();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddOrigin} disabled={saving}>
                <Plus className="size-4" aria-hidden />
                Add
              </Button>
            </div>
          </div>

          {origins.length > 0 ? (
            <ul className="space-y-2">
              {origins.map((origin, index) => (
                <li
                  key={`${origin}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-border-warm px-3 py-2 text-sm"
                >
                  <span className="truncate">{origin}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${origin}`}
                    onClick={() => handleRemoveOrigin(index)}
                    disabled={saving}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted-warm">
              No embed hosts configured — registration embeds cannot be framed.
            </p>
          )}

          <Button type="button" onClick={() => void handleSave()} disabled={!dirty || saving}>
            {saving ? "Saving…" : "Save embed hosts"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
