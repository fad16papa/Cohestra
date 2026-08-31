"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  fetchFormTemplates,
  type SavedFormTemplateSummary,
} from "@/lib/form-templates-api";
import {
  setCommunityDefaultFormTemplate,
  type CommunityDetail,
} from "@/lib/communities-api";
import { isCoreOrAbove } from "@/lib/shell/tenant-shell-api";

type CommunityDefaultFormTemplatePanelProps = {
  community: CommunityDetail;
  onCommunityUpdated: (community: CommunityDetail) => void;
};

export function CommunityDefaultFormTemplatePanel({
  community,
  onCommunityUpdated,
}: CommunityDefaultFormTemplatePanelProps) {
  const { authFetch } = useAuth();
  const { shell } = useTenantShell();
  const plan = shell?.plan ?? "Basic";
  const canSetDefault = isCoreOrAbove(plan);

  const [templates, setTemplates] = useState<SavedFormTemplateSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    community.defaultFormTemplateId ?? ""
  );
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTemplateId(community.defaultFormTemplateId ?? "");
  }, [community.defaultFormTemplateId, community.id]);

  useEffect(() => {
    if (!canSetDefault) {
      setLoadingTemplates(false);
      return;
    }

    let cancelled = false;
    setLoadingTemplates(true);

    void fetchFormTemplates(authFetch)
      .then((result) => {
        if (!cancelled) {
          setTemplates(result.templates);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load saved templates."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingTemplates(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authFetch, canSetDefault]);

  const isDirty =
    (selectedTemplateId || "") !== (community.defaultFormTemplateId ?? "");

  async function handleSave() {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    try {
      const updated = await setCommunityDefaultFormTemplate(
        authFetch,
        community.id,
        selectedTemplateId.trim() ? selectedTemplateId : null
      );
      onCommunityUpdated(updated);
      setSavedMessage("Default form template saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not save default form template."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClearDefault() {
    setError(null);
    setSavedMessage(null);
    setIsSaving(true);

    try {
      const updated = await setCommunityDefaultFormTemplate(
        authFetch,
        community.id,
        null
      );
      onCommunityUpdated(updated);
      setSelectedTemplateId("");
      setSavedMessage("Default form template cleared.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not clear default form template."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border-warm bg-card p-4">
      <div>
        <h3 className="text-section text-text-warm">Default form template</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          New activities in this community start with this form recipe.
        </p>
      </div>

      {!canSetDefault ? (
        community.defaultFormTemplateId ? (
          <div className="space-y-3">
            <p className="text-sm text-text-muted-warm">
              Current default:{" "}
              {community.defaultFormTemplateName ?? "Saved template"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => void handleClearDefault()}
            >
              {isSaving ? "Clearing…" : "Clear default"}
            </Button>
            <UpgradePanel
              title="Community default template"
              description="Core saves form recipes and can set a default for every new activity in a community."
              requiredPlan="Core"
              isTenantAdmin={shell?.isTenantAdmin ?? false}
            />
          </div>
        ) : (
          <UpgradePanel
            title="Community default template"
            description="Core saves form recipes and can set a default for every new activity in a community."
            requiredPlan="Core"
            isTenantAdmin={shell?.isTenantAdmin ?? false}
          />
        )
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="community-default-form-template">Saved template</Label>
            <select
              id="community-default-form-template"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
              value={selectedTemplateId}
              disabled={loadingTemplates || isSaving}
              onChange={(event) => setSelectedTemplateId(event.target.value)}
            >
              <option value="">None — blank form on create</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {community.defaultFormTemplateName && !isDirty ? (
              <p className="text-xs text-text-muted-warm">
                Current default: {community.defaultFormTemplateName}
              </p>
            ) : null}
            {loadingTemplates ? (
              <p className="text-xs text-text-muted-warm">Loading templates…</p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || isSaving || loadingTemplates}
              onClick={() => void handleSave()}
            >
              {isSaving ? "Saving…" : "Save default"}
            </Button>
          </div>
        </>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {savedMessage ? (
        <p role="status" className="text-sm text-text-muted-warm">
          {savedMessage}
        </p>
      ) : null}
    </section>
  );
}
