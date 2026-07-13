"use client";

import { ResponsiveBannerImage } from "@/components/ui/responsive-banner-image";
import { useRef, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Activity } from "@/lib/activities-api";
import { uploadCampaignAsset } from "@/lib/campaigns-api";
import type { SiteSection } from "@/lib/public-site-api";
import { readSectionVariant } from "@/lib/site-sections/limits";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";

import {
  builderSelectClassName,
  builderTextareaClassName,
  buildCtaTargetOptions,
  campaignAssetPath,
  readCta,
} from "./shared/builder-field-utils";
import { CtaEditor } from "./shared/cta-editor";
import { ListItemsEditor } from "./shared/list-items-editor";
import { SectionVariantField } from "./shared/section-variant-field";

type PatchProps = (patch: Record<string, unknown>) => void;

type MarketingSectionFieldsProps = {
  section: SiteSection;
  publishedActivities: Activity[];
  disabled?: boolean;
  patchProps: PatchProps;
};

function AssetUploadButton({
  sectionId,
  assetId,
  uploadLabel,
  fieldId,
  disabled,
  onUploaded,
}: {
  sectionId: string;
  assetId: string;
  uploadLabel: string;
  fieldId: string;
  disabled?: boolean;
  onUploaded: (assetId: string) => void;
}) {
  const { authFetch } = useAuth();
  const { showToast, showErrorToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = `${sectionId}-asset-upload-${fieldId}`;
  const [busy, setBusy] = useState(false);
  const previewUrl = assetId ? resolveHeroImageUrl(campaignAssetPath(assetId)) : null;

  return (
    <div className="space-y-2">
      {previewUrl ? (
        <ResponsiveBannerImage
          src={previewUrl}
          variant="preview"
          className="overflow-hidden rounded-lg border border-border-warm bg-muted/20"
        />
      ) : null}
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file || disabled || busy) {
            return;
          }

          setBusy(true);
          void uploadCampaignAsset(authFetch, file, uploadLabel)
            .then((asset) => onUploaded(asset.id))
            .catch((error) =>
              showErrorToast(error instanceof Error ? error.message : "Could not upload image.")
            )
            .finally(() => setBusy(false));
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || busy}
        onClick={() => fileInputRef.current?.click()}
      >
        {busy ? "Uploading…" : previewUrl ? "Replace image" : "Upload image"}
      </Button>
      <p className="text-xs text-text-muted-warm">
        Any image size works · WebP or JPEG under 150 KB recommended
      </p>
    </div>
  );
}

function listItemFieldId(item: Record<string, unknown>, index: number): string {
  const key = item._key;
  return typeof key === "string" && key.length > 0 ? key : `item-${index}`;
}

