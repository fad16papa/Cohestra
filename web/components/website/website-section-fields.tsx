"use client";

import { useEffect, useRef, useState } from "react";
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
import { getPublicApiBaseUrl } from "@/lib/api";
import { uploadCampaignAsset } from "@/lib/campaigns-api";
import type { SiteSection, SiteSectionsDocument } from "@/lib/public-site-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import {
  SECTION_TYPE_LABELS,
  moveSection,
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

function clampUpcomingLimit(value: number): number {
  if (!Number.isFinite(value)) {
    return 6;
  }

  return Math.min(12, Math.max(1, Math.trunc(value)));
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

              void uploadCampaignAsset(authFetch, file, "Site hero image")
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
          <Label htmlFor={`${section.id}-limit`}>Maximum cards</Label>
          <Input
            id={`${section.id}-limit`}
            type="number"
            min={1}
            max={12}
            value={
              typeof section.props.limit === "number"
                ? section.props.limit
                : typeof section.props.limit === "string"
                  ? section.props.limit
                  : "6"
            }
            disabled={disabled}
            onChange={(event) => {
              const parsed = Number.parseInt(event.target.value, 10);
              patchProps({ limit: clampUpcomingLimit(parsed) });
            }}
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

  useEffect(() => {
    if (!expandedSectionId || !expandedRef.current) {
      return;
    }

    expandedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expandedSectionId]);

  return (
    <div className="space-y-2">
      {sections.map((section, index) => {
        const label = SECTION_TYPE_LABELS[section.type] ?? section.type;
        const isExpanded = expandedSectionId === section.id;
        const isHighlighted = highlightedSectionId === section.id;
        const summary = getSectionSummary(section);

        return (
          <div
            key={section.id}
            data-website-section-id={section.id}
            ref={isExpanded ? expandedRef : undefined}
            className={cn(
              "overflow-hidden rounded-xl border bg-card transition-shadow",
              isHighlighted && "ring-2 ring-primary/50",
              isExpanded
                ? "border-primary/30 shadow-sm"
                : "border-border-warm"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2.5">
              <GripVertical
                className="size-4 shrink-0 text-text-muted-warm/70"
                aria-hidden
              />
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
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted-warm">
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === 0}
                  aria-label={`Move ${label} up`}
                  onClick={() =>
                    onDraftChange((current) => moveSection(current, section.id, "up"))
                  }
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled || index === sections.length - 1}
                  aria-label={`Move ${label} down`}
                  onClick={() =>
                    onDraftChange((current) =>
                      moveSection(current, section.id, "down")
                    )
                  }
                >
                  <ChevronDown className="size-4" />
                </Button>
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
    <div className="space-y-3">
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
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return getPublicApiBaseUrl().replace(/:\d+$/, "");
}
