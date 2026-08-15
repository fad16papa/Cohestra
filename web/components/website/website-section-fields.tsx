"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  HelpCircle,
  ImageIcon,
  LayoutGrid,
  Layers,
  Megaphone,
  MessageSquareQuote,
  PlayCircle,
  Sparkles,
  Trash2,
  CalendarDays,
  BarChart3,
  Footprints,
} from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/activities-api";
import { resolvePublicSiteUrl } from "@/lib/tenant-public-url";
import { uploadBrandingAsset } from "@/lib/campaigns-api";
import type { SiteSection, SiteSectionsDocument } from "@/lib/public-site-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import {
  SECTION_TYPE_LABELS,
  reorderSections,
  updateSectionProps,
  type PublishGateResult,
} from "@/lib/site-draft-utils";
import { getSectionSummary } from "@/lib/site-builder-utils";
import { isProtectedFromRemoval } from "@/lib/site-sections/registry";
import { cn } from "@/lib/utils";
import { MarketingSectionFields } from "@/components/website/marketing-section-fields";
import {
  buildCtaTargetOptions,
  readCta,
} from "@/components/website/shared/builder-field-utils";
import { CtaEditor } from "@/components/website/shared/cta-editor";
import { BuilderItemsScrollArea } from "@/components/website/shared/builder-items-scroll-area";
import { ListItemsEditor } from "@/components/website/shared/list-items-editor";

const HIGHLIGHT_ICON_OPTIONS = [
  { value: "calendar", label: "Calendar — discover & events" },
  { value: "qr-code", label: "QR code — scan & register" },
  { value: "users", label: "People — stay informed" },
] as const;

const filterSelectClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const textareaClassName =
  "flex min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const SECTION_TYPE_ICONS: Record<string, typeof Sparkles> = {
  hero: Sparkles,
  carousel: ImageIcon,
  testimonials: MessageSquareQuote,
  faq: HelpCircle,
  stats: BarChart3,
  ctaband: Megaphone,
  video: PlayCircle,
  highlights: LayoutGrid,
  howitworks: Footprints,
  upcomingactivities: CalendarDays,
  footer: Layers,
};

function SectionTypeIcon({ type }: { type: string }) {
  const Icon = SECTION_TYPE_ICONS[type.toLowerCase()] ?? Layers;
  return <Icon className="size-4 shrink-0 text-primary" aria-hidden />;
}

function campaignAssetPath(assetId: string): string {
  return `/api/v1/public/campaign-assets/${assetId}`;
}

type WebsiteSectionFieldsProps = {
  draft: SiteSectionsDocument;
  section: SiteSection;
  publishedActivities: Activity[];
  disabled?: boolean;
  onDraftChange: (
    updater:
      | SiteSectionsDocument
      | ((current: SiteSectionsDocument) => SiteSectionsDocument)
  ) => void;
  onHeroUploadBusyChange?: (busy: boolean) => void;
};