export function MarketingSectionFields({
  section,
  publishedActivities,
  disabled = false,
  patchProps,
}: MarketingSectionFieldsProps) {
  const type = section.type.toLowerCase();
  const ctaOptions = buildCtaTargetOptions(publishedActivities);
  const variant = readSectionVariant(section.props);

  if (type === "carousel") {
    const slides = (Array.isArray(section.props.slides) ? section.props.slides : []).map(
      (slide) =>
        typeof slide === "object" && slide !== null
          ? (slide as Record<string, unknown>)
          : {
              imageAssetId: "",
              headline: "",
              description: "",
              cta: { label: "", target: "scroll-upcoming" },
            }
    ) as Array<Record<string, unknown>>;

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
        <SectionVariantField
          id={`${section.id}-variant`}
          value={variant}
          disabled={disabled}
          onChange={(value) => patchProps({ variant: value })}
        />
        <label className="flex items-center gap-2 text-sm text-text-warm">
          <input
            type="checkbox"
            checked={section.props.autoplay === true}
            disabled={disabled}
            onChange={(event) => patchProps({ autoplay: event.target.checked })}
          />
          Autoplay slides (respects reduced motion on site)
        </label>
        <ListItemsEditor
          items={slides}
          disabled={disabled}
          itemLabel={(index) => `Slide ${index + 1}`}
          createItem={() => ({
            _key:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `item-${crypto.randomUUID().slice(0, 8)}`
                : `item-${Date.now().toString(36)}`,
            imageAssetId: "",
            headline: "",
            description: "",
            cta: { label: "", target: "scroll-upcoming" },
          })}
          onChange={(items) => patchProps({ slides: items })}
          renderItem={(item, index, patch) => (
            <div className="space-y-3">
              <AssetUploadButton
                sectionId={section.id}
                fieldId={listItemFieldId(item, index)}
                assetId={
                  typeof item.imageAssetId === "string" ? item.imageAssetId : ""
                }
                uploadLabel="Carousel slide image"
                disabled={disabled}
                onUploaded={(assetId) => patch({ imageAssetId: assetId })}
              />
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  value={typeof item.headline === "string" ? item.headline : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ headline: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className={builderTextareaClassName}
                  value={typeof item.description === "string" ? item.description : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ description: event.target.value })}
                />
              </div>
              <CtaEditor
                idPrefix={`${section.id}-slide-${listItemFieldId(item, index)}-cta`}
                label="Slide CTA"
                cta={readCta(item, "cta")}
                options={ctaOptions}
                disabled={disabled}
                onChange={(label, target) => patch({ cta: { label, target } })}
              />
            </div>
          )}
        />
      </div>
    );
  }

  if (type === "testimonials") {
    const items = (Array.isArray(section.props.items) ? section.props.items : []).map(
      (item) =>
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : { quote: "", name: "", role: "", avatarAssetId: "" }
    ) as Array<Record<string, unknown>>;

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
        <SectionVariantField
          id={`${section.id}-variant`}
          value={variant}
          disabled={disabled}
          onChange={(value) => patchProps({ variant: value })}
        />
        <ListItemsEditor
          items={items}
          disabled={disabled}
          itemLabel={(index) => `Testimonial ${index + 1}`}
          createItem={() => ({
            _key:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `item-${crypto.randomUUID().slice(0, 8)}`
                : `item-${Date.now().toString(36)}`,
            quote: "",
            name: "",
            role: "",
            avatarAssetId: "",
          })}
          onChange={(next) => patchProps({ items: next })}
          renderItem={(item, index, patch) => (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Quote</Label>
                <textarea
                  className={builderTextareaClassName}
                  value={typeof item.quote === "string" ? item.quote : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ quote: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={typeof item.name === "string" ? item.name : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ name: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Input
                  value={typeof item.role === "string" ? item.role : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ role: event.target.value })}
                />
              </div>
              <AssetUploadButton
                sectionId={section.id}
                fieldId={listItemFieldId(item, index)}
                assetId={
                  typeof item.avatarAssetId === "string" ? item.avatarAssetId : ""
                }
                uploadLabel="Testimonial avatar"
                disabled={disabled}
                onUploaded={(assetId) => patch({ avatarAssetId: assetId })}
              />
            </div>
          )}
        />
      </div>
    );
  }

  if (type === "faq") {
    const items = (Array.isArray(section.props.items) ? section.props.items : []).map(
      (item) =>
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : { question: "", answer: "" }
    ) as Array<Record<string, unknown>>;

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
        <SectionVariantField
          id={`${section.id}-variant`}
          value={variant}
          disabled={disabled}
          onChange={(value) => patchProps({ variant: value })}
        />
        <ListItemsEditor
          items={items}
          disabled={disabled}
          itemLabel={(index) => `FAQ ${index + 1}`}
          createItem={() => ({ question: "", answer: "" })}
          onChange={(next) => patchProps({ items: next })}
          renderItem={(item, _index, patch) => (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Question</Label>
                <Input
                  value={typeof item.question === "string" ? item.question : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ question: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Answer</Label>
                <textarea
                  className={builderTextareaClassName}
                  value={typeof item.answer === "string" ? item.answer : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ answer: event.target.value })}
                />
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  if (type === "stats") {
    const items = (Array.isArray(section.props.items) ? section.props.items : []).map(
      (item) =>
        typeof item === "object" && item !== null
          ? (item as Record<string, unknown>)
          : { value: "", label: "" }
    ) as Array<Record<string, unknown>>;

    return (
      <div className="space-y-4">
        <SectionVariantField
          id={`${section.id}-variant`}
          value={variant}
          disabled={disabled}
          onChange={(value) => patchProps({ variant: value })}
        />
        <ListItemsEditor
          items={items}
          disabled={disabled}
          itemLabel={(index) => `Stat ${index + 1}`}
          createItem={() => ({ value: "", label: "" })}
          onChange={(next) => patchProps({ items: next })}
          renderItem={(item, _index, patch) => (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={typeof item.value === "string" ? item.value : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ value: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={typeof item.label === "string" ? item.label : ""}
                  disabled={disabled}
                  onChange={(event) => patch({ label: event.target.value })}
                />
              </div>
            </div>
          )}
        />
      </div>
    );
  }

  if (type === "ctaband") {
    const primaryCta = readCta(section.props, "primaryCta");

    return (
      <div className="space-y-4">
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
            className={builderTextareaClassName}
            value={
              typeof section.props.description === "string" ? section.props.description : ""
            }
            disabled={disabled}
            onChange={(event) => patchProps({ description: event.target.value })}
          />
        </div>
        <SectionVariantField
          id={`${section.id}-variant`}
          value={variant}
          disabled={disabled}
          onChange={(value) => patchProps({ variant: value })}
        />
        <CtaEditor
          idPrefix={`${section.id}-primary`}
          label="Primary CTA"
          cta={primaryCta}
          options={ctaOptions}
          disabled={disabled}
          onChange={(label, target) => patchProps({ primaryCta: { label, target } })}
        />
      </div>
    );
  }

  return (
    <p className="text-sm text-text-muted-warm">
      No additional fields for this section type.
    </p>
  );
}
