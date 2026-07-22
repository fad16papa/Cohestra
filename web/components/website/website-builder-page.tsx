"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { SitePageRenderer } from "@/components/marketing/site-page-renderer";
import { PageHeader } from "@/components/shared/page-header";
import { UpgradePanel } from "@/components/shell/upgrade-panel";
import { useTenantShell } from "@/components/shell/tenant-shell-provider";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  WebsitePublishChangeSummary,
  WebsitePublishGateSummary,
  WebsiteSectionList,
  getPublicSiteUrl,
} from "@/components/website/website-section-fields";
import { WebsiteSetupChecklist } from "@/components/website/website-setup-checklist";
import { WebsiteHealthStrip } from "@/components/website/website-health-strip";
import { WebsiteTemplatesPanel } from "@/components/website/website-templates-panel";
import { WebsiteLivePreview } from "@/components/website/website-live-preview";
import { WebsiteSharePreview } from "@/components/website/website-share-preview";
import {
  WebsiteBrandingSection,
  type WebsiteBrandingSectionHandle,
} from "@/components/website/website-branding-section";
import { fetchAllActivities, type Activity } from "@/lib/activities-api";
import { copyTextToClipboard } from "@/lib/clipboard";
import type {
  PublicHomepageActivity,
  SiteSectionsDocument,
} from "@/lib/public-site-api";
import {
  applySavedSiteTemplate,
  applySitePreset,
  createSavedSiteTemplate,
  createSitePreviewToken,
  deleteSavedSiteTemplate,
  fetchPublicUpcomingActivities,
  fetchSiteAdmin,
  publishSite,
  revertPublishedSite,
  saveSiteDraft,
  type SavedSiteTemplate,
  type SitePageAdmin,
} from "@/lib/site-admin-api";
import {
  getBuiltInPresetLabel,
  type SiteBuiltInPresetId,
} from "@/lib/site-templates";
import {
  cloneSiteDocument,
  getPublishGateIssues,
  SECTION_TYPE_LABELS,
  serializeSiteDocument,
  updateSiteDocument,
} from "@/lib/site-draft-utils";
import {
  addSectionToDocument,
  removeSectionFromDocument,
} from "@/lib/site-sections/document-mutations";
import {
  ADDABLE_SECTION_TYPES,
  type AddableSectionType,
} from "@/lib/site-sections/registry";
import { MAX_SECTIONS } from "@/lib/site-sections/limits";
import {
  getPublishChangeSummary,
  getSetupChecklist,
  getSharePreviewFromDraft,
  type SetupChecklistItem,
} from "@/lib/site-builder-utils";
import {
  autoSaveStatusLabel,
  useWebsiteAutoSave,
} from "@/hooks/use-website-auto-save";
import {
  dismissSetupChecklist,
  markWebsiteBuilderVisited,
  readInitialChecklistVisibility,
} from "@/lib/website-builder-preferences";
import { cn } from "@/lib/utils";
import { isBasicPlan } from "@/lib/shell/tenant-shell-api";

type DeviceMode = "phone" | "desktop";

function formatLastSaved(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const onDocumentClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("http")) {
        return;
      }

      if (anchor.closest("[data-site-preview-pane]")) {
        return;
      }

      if (href.startsWith("/dashboard/website")) {
        return;
      }

      const confirmed = window.confirm(
        "You have unsaved changes. Leave without saving?",
      );
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [isDirty]);
}