export function WebsiteSectionFields({
  draft: _draft,
  section,
  publishedActivities,
  disabled = false,
  onDraftChange,
  onHeroUploadBusyChange,
}: WebsiteSectionFieldsProps) {
  const { authFetch } = useAuth();
  const { showToast, showErrorToast } = useToast();
  const heroUploadSeqRef = useRef(0);
  const onHeroUploadBusyChangeRef = useRef(onHeroUploadBusyChange);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const ctaOptions = buildCtaTargetOptions(publishedActivities);
  const type = section.type.toLowerCase();

  useEffect(() => {
    onHeroUploadBusyChangeRef.current = onHeroUploadBusyChange;
  }, [onHeroUploadBusyChange]);

  useEffect(() => {
    onHeroUploadBusyChange?.(isUploadingHero);
  }, [isUploadingHero, onHeroUploadBusyChange]);

  function patchProps(propsPatch: Record<string, unknown>) {
    onDraftChange((current) => updateSectionProps(current, section.id, propsPatch));
  }

  const marketingTypes = new Set([
    "carousel",
    "testimonials",
    "faq",
    "stats",
    "ctaband",
    "video",
  ]);

  if (marketingTypes.has(type)) {
    return (
      <MarketingSectionFields
        section={section}
        publishedActivities={publishedActivities}
        disabled={disabled}
        patchProps={patchProps}
      />
    );
  }

  function patchCta(key: "primaryCta" | "secondaryCta", label: string, target: string) {
    patchProps({
      [key]: { label, target },
    });
  }

  if (type === "hero") {
    const primaryCta = readCta(section.props, "primaryCta");
    const secondaryCta = readCta(section.props, "secondaryCta");
    const heroImageAssetId =
      typeof section.props.heroImageAssetId === "string"
        ? section.props.heroImageAssetId
        : "";
    const heroPreviewUrl = heroImageAssetId
      ? resolveHeroImageUrl(campaignAssetPath(heroImageAssetId))
      : null;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-eyebrow`}>Eyebrow</Label>
          <Input
            id={`${section.id}-eyebrow`}
            value={typeof section.props.eyebrow === "string" ? section.props.eyebrow : ""}
            disabled={disabled}
            onChange={(event) => patchProps({ eyebrow: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-headline`}>Headline</Label>
          <Input
            id={`${section.id}-headline`}
            value={typeof section.props.headline === "string" ? section.props.headline : ""}
            disabled={disabled}
            onChange={(event) => patchProps({ headline: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-description`}>Description</Label>
          <textarea
            id={`${section.id}-description`}
            className={textareaClassName}
            value={
              typeof section.props.description === "string" ? section.props.description : ""
            }
            disabled={disabled}
            onChange={(event) => patchProps({ description: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Hero image</Label>
          {heroPreviewUrl ? (
            <ResponsiveBannerImage
              src={heroPreviewUrl}
              variant="preview"
              className="overflow-hidden rounded-lg border border-border-warm bg-muted/20"
            />
          ) : (
            <div className="flex min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-border-warm bg-muted/20 px-4 text-center text-sm text-text-muted-warm">
              No hero image yet
            </div>
          )}
          <p className="text-xs text-text-muted-warm">
            Wide landscape images work best for full-screen hero impact. WebP or
            JPEG under 300 KB recommended.
          </p>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            id={`${section.id}-hero-upload`}
            disabled={disabled || isUploadingHero}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file || disabled || isUploadingHero) {
                return;
              }

              const uploadSeq = ++heroUploadSeqRef.current;
              setIsUploadingHero(true);

              void uploadBrandingAsset(authFetch, file, "Site hero image")
                .then((asset) => {
                  if (uploadSeq !== heroUploadSeqRef.current) {
                    return;
                  }

                  patchProps({ heroImageAssetId: asset.id });
                })
                .catch((error) => {
                  if (uploadSeq !== heroUploadSeqRef.current) {
                    return;
                  }

                  showErrorToast(
                    error instanceof Error
                      ? error.message
                      : "Could not upload hero image."
                  );
                })
                .finally(() => {
                  if (uploadSeq !== heroUploadSeqRef.current) {
                    return;
                  }

                  setIsUploadingHero(false);
                  onHeroUploadBusyChangeRef.current?.(false);
                });
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploadingHero}
            onClick={() => document.getElementById(`${section.id}-hero-upload`)?.click()}
          >
            {isUploadingHero
              ? "Uploading…"
              : heroPreviewUrl
                ? "Replace image"
                : "Upload image"}
          </Button>
        </div>
        <CtaEditor
          idPrefix={`${section.id}-primary`}
          label="Primary CTA"
          cta={primaryCta}
          options={ctaOptions}
          disabled={disabled}
          onChange={(label, target) => patchCta("primaryCta", label, target)}
        />
        <CtaEditor
          idPrefix={`${section.id}-secondary`}
          label="Secondary CTA"
          cta={secondaryCta}
          options={ctaOptions}
          disabled={disabled}
          onChange={(label, target) => patchCta("secondaryCta", label, target)}
        />
      </div>
    );
  }

  if (type === "highlights") {
    const rawItems = Array.isArray(section.props.items) ? section.props.items : [];
    const items = rawItems.map((item, index) => {
      if (typeof item !== "object" || item === null) {
        return {
          title: "",
          description: "",
          icon: "calendar",
          _key: `highlight-${index}`,
        };
      }

      const record = item as Record<string, unknown>;
      return {
        title: typeof record.title === "string" ? record.title : "",
        description: typeof record.description === "string" ? record.description : "",
        icon:
          typeof record.icon === "string" &&
          HIGHLIGHT_ICON_OPTIONS.some((option) => option.value === record.icon)
            ? record.icon
            : "calendar",
        _key:
          typeof record._key === "string" && record._key.length > 0
            ? record._key
            : `highlight-${index}`,
      };
    });

    return (
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-text-muted-warm">
          Icon cards shown in a row directly under your hero image — for example
          &ldquo;Scan &amp; register&rdquo; and &ldquo;Stay informed&rdquo;.
        </p>
        <ListItemsEditor
          items={items}
          disabled={disabled}
          itemLabel={(index) => `Card ${index + 1}`}
          createItem={() => ({
            title: "",
            description: "",
            icon: "calendar",
            _key: `highlight-${Date.now().toString(36)}`,
          })}
          onChange={(nextItems) => patchProps({ items: nextItems })}
          renderItem={(item, _index, patch) => (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${section.id}-highlight-icon-${item._key}`}>Icon</Label>
                <select
                  id={`${section.id}-highlight-icon-${item._key}`}
                  className={filterSelectClassName}
                  value={item.icon}
                  disabled={disabled}
                  onChange={(event) => patch({ icon: event.target.value })}
                >
                  {HIGHLIGHT_ICON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${section.id}-highlight-title-${item._key}`}>Title</Label>
                <Input
                  id={`${section.id}-highlight-title-${item._key}`}
                  value={item.title}
                  disabled={disabled}
                  placeholder="Scan & register"
                  onChange={(event) => patch({ title: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${section.id}-highlight-description-${item._key}`}>
                  Description
                </Label>
                <textarea
                  id={`${section.id}-highlight-description-${item._key}`}
                  className={textareaClassName}
                  value={item.description}
                  disabled={disabled}
                  placeholder="QR codes on posters link straight to mobile-friendly forms."
                  onChange={(event) => patch({ description: event.target.value })}
                />
              </div>
            </>
          )}
        />
      </div>
    );
  }

  if (type === "upcomingactivities") {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-title`}>Section title</Label>
          <Input
            id={`${section.id}-title`}
            value={typeof section.props.title === "string" ? section.props.title : ""}
            disabled={disabled}
            onChange={(event) => patchProps({ title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-empty-message`}>Empty message</Label>
          <Input
            id={`${section.id}-empty-message`}
            value={
              typeof section.props.emptyMessage === "string"
                ? section.props.emptyMessage
                : ""
            }
            disabled={disabled}
            onChange={(event) => patchProps({ emptyMessage: event.target.value })}
          />
        </div>
      </div>
    );
  }

  if (type === "howitworks") {
    const steps = Array.isArray(section.props.steps) ? section.props.steps : [];

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-title`}>Section title</Label>
          <Input
            id={`${section.id}-title`}
            value={typeof section.props.title === "string" ? section.props.title : ""}
            disabled={disabled}
            onChange={(event) => patchProps({ title: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${section.id}-description`}>Description</Label>
          <textarea
            id={`${section.id}-description`}
            className={textareaClassName}
            value={
              typeof section.props.description === "string" ? section.props.description : ""
            }
            disabled={disabled}
            onChange={(event) => patchProps({ description: event.target.value })}
          />
        </div>
        <BuilderItemsScrollArea>
        {steps.map((step, index) => {
          if (typeof step !== "object" || step === null) {
            return null;
          }

          const record = step as Record<string, unknown>;
          return (
            <div
              key={`${section.id}-step-${index}`}
              className="space-y-3 rounded-lg border border-border-warm p-3"
            >
              <p className="text-sm font-medium text-text-warm">Step {index + 1}</p>
              <div className="space-y-2">
                <Label htmlFor={`${section.id}-step-title-${index}`}>Title</Label>
                <Input
                  id={`${section.id}-step-title-${index}`}
                  value={typeof record.title === "string" ? record.title : ""}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextSteps = steps.map((entry, entryIndex) => {
                      if (entryIndex !== index || typeof entry !== "object" || entry === null) {
                        return entry;
                      }

                      return {
                        ...(entry as Record<string, unknown>),
                        title: event.target.value,
                      };
                    });
                    patchProps({ steps: nextSteps });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${section.id}-step-description-${index}`}>
                  Description
                </Label>
                <textarea
                  id={`${section.id}-step-description-${index}`}
                  className={textareaClassName}
                  value={typeof record.description === "string" ? record.description : ""}
                  disabled={disabled}
                  onChange={(event) => {
                    const nextSteps = steps.map((entry, entryIndex) => {
                      if (entryIndex !== index || typeof entry !== "object" || entry === null) {
                        return entry;
                      }

                      return {
                        ...(entry as Record<string, unknown>),
                        description: event.target.value,
                      };
                    });
                    patchProps({ steps: nextSteps });
                  }}
                />
              </div>
            </div>
          );
        })}
        </BuilderItemsScrollArea>
      </div>
    );
  }

  if (type === "footer") {
    return (
      <p className="text-sm text-text-muted-warm">
        Footer shows &ldquo;Cohestra&rdquo; by default. This label is not
        editable in v1.
      </p>
    );
  }

  return (
    <p className="text-sm text-text-muted-warm">
      This section type has no editable fields in v1.
    </p>
  );
}

type WebsiteSectionListProps = {
  draft: SiteSectionsDocument;
  expandedSectionId: string | null;
  highlightedSectionId?: string | null;
  publishedActivities: Activity[];
  disabled?: boolean;
  onDraftChange: (
    updater:
      | SiteSectionsDocument
      | ((current: SiteSectionsDocument) => SiteSectionsDocument)
  ) => void;
  onExpandedSectionChange: (sectionId: string | null) => void;
  onRemoveSection?: (sectionId: string) => void;
  onHeroUploadBusyChange?: (busy: boolean) => void;
};

export function WebsiteSectionList({
  draft,
  expandedSectionId,
  highlightedSectionId = null,
  publishedActivities,
  disabled = false,
  onDraftChange,
  onExpandedSectionChange,
  onRemoveSection,
  onHeroUploadBusyChange,
}: WebsiteSectionListProps) {
  const sections = [...draft.sections].sort((left, right) => left.order - right.order);
  const expandedRef = useRef<HTMLDivElement>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    sectionId: string;
    position: "before" | "after";
  } | null>(null);
  const draggedSectionIdRef = useRef<string | null>(null);
  const dropTargetRef = useRef<typeof dropTarget>(null);
  const pointerDragRef = useRef(false);
  const onDraftChangeRef = useRef(onDraftChange);
  const pointerHandlersRef = useRef<{
    move: (event: PointerEvent) => void;
    up: (event: PointerEvent) => void;
  } | null>(null);

  onDraftChangeRef.current = onDraftChange;

  const resolveDropTarget = useCallback((clientX: number, clientY: number) => {
    const draggedId = draggedSectionIdRef.current;
    if (!draggedId) {
      return null;
    }

    const element = document.elementFromPoint(clientX, clientY);
    const row = element?.closest("[data-website-section-id]");
    if (!row) {
      return null;
    }

    const sectionId = row.getAttribute("data-website-section-id");
    if (!sectionId || sectionId === draggedId) {
      return null;
    }

    const rect = row.getBoundingClientRect();
    const position: "before" | "after" =
      clientY < rect.top + rect.height / 2 ? "before" : "after";
    return { sectionId, position };
  }, []);

  const detachPointerListeners = useCallback(() => {
    const handlers = pointerHandlersRef.current;
    if (!handlers) {
      return;
    }

    document.removeEventListener("pointermove", handlers.move);
    document.removeEventListener("pointerup", handlers.up);
    document.removeEventListener("pointercancel", handlers.up);
    pointerHandlersRef.current = null;
  }, []);

  const finishPointerDrag = useCallback(() => {
    if (!pointerDragRef.current) {
      return;
    }

    const draggedId = draggedSectionIdRef.current;
    const target = dropTargetRef.current;
    pointerDragRef.current = false;
    detachPointerListeners();

    if (!draggedId || !target) {
      draggedSectionIdRef.current = null;
      dropTargetRef.current = null;
      setDraggedSectionId(null);
      setDropTarget(null);
      return;
    }

    onDraftChangeRef.current((current) => {
      const sorted = [...current.sections].sort((left, right) => left.order - right.order);
      const fromIndex = sorted.findIndex((section) => section.id === draggedId);
      const overIndex = sorted.findIndex((section) => section.id === target.sectionId);
      if (fromIndex < 0 || overIndex < 0) {
        return current;
      }

      let toIndex = target.position === "after" ? overIndex + 1 : overIndex;
      if (fromIndex < toIndex) {
        toIndex -= 1;
      }

      return reorderSections(current, fromIndex, toIndex);
    });

    draggedSectionIdRef.current = null;
    dropTargetRef.current = null;
    setDraggedSectionId(null);
    setDropTarget(null);
  }, [detachPointerListeners]);

  const attachPointerListeners = useCallback(() => {
    if (pointerHandlersRef.current) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      event.preventDefault();
      const next = resolveDropTarget(event.clientX, event.clientY);
      dropTargetRef.current = next;
      setDropTarget(next);
    };

    const onPointerUp = () => {
      finishPointerDrag();
    };

    pointerHandlersRef.current = { move: onPointerMove, up: onPointerUp };
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);
  }, [finishPointerDrag, resolveDropTarget]);

  const startPointerDrag = useCallback(
    (sectionId: string) => {
      pointerDragRef.current = true;
      draggedSectionIdRef.current = sectionId;
      dropTargetRef.current = null;
      setDraggedSectionId(sectionId);
      setDropTarget(null);
      attachPointerListeners();
    },
    [attachPointerListeners]
  );

  useEffect(() => () => detachPointerListeners(), [detachPointerListeners]);

  useEffect(() => {
    if (!expandedSectionId || !expandedRef.current) {
      return;
    }

    expandedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expandedSectionId]);

  function clearDragState() {
    pointerDragRef.current = false;
    draggedSectionIdRef.current = null;
    dropTargetRef.current = null;
    detachPointerListeners();
    setDraggedSectionId(null);
    setDropTarget(null);
  }

  function moveSection(sectionId: string, direction: -1 | 1) {
    if (disabled) {
      return;
    }

    onDraftChange((current) => {
      const sorted = [...current.sections].sort((left, right) => left.order - right.order);
      const fromIndex = sorted.findIndex((section) => section.id === sectionId);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= sorted.length) {
        return current;
      }

      return reorderSections(current, fromIndex, toIndex);
    });
  }

  function handleDrop(sectionId: string) {
    if (!draggedSectionId || draggedSectionId === sectionId || disabled) {
      clearDragState();
      return;
    }

    const fromIndex = sections.findIndex((section) => section.id === draggedSectionId);
    const overIndex = sections.findIndex((section) => section.id === sectionId);
    if (fromIndex < 0 || overIndex < 0) {
      clearDragState();
      return;
    }

    const position =
      dropTarget?.sectionId === sectionId ? dropTarget.position : "before";
    let toIndex = position === "after" ? overIndex + 1 : overIndex;
    if (fromIndex < toIndex) {
      toIndex -= 1;
    }

    onDraftChange((current) => reorderSections(current, fromIndex, toIndex));
    clearDragState();
  }

  return (
    <div className="space-y-2">
      {sections.map((section) => {
        const label = SECTION_TYPE_LABELS[section.type] ?? section.type;
        const isExpanded = expandedSectionId === section.id;
        const isHighlighted = highlightedSectionId === section.id;
        const summary = getSectionSummary(section);
        const isDragging = draggedSectionId === section.id;
        const sectionIndex = sections.findIndex((entry) => entry.id === section.id);
        const showDropBefore =
          dropTarget?.sectionId === section.id && dropTarget.position === "before";
        const showDropAfter =
          dropTarget?.sectionId === section.id && dropTarget.position === "after";

        return (
          <div
            key={section.id}
            data-website-section-id={section.id}
            ref={isExpanded ? expandedRef : undefined}
            className={cn(
              "relative overflow-hidden rounded-xl border bg-card transition-shadow",
              isHighlighted && "ring-2 ring-primary/50",
              isDragging && "opacity-50",
              isExpanded
                ? "border-primary/30 shadow-sm"
                : "border-border-warm"
            )}
            onDragOver={(event) => {
              if (!draggedSectionId || draggedSectionId === section.id || disabled) {
                return;
              }

              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              const rect = event.currentTarget.getBoundingClientRect();
              const position =
                event.clientY < rect.top + rect.height / 2 ? "before" : "after";
              setDropTarget({ sectionId: section.id, position });
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setDropTarget((current) =>
                  current?.sectionId === section.id ? null : current
                );
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleDrop(section.id);
            }}
          >
            {showDropBefore ? (
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 z-10 h-0.5 bg-primary"
              />
            ) : null}
            {showDropAfter ? (
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 z-10 h-0.5 bg-primary"
              />
            ) : null}
            <div className="flex flex-col gap-2 py-2.5 pl-1 pr-3 sm:flex-row sm:items-center sm:gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                draggable={!disabled}
                aria-label={`Drag to reorder ${label}`}
                aria-grabbed={isDragging}
                className={cn(
                  "flex shrink-0 touch-none select-none rounded-lg px-1.5 py-2 text-text-muted-warm/70 transition-colors",
                  disabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-grab hover:bg-muted/60 hover:text-text-warm active:cursor-grabbing"
                )}
                onPointerDown={(event) => {
                  if (disabled || event.button !== 0 || sections.length <= 1) {
                    return;
                  }

                  startPointerDrag(section.id);
                  event.currentTarget.setPointerCapture(event.pointerId);
                  event.preventDefault();
                }}
                onPointerUp={() => {
                  if (draggedSectionIdRef.current !== section.id) {
                    return;
                  }

                  finishPointerDrag();
                }}
                onLostPointerCapture={() => {
                  if (draggedSectionIdRef.current === section.id && pointerDragRef.current) {
                    finishPointerDrag();
                  }
                }}
                onKeyDown={(event) => {
                  if (disabled) {
                    return;
                  }

                  const currentIndex = sections.findIndex((entry) => entry.id === section.id);
                  if (currentIndex < 0) {
                    return;
                  }

                  if (event.key === "ArrowUp" && currentIndex > 0) {
                    event.preventDefault();
                    onDraftChange((current) =>
                      reorderSections(current, currentIndex, currentIndex - 1)
                    );
                  }

                  if (event.key === "ArrowDown" && currentIndex < sections.length - 1) {
                    event.preventDefault();
                    onDraftChange((current) =>
                      reorderSections(current, currentIndex, currentIndex + 1)
                    );
                  }
                }}
                onDragStart={(event) => {
                  if (disabled || pointerDragRef.current) {
                    event.preventDefault();
                    return;
                  }

                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", section.id);
                  setDraggedSectionId(section.id);
                }}
                onDragEnd={clearDragState}
              >
                <GripVertical className="size-4" aria-hidden />
              </div>
              <SectionTypeIcon type={section.type} />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                disabled={disabled}
                aria-expanded={isExpanded}
                onClick={() =>
                  onExpandedSectionChange(isExpanded ? null : section.id)
                }
              >
                <span className="block text-sm font-medium text-text-warm">
                  {label}
                </span>
                <span className="block truncate text-xs text-text-muted-warm">
                  {summary}
                </span>
              </button>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
              <div className="flex items-center gap-0.5 lg:hidden">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || sectionIndex <= 0}
                  aria-label={`Move ${label} up`}
                  onClick={() => moveSection(section.id, -1)}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || sectionIndex >= sections.length - 1}
                  aria-label={`Move ${label} down`}
                  onClick={() => moveSection(section.id, 1)}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
              <label className="flex items-center gap-1.5 text-xs text-text-muted-warm">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  disabled={disabled}
                  onChange={(event) => {
                    onDraftChange((current) => ({
                      ...current,
                      sections: current.sections.map((entry) =>
                        entry.id === section.id
                          ? { ...entry, enabled: event.target.checked }
                          : entry
                      ),
                    }));
                  }}
                />
                Visible
              </label>
              <div className="flex items-center gap-0.5">
                {onRemoveSection && !isProtectedFromRemoval(draft, section) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={disabled}
                    aria-label={`Remove ${label}`}
                    onClick={() => onRemoveSection(section.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  aria-label={isExpanded ? `Collapse ${label}` : `Expand ${label}`}
                  aria-expanded={isExpanded}
                  onClick={() =>
                    onExpandedSectionChange(isExpanded ? null : section.id)
                  }
                >
                  <ChevronDown
                    className={cn(
                      "size-4 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </Button>
              </div>
              </div>
            </div>
            {isExpanded ? (
              <div className="border-t border-border-warm bg-surface-warm/30 px-4 py-4">
                <WebsiteSectionFields
                  draft={draft}
                  section={section}
                  publishedActivities={publishedActivities}
                  disabled={disabled}
                  onDraftChange={onDraftChange}
                  onHeroUploadBusyChange={onHeroUploadBusyChange}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function WebsitePublishChangeSummary({
  changes,
}: {
  changes: string[];
}) {
  if (changes.length === 0) {
    return (
      <p className="text-sm text-text-muted-warm">
        No content changes since the last publish.
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-1 pl-5 text-sm text-text-warm">
      {changes.map((change) => (
        <li key={change}>{change}</li>
      ))}
    </ul>
  );
}

export function WebsitePublishGateSummary({ gate }: { gate: PublishGateResult }) {
  if (gate.blockers.length === 0 && gate.warnings.length === 0) {
    return (
      <p className="text-sm text-text-muted-warm">
        Draft meets publish requirements.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {gate.blockers.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-destructive">
          {gate.blockers.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
      {gate.warnings.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300">
          {gate.warnings.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function getPublicSiteUrl(): string {
  return resolvePublicSiteUrl();
}