export function WebsiteBuilderPage() {
  const { authFetch } = useAuth();
  const { shell, loading: shellLoading } = useTenantShell();
  const { showToast, showErrorToast, showSuccessToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adminData, setAdminData] = useState<SitePageAdmin | null>(null);
  const [draft, setDraft] = useState<SiteSectionsDocument | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [publishedActivities, setPublishedActivities] = useState<Activity[]>(
    [],
  );
  const [upcomingActivities, setUpcomingActivities] = useState<
    PublicHomepageActivity[]
  >([]);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(
    null,
  );
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewOpening, setIsPreviewOpening] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [presetToApply, setPresetToApply] =
    useState<SiteBuiltInPresetId | null>(null);
  const [isApplyingPreset, setIsApplyingPreset] = useState(false);
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [templateNameInput, setTemplateNameInput] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [savedTemplateToApply, setSavedTemplateToApply] =
    useState<SavedSiteTemplate | null>(null);
  const [applySavedTemplateDialogOpen, setApplySavedTemplateDialogOpen] =
    useState(false);
  const [isApplyingSavedTemplate, setIsApplyingSavedTemplate] = useState(false);
  const [savedTemplateToDelete, setSavedTemplateToDelete] =
    useState<SavedSiteTemplate | null>(null);
  const [deleteSavedTemplateDialogOpen, setDeleteSavedTemplateDialogOpen] =
    useState(false);
  const [isDeletingSavedTemplate, setIsDeletingSavedTemplate] = useState(false);
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [liveUrl, setLiveUrl] = useState("");
  const [isHeroUploading, setIsHeroUploading] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [sectionToRemove, setSectionToRemove] = useState<string | null>(null);
  const [removeSectionDialogOpen, setRemoveSectionDialogOpen] = useState(false);
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [checklistPrefsReady, setChecklistPrefsReady] = useState(false);
  const brandingSectionRef = useRef<WebsiteBrandingSectionHandle>(null);
  const siteNameSectionRef = useRef<HTMLElement>(null);
  const draftRef = useRef<SiteSectionsDocument | null>(null);
  const saveLockRef = useRef(false);

  const ACCENT_INVALID_MESSAGE =
    "Enter a valid accent color (#RGB or #RRGGBB) before saving.";

  function resolveDraftWithPendingAccent(
    current: SiteSectionsDocument,
  ): SiteSectionsDocument | null {
    return brandingSectionRef.current?.flushPendingAccent(current) ?? current;
  }

  const isDirty = useMemo(() => {
    if (!draft) {
      return false;
    }

    return serializeSiteDocument(draft) !== savedSnapshot;
  }, [draft, savedSnapshot]);

  const draftFingerprint = useMemo(
    () => (draft ? serializeSiteDocument(draft) : ""),
    [draft]
  );

  const canRunAutoSave = useCallback(() => {
    if (!draft || !isDirty) {
      return false;
    }

    if (
      isSaving ||
      isPublishing ||
      isHeroUploading ||
      isLogoUploading ||
      isApplyingPreset ||
      isApplyingSavedTemplate ||
      isSavingTemplate ||
      isDeletingSavedTemplate ||
      isReverting
    ) {
      return false;
    }

    return resolveDraftWithPendingAccent(draft) !== null;
  }, [
    draft,
    isApplyingPreset,
    isApplyingSavedTemplate,
    isDeletingSavedTemplate,
    isDirty,
    isHeroUploading,
    isLogoUploading,
    isPublishing,
    isReverting,
    isSaving,
    isSavingTemplate,
  ]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useUnsavedChangesGuard(isDirty);

  const editorDisabled =
    isSaving ||
    isPublishing ||
    isHeroUploading ||
    isLogoUploading ||
    isApplyingPreset ||
    isApplyingSavedTemplate ||
    isSavingTemplate ||
    isDeletingSavedTemplate ||
    isReverting;

  const templatesRecoveryDisabled = editorDisabled || isDirty;

  useEffect(() => {
    if (isDirty && publishDialogOpen) {
      setPublishDialogOpen(false);
    }
  }, [isDirty, publishDialogOpen]);

  const applyDraftChange = useCallback(
    (
      updater:
        | SiteSectionsDocument
        | ((current: SiteSectionsDocument) => SiteSectionsDocument),
    ) => {
      setDraft((current) => {
        if (!current) {
          return current;
        }

        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [],
  );

  const handleAddSection = useCallback(
    (type: AddableSectionType) => {
      let addedSectionId: string | null = null;
      let errorMessage: string | undefined;

      applyDraftChange((current) => {
        const result = addSectionToDocument(current, type);
        if (result.error) {
          errorMessage = result.error;
          return current;
        }

        addedSectionId =
          result.document.sections[result.document.sections.length - 1]?.id ??
          null;
        return result.document;
      });

      if (errorMessage) {
        showErrorToast(errorMessage);
        return;
      }

      if (addedSectionId) {
        setExpandedSectionId(addedSectionId);
      }

      showToast(`${SECTION_TYPE_LABELS[type] ?? type} section added`);
    },
    [applyDraftChange, showErrorToast, showToast],
  );

  const handleRequestRemoveSection = useCallback((sectionId: string) => {
    setSectionToRemove(sectionId);
    setRemoveSectionDialogOpen(true);
  }, []);

  const handleConfirmRemoveSection = useCallback(() => {
    if (!sectionToRemove) {
      return;
    }

    let errorMessage: string | undefined;

    applyDraftChange((current) => {
      const result = removeSectionFromDocument(current, sectionToRemove);
      if (result.error) {
        errorMessage = result.error;
        return current;
      }

      return result.document;
    });

    if (errorMessage) {
      showErrorToast(errorMessage);
      setRemoveSectionDialogOpen(false);
      setSectionToRemove(null);
      return;
    }

    if (expandedSectionId === sectionToRemove) {
      setExpandedSectionId(null);
    }

    setRemoveSectionDialogOpen(false);
    setSectionToRemove(null);
    showToast("Section removed");
  }, [applyDraftChange, expandedSectionId, sectionToRemove, showErrorToast, showToast]);

  const handleOpenPublishDialog = useCallback(async () => {
    if (isDirty) {
      showErrorToast("Save draft before publishing.");
      return;
    }

    try {
      const activities = await fetchAllActivities(authFetch, {
        status: "published",
      });
      setPublishedActivities(activities);
    } catch {
      // Keep the last loaded activity list if refresh fails.
    }

    setPublishDialogOpen(true);
  }, [authFetch, isDirty, showToast]);

  const loadSite = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const [siteAdmin, activities, upcoming] = await Promise.all([
        fetchSiteAdmin(authFetch),
        fetchAllActivities(authFetch, { status: "published" }),
        fetchPublicUpcomingActivities(),
      ]);

      setAdminData(siteAdmin);
      setDraft(cloneSiteDocument(siteAdmin.draft));
      setSavedSnapshot(serializeSiteDocument(siteAdmin.draft));
      setPublishedActivities(activities);
      setUpcomingActivities(upcoming);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not load website builder.",
      );
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    void loadSite();
  }, [loadSite]);

  useEffect(() => {
    const initial = readInitialChecklistVisibility();
    setChecklistVisible(initial.show);
    setChecklistPrefsReady(true);
  }, []);

  const enabledSectionCount = useMemo(
    () => draft?.sections.filter((section) => section.enabled).length ?? 0,
    [draft]
  );

  const publicSiteUrl = useMemo(() => getPublicSiteUrl(), []);

  const publishGate = useMemo(() => {
    if (!draft) {
      return { blockers: [], warnings: [] };
    }

    return getPublishGateIssues(draft, publishedActivities);
  }, [draft, publishedActivities]);

  const canPublish =
    !!adminData &&
    adminData.hasUnpublishedChanges &&
    !isDirty &&
    !isSaving &&
    !isPublishing &&
    !isHeroUploading &&
    !isLogoUploading;

  const statusLabel = useMemo(() => {
    if (isDirty) {
      return "Unsaved changes";
    }

    if (adminData?.hasUnpublishedChanges) {
      return "Draft saved";
    }

    if (adminData?.published) {
      return "Live";
    }

    return "Draft saved";
  }, [adminData, isDirty]);

  const statusClassName = useMemo(() => {
    if (isDirty) {
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
    }

    if (adminData?.hasUnpublishedChanges) {
      return "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200";
    }

    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200";
  }, [adminData, isDirty]);

  const setupChecklist = useMemo(() => {
    if (!draft) {
      return [];
    }

    return getSetupChecklist(draft, {
      isDraftSaved: !isDirty,
      hasPublished: Boolean(adminData?.published),
      upcomingActivityCount: upcomingActivities.length,
    });
  }, [adminData?.published, draft, isDirty, upcomingActivities.length]);

  const publishChanges = useMemo(() => {
    if (!draft) {
      return [] as string[];
    }

    return getPublishChangeSummary(draft, adminData?.published ?? null);
  }, [adminData?.published, draft]);

  const sharePreview = useMemo(() => {
    if (!draft) {
      return null;
    }

    return getSharePreviewFromDraft(draft, publicSiteUrl);
  }, [draft, publicSiteUrl]);

  async function handleSaveDraft(options?: {
    silent?: boolean;
  }): Promise<boolean> {
    if (!draft || saveLockRef.current) {
      return false;
    }

    if (isHeroUploading || isLogoUploading) {
      if (!options?.silent) {
        showErrorToast("Wait for the image upload to finish.");
      }
      return false;
    }

    const draftToSave = resolveDraftWithPendingAccent(draft);
    if (draftToSave === null) {
      if (!options?.silent) {
        showErrorToast(ACCENT_INVALID_MESSAGE);
      }
      return false;
    }

    const fingerprintAtSaveStart = serializeSiteDocument(draftToSave);

    if (draftToSave !== draft) {
      setDraft(draftToSave);
    }

    saveLockRef.current = true;
    setIsSaving(true);
    try {
      const saved = await saveSiteDraft(authFetch, draftToSave);
      const savedFingerprint = serializeSiteDocument(saved.draft);
      const currentDraft = draftRef.current;
      const currentFingerprint = currentDraft
        ? serializeSiteDocument(currentDraft)
        : fingerprintAtSaveStart;

      setAdminData(saved);

      if (currentFingerprint === fingerprintAtSaveStart) {
        setDraft(cloneSiteDocument(saved.draft));
      }

      setSavedSnapshot(savedFingerprint);

      if (!options?.silent) {
        showSuccessToast("Draft saved");
      }
      return true;
    } catch (error) {
      if (!options?.silent) {
        showErrorToast(
          error instanceof Error ? error.message : "Could not save draft.",
        );
      }
      return false;
    } finally {
      saveLockRef.current = false;
      setIsSaving(false);
    }
  }

  const saveDraftForAutoSave = useCallback(
    (options: { silent: boolean }) => handleSaveDraft(options),
    [authFetch, draft, isHeroUploading, isLogoUploading, showToast]
  );

  const { autoSaveStatus } = useWebsiteAutoSave({
    isDirty,
    draftFingerprint,
    canAutoSave: canRunAutoSave,
    onSave: saveDraftForAutoSave,
    enabled: !loading && Boolean(draft),
  });

  const autoSaveLabel = autoSaveStatusLabel(autoSaveStatus);

  const handleChecklistItemAction = (item: SetupChecklistItem) => {
    if (item.sectionId) {
      setExpandedSectionId(item.sectionId);
      requestAnimationFrame(() => {
        document
          .querySelector(`[data-website-section-id="${item.sectionId}"]`)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    if (item.action === "branding") {
      document
        .getElementById("website-branding-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (item.action === "site-name") {
      siteNameSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      document.getElementById("site-name")?.focus();
      return;
    }

    if (item.id === "save" && isDirty) {
      void handleSaveDraft();
    }
  };

  async function handlePreview() {
    if (!draft) {
      return;
    }

    const draftForPreview = resolveDraftWithPendingAccent(draft);
    if (draftForPreview === null) {
      showErrorToast(ACCENT_INVALID_MESSAGE);
      return;
    }

    if (draftForPreview !== draft) {
      setDraft(draftForPreview);
      showErrorToast("Save draft before opening preview.");
      return;
    }

    if (isDirty) {
      showErrorToast("Save draft before opening preview.");
      return;
    }

    // Must open synchronously on click — after await, popup blockers reject window.open().
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      showErrorToast(
        "Popup blocked. Allow popups for this site and try Preview again.",
      );
      return;
    }

    setIsPreviewOpening(true);
    try {
      const { token } = await createSitePreviewToken(authFetch);
      const url = new URL("/", window.location.origin);
      url.searchParams.set("preview", token);
      previewWindow.location.replace(url.toString());
      previewWindow.focus();
    } catch (error) {
      previewWindow.close();
      showErrorToast(
        error instanceof Error ? error.message : "Could not open preview.",
      );
    } finally {
      setIsPreviewOpening(false);
    }
  }

  async function handlePublish() {
    if (!draft) {
      return;
    }

    if (!canPublish || isDirty) {
      showErrorToast("Save draft before publishing.");
      setPublishDialogOpen(false);
      return;
    }

    if (isHeroUploading || isLogoUploading) {
      showErrorToast("Wait for the image upload to finish.");
      setPublishDialogOpen(false);
      return;
    }

    if (publishGate.blockers.length > 0) {
      return;
    }

    setIsPublishing(true);
    try {
      const published = await publishSite(authFetch);
      setAdminData(published);
      setDraft(cloneSiteDocument(published.draft));
      setSavedSnapshot(serializeSiteDocument(published.draft));
      setLiveUrl(getPublicSiteUrl());
      setPublishDialogOpen(false);
      setSuccessDialogOpen(true);
      markWebsiteBuilderVisited();
      setChecklistVisible(false);
      showSuccessToast("Your site is live");
    } catch (error) {
      showErrorToast(
        error instanceof Error ? error.message : "Could not publish homepage.",
      );
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleApplyPreset() {
    if (!presetToApply) {
      return;
    }

    if (isDirty) {
      showErrorToast("Save draft before applying a homepage preset.");
      setPresetDialogOpen(false);
      return;
    }

    setIsApplyingPreset(true);
    try {
      const saved = await applySitePreset(authFetch, presetToApply);
      setAdminData(saved);
      setDraft(cloneSiteDocument(saved.draft));
      setSavedSnapshot(serializeSiteDocument(saved.draft));
      setPresetDialogOpen(false);
      setPresetToApply(null);
      showToast(
        `${getBuiltInPresetLabel(presetToApply)} preset applied to draft.`,
      );
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not apply homepage preset.",
      );
    } finally {
      setIsApplyingPreset(false);
    }
  }

  async function handleSaveTemplate() {
    const trimmedName = templateNameInput.trim();
    if (trimmedName.length < 2) {
      showErrorToast("Enter a template name with at least 2 characters.");
      return;
    }

    setIsSavingTemplate(true);
    try {
      if (isDirty && draft) {
        const resolvedDraft = resolveDraftWithPendingAccent(draft);
        if (!resolvedDraft) {
          showErrorToast(ACCENT_INVALID_MESSAGE);
          return;
        }

        const latestAdmin = await saveSiteDraft(authFetch, resolvedDraft);
        setAdminData(latestAdmin);
        setDraft(cloneSiteDocument(latestAdmin.draft));
        setSavedSnapshot(serializeSiteDocument(latestAdmin.draft));
      }

      const created = await createSavedSiteTemplate(authFetch, trimmedName);
      setAdminData((current) =>
        current
          ? {
              ...current,
              savedTemplates: [created, ...current.savedTemplates],
            }
          : current,
      );
      setSaveTemplateDialogOpen(false);
      setTemplateNameInput("");
      showToast(`Saved "${created.name}" template.`);
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not save homepage template.",
      );
    } finally {
      setIsSavingTemplate(false);
    }
  }

  async function handleApplySavedTemplate() {
    if (!savedTemplateToApply) {
      return;
    }

    if (isDirty) {
      showErrorToast("Save draft before applying a saved template.");
      setApplySavedTemplateDialogOpen(false);
      return;
    }

    setIsApplyingSavedTemplate(true);
    try {
      const templateName = savedTemplateToApply.name;
      const saved = await applySavedSiteTemplate(
        authFetch,
        savedTemplateToApply.id,
      );
      setAdminData(saved);
      setDraft(cloneSiteDocument(saved.draft));
      setSavedSnapshot(serializeSiteDocument(saved.draft));
      setApplySavedTemplateDialogOpen(false);
      setSavedTemplateToApply(null);
      showToast(`Applied "${templateName}" template to draft.`);
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not apply saved template.",
      );
    } finally {
      setIsApplyingSavedTemplate(false);
    }
  }

  async function handleDeleteSavedTemplate() {
    if (!savedTemplateToDelete) {
      return;
    }

    setIsDeletingSavedTemplate(true);
    try {
      const updated = await deleteSavedSiteTemplate(
        authFetch,
        savedTemplateToDelete.id,
      );
      setAdminData(updated);
      setDeleteSavedTemplateDialogOpen(false);
      setSavedTemplateToDelete(null);
      showToast("Saved template deleted.");
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not delete saved template.",
      );
    } finally {
      setIsDeletingSavedTemplate(false);
    }
  }

  async function handleRevertPublished() {
    if (isDirty) {
      showErrorToast("Save draft before reverting the live homepage.");
      setRevertDialogOpen(false);
      return;
    }

    setIsReverting(true);
    try {
      const reverted = await revertPublishedSite(authFetch);
      setAdminData(reverted);
      setDraft(cloneSiteDocument(reverted.draft));
      setSavedSnapshot(serializeSiteDocument(reverted.draft));
      setRevertDialogOpen(false);
      showToast("Live homepage reverted to the previous version.");
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : "Could not revert published homepage.",
      );
    } finally {
      setIsReverting(false);
    }
  }

  if (shellLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Website Builder" description="Customize your public homepage" />
        <div className="h-96 animate-pulse rounded-xl border border-border-warm bg-muted/30" />
      </div>
    );
  }

  if (shell && isBasicPlan(shell.plan)) {
    return (
      <UpgradePanel
        title="Public site page unlocks on Core"
        description="Basic includes a simple stub listing. Upgrade to Core for a branded fixed homepage at your workspace subdomain."
        requiredPlan="Core"
        isTenantAdmin={shell.isTenantAdmin}
      />
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Website Builder"
          description="Customize your public homepage"
        />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="h-96 animate-pulse rounded-xl border border-border-warm bg-muted/30" />
          <div className="h-96 animate-pulse rounded-xl border border-border-warm bg-muted/30" />
        </div>
      </div>
    );
  }

  if (loadError || !draft || !adminData) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="Website Builder"
          description="Customize your public homepage"
        />
        <p className="text-sm text-destructive">
          {loadError ?? "Site not found."}
        </p>
        <Button type="button" onClick={() => void loadSite()}>
          Try again
        </Button>
      </div>
    );
  }

  const previewPayload = {
    published: draft,
    publishedAt: adminData.publishedAt,
    upcomingActivities,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Builder"
        description="Design and publish your public homepage — changes go live only when you publish."
        actions={
          <>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
                statusClassName,
              )}
            >
              {statusLabel}
            </span>
            {autoSaveLabel ? (
              <span
                className={cn(
                  "self-center text-xs",
                  autoSaveStatus === "error"
                    ? "text-destructive"
                    : "text-text-muted-warm"
                )}
              >
                {autoSaveLabel}
              </span>
            ) : null}
            {adminData.draftUpdatedAt ? (
              <span className="self-center text-xs text-text-muted-warm">
                Last saved {formatLastSaved(adminData.draftUpdatedAt)}
              </span>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={
                isPreviewOpening ||
                isDirty ||
                autoSaveStatus === "pending" ||
                autoSaveStatus === "saving"
              }
              onClick={() => void handlePreview()}
            >
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                !isDirty || isSaving || isHeroUploading || isLogoUploading
              }
              onClick={() => void handleSaveDraft()}
            >
              {isSaving ? "Saving…" : "Save draft"}
            </Button>
            <Button
              type="button"
              disabled={!canPublish || publishGate.blockers.length > 0}
              onClick={() => void handleOpenPublishDialog()}
            >
              Publish homepage
            </Button>
          </>
        }
      />

      <WebsiteHealthStrip
        siteUrl={publicSiteUrl}
        statusLabel={statusLabel}
        statusClassName={statusClassName}
        publishedAt={adminData.publishedAt}
        upcomingActivityCount={upcomingActivities.length}
        enabledSectionCount={enabledSectionCount}
        publishBlockerCount={publishGate.blockers.length}
        checklistHidden={!checklistVisible}
        onCopyLink={() => {
          void copyTextToClipboard(publicSiteUrl).then((copied) => {
            if (copied) {
              showToast("Link copied");
            } else {
              showErrorToast("Could not copy link.");
            }
          });
        }}
        onOpenLive={() => {
          const siteWindow = window.open(publicSiteUrl, "_blank", "noopener,noreferrer");
          if (!siteWindow) {
            showErrorToast("Popup blocked. Allow popups for this site and try again.");
          }
        }}
        onShowChecklist={() => setChecklistVisible(true)}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-6">
          {checklistPrefsReady && checklistVisible ? (
            <WebsiteSetupChecklist
              items={setupChecklist}
              onItemAction={handleChecklistItemAction}
              onDismiss={() => {
                dismissSetupChecklist();
                markWebsiteBuilderVisited();
                setChecklistVisible(false);
              }}
            />
          ) : null}

          <div id="website-branding-section">
            <WebsiteBrandingSection
              ref={brandingSectionRef}
              draft={draft}
              disabled={editorDisabled}
              onDraftChange={applyDraftChange}
              onLogoUploadBusyChange={setIsLogoUploading}
            />
          </div>

          <section
            ref={siteNameSectionRef}
            className="space-y-3 rounded-xl border border-border-warm bg-card p-4 sm:p-5"
          >
            <div>
              <h3 className="text-section text-text-warm">Site name</h3>
              <p className="mt-1 text-sm text-text-muted-warm">
                Shown in the homepage header and browser title after publish.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="site-name">Site name</Label>
              <Input
                id="site-name"
                value={draft.siteName}
                disabled={editorDisabled}
                onChange={(event) =>
                  setDraft((current) =>
                    current
                      ? updateSiteDocument(current, {
                          siteName: event.target.value,
                        })
                      : current,
                  )
                }
              />
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border-warm bg-card p-4 sm:p-5">
            <div>
              <h3 className="text-section text-text-warm">Sections</h3>
              <p className="mt-1 text-sm text-text-muted-warm">
                Enable, reorder, and edit homepage sections.
              </p>
            </div>
            <WebsiteSectionList
              draft={draft}
              expandedSectionId={expandedSectionId}
              highlightedSectionId={expandedSectionId}
              publishedActivities={publishedActivities}
              disabled={editorDisabled}
              onDraftChange={applyDraftChange}
              onExpandedSectionChange={setExpandedSectionId}
              onRemoveSection={handleRequestRemoveSection}
              onHeroUploadBusyChange={setIsHeroUploading}
            />
            <div className="space-y-2 border-t border-border-warm pt-4">
              <p className="text-sm font-medium text-text-warm">Add section</p>
              <div className="flex flex-wrap gap-2">
                {ADDABLE_SECTION_TYPES.map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={editorDisabled}
                    onClick={() => handleAddSection(type)}
                  >
                    + {SECTION_TYPE_LABELS[type] ?? type}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-text-muted-warm">
                Homepage supports up to {MAX_SECTIONS} sections.
              </p>
            </div>
          </section>

          {publishGate.blockers.length > 0 || publishGate.warnings.length > 0 ? (
            <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-5">
              <div>
                <h3 className="text-section text-text-warm">Publish readiness</h3>
                <p className="mt-1 text-sm text-text-muted-warm">
                  Fix these before visitors see your changes.
                </p>
              </div>
              <WebsitePublishGateSummary gate={publishGate} />
            </section>
          ) : null}

          <WebsiteTemplatesPanel
            adminData={adminData}
            draft={draft}
            disabled={editorDisabled}
            recoveryDisabled={templatesRecoveryDisabled}
            formatLastSaved={formatLastSaved}
            onApplyPreset={(presetId) => {
              setPresetToApply(presetId);
              setPresetDialogOpen(true);
            }}
            onSaveTemplate={() => {
              setTemplateNameInput("");
              setSaveTemplateDialogOpen(true);
            }}
            onApplySavedTemplate={(template) => {
              setSavedTemplateToApply(template);
              setApplySavedTemplateDialogOpen(true);
            }}
            onDeleteSavedTemplate={(template) => {
              setSavedTemplateToDelete(template);
              setDeleteSavedTemplateDialogOpen(true);
            }}
            onRevertPublished={() => setRevertDialogOpen(true)}
          />
        </div>

        <WebsiteLivePreview
          deviceMode={deviceMode}
          onDeviceModeChange={setDeviceMode}
        >
          <SitePageRenderer site={previewPayload} isPreview />
        </WebsiteLivePreview>
      </div>

      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish homepage?</AlertDialogTitle>
            <AlertDialogDescription>
              Visitors will see these updates at {getPublicSiteUrl()}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {sharePreview ? <WebsiteSharePreview preview={sharePreview} /> : null}
            <div>
              <p className="text-sm font-medium text-text-warm">What will change</p>
              <div className="mt-2 rounded-lg border border-border-warm bg-muted/20 p-3">
                <WebsitePublishChangeSummary changes={publishChanges} />
              </div>
            </div>
            <WebsitePublishGateSummary gate={publishGate} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPublishing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isPublishing ||
                !canPublish ||
                isDirty ||
                isHeroUploading ||
                isLogoUploading ||
                publishGate.blockers.length > 0
              }
              onClick={() => void handlePublish()}
            >
              {isPublishing
                ? "Publishing…"
                : publishGate.warnings.length > 0
                  ? "Publish anyway"
                  : "Publish homepage"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your site is live</AlertDialogTitle>
            <AlertDialogDescription>
              Your homepage is published at{" "}
              <span className="font-medium text-text-warm">{liveUrl}</span>.
              Share the link or open it in a new tab.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Done</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void copyTextToClipboard(liveUrl).then((copied) => {
                  if (copied) {
                    showToast("Link copied");
                  } else {
                    showErrorToast("Could not copy link.");
                  }
                });
              }}
            >
              <Copy className="size-4" aria-hidden />
              Copy link
            </Button>
            <Button
              type="button"
              onClick={() => {
                const siteWindow = window.open(
                  liveUrl,
                  "_blank",
                  "noopener,noreferrer",
                );
                if (!siteWindow) {
                  showErrorToast(
                    "Popup blocked. Allow popups for this site and try again.",
                  );
                }
              }}
            >
              <ExternalLink className="size-4" aria-hidden />
              Open live site
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={presetDialogOpen}
        onOpenChange={(open) => {
          setPresetDialogOpen(open);
          if (!open) {
            setPresetToApply(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {presetToApply
                ? `Reset draft to ${getBuiltInPresetLabel(presetToApply)} preset?`
                : "Reset draft to preset?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This replaces section layout and copy in your draft. Your site
              name, hero image, and accent are kept. Your logo resets to the
              default platform mark. Publish when you are ready to update the
              live site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplyingPreset}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isApplyingPreset || !presetToApply}
              onClick={() => void handleApplyPreset()}
            >
              {isApplyingPreset ? "Applying…" : "Apply preset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={saveTemplateDialogOpen}
        onOpenChange={(open) => {
          setSaveTemplateDialogOpen(open);
          if (!open) {
            setTemplateNameInput("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save homepage template</AlertDialogTitle>
            <AlertDialogDescription>
              Store your current section layout so you can apply it again later.
              Branding is not included — site name, accent, hero image, and logo
              stay as they are when you apply a saved template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="template-name">Template name</Label>
            <Input
              id="template-name"
              value={templateNameInput}
              maxLength={80}
              disabled={isSavingTemplate}
              placeholder="Summer campaign layout"
              onChange={(event) => setTemplateNameInput(event.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSavingTemplate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSavingTemplate || templateNameInput.trim().length < 2}
              onClick={() => void handleSaveTemplate()}
            >
              {isSavingTemplate ? "Saving…" : "Save template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={applySavedTemplateDialogOpen}
        onOpenChange={(open) => {
          setApplySavedTemplateDialogOpen(open);
          if (!open) {
            setSavedTemplateToApply(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {savedTemplateToApply
                ? `Apply "${savedTemplateToApply.name}" to draft?`
                : "Apply saved template?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This replaces section layout in your draft. Your site name, hero
              image, and accent are kept. Your logo resets to the default
              platform mark. Publish when you are ready to update the live site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplyingSavedTemplate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isApplyingSavedTemplate || !savedTemplateToApply}
              onClick={() => void handleApplySavedTemplate()}
            >
              {isApplyingSavedTemplate ? "Applying…" : "Apply template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteSavedTemplateDialogOpen}
        onOpenChange={(open) => {
          setDeleteSavedTemplateDialogOpen(open);
          if (!open) {
            setSavedTemplateToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {savedTemplateToDelete
                ? `Delete "${savedTemplateToDelete.name}"?`
                : "Delete saved template?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the saved template. Your current draft and live site
              are not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSavedTemplate}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingSavedTemplate || !savedTemplateToDelete}
              onClick={() => void handleDeleteSavedTemplate()}
            >
              {isDeletingSavedTemplate ? "Deleting…" : "Delete template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeSectionDialogOpen}
        onOpenChange={(open) => {
          setRemoveSectionDialogOpen(open);
          if (!open) {
            setSectionToRemove(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove section?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the section from your draft. Save draft to keep the
              change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemoveSection}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert live homepage?</AlertDialogTitle>
            <AlertDialogDescription>
              This restores the previous published version on your public site.
              Your current draft is not changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReverting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isReverting}
              onClick={() => void handleRevertPublished()}
            >
              {isReverting ? "Reverting…" : "Revert live site"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
