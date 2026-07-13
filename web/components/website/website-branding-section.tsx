"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import { Check } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast-provider";
import {
  brandAccentPresets,
  buildBrandAccentStyle,
  defaultSiteAccentColor,
  isValidBrandAccentColor,
  normalizeBrandAccentColor,
  presetIdForColor,
  type BrandAccentPresetId,
} from "@/lib/brand-accent";
import { uploadCampaignAsset } from "@/lib/campaigns-api";
import type { SiteSectionsDocument } from "@/lib/public-site-api";
import { resolveHeroImageUrl } from "@/lib/resolve-hero-image-url";
import { updateSiteDocument } from "@/lib/site-draft-utils";
import { cn } from "@/lib/utils";

type WebsiteBrandingSectionProps = {
  draft: SiteSectionsDocument;
  disabled?: boolean;
  onDraftChange: (
    updater:
      | SiteSectionsDocument
      | ((current: SiteSectionsDocument) => SiteSectionsDocument)
  ) => void;
  onLogoUploadBusyChange?: (busy: boolean) => void;
};

export type WebsiteBrandingSectionHandle = {
  flushPendingAccent: (document: SiteSectionsDocument) => SiteSectionsDocument | null;
};

function campaignAssetPath(assetId: string): string {
  return `/api/v1/public/campaign-assets/${assetId}`;
}

function resolveAccentDocument(
  document: SiteSectionsDocument,
  value: string
): SiteSectionsDocument | null {
  const trimmed = value.trim();
  const savedAccent = document.accentColor ?? "";

  if (!trimmed) {
    return savedAccent === ""
      ? document
      : updateSiteDocument(document, { accentColor: defaultSiteAccentColor });
  }

  if (!isValidBrandAccentColor(trimmed)) {
    return null;
  }

  const normalized = normalizeBrandAccentColor(trimmed) ?? "";
  return normalized === savedAccent
    ? document
    : updateSiteDocument(document, { accentColor: normalized });
}

export const WebsiteBrandingSection = forwardRef<
  WebsiteBrandingSectionHandle,
  WebsiteBrandingSectionProps
>(function WebsiteBrandingSection(
  { draft, disabled = false, onDraftChange, onLogoUploadBusyChange },
  ref
) {
  const { authFetch } = useAuth();
  const { showToast, showErrorToast } = useToast();
  const logoUploadSeqRef = useRef(0);
  const onLogoUploadBusyChangeRef = useRef(onLogoUploadBusyChange);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [accentColor, setAccentColor] = useState(
    draft.accentColor ?? defaultSiteAccentColor
  );
  const [accentTouched, setAccentTouched] = useState(false);

  const trimmedAccent = accentColor.trim();
  const accentIsInvalid =
    trimmedAccent.length > 0 && !isValidBrandAccentColor(trimmedAccent);

  useEffect(() => {
    onLogoUploadBusyChangeRef.current = onLogoUploadBusyChange;
  }, [onLogoUploadBusyChange]);

  useEffect(() => {
    onLogoUploadBusyChange?.(isUploadingLogo);
  }, [isUploadingLogo, onLogoUploadBusyChange]);

  useEffect(() => {
    setAccentColor(draft.accentColor ?? defaultSiteAccentColor);
  }, [draft.accentColor]);

  useImperativeHandle(
    ref,
    () => ({
      flushPendingAccent(document: SiteSectionsDocument) {
        const resolved = resolveAccentDocument(document, accentColor);
        if (resolved === null) {
          return null;
        }

        setAccentColor(resolved.accentColor ?? defaultSiteAccentColor);
        return resolved;
      },
    }),
    [accentColor]
  );

  const logoAssetId = draft.logoAssetId?.trim() ?? "";
  const logoPreviewUrl = logoAssetId
    ? resolveHeroImageUrl(campaignAssetPath(logoAssetId))
    : null;
  const previewAccent =
    accentColor.trim() && isValidBrandAccentColor(accentColor)
      ? normalizeBrandAccentColor(accentColor)
      : null;
  const previewStyle = buildBrandAccentStyle(previewAccent, false);
  const activePreset = presetIdForColor(
    isValidBrandAccentColor(accentColor) ? accentColor : draft.accentColor
  );

  function commitAccentToDraft(value: string) {
    onDraftChange((current) => {
      const resolved = resolveAccentDocument(current, value);
      return resolved ?? current;
    });
  }

  function selectPreset(presetId: BrandAccentPresetId) {
    const preset = brandAccentPresets.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setAccentColor(preset.hex);
    commitAccentToDraft(preset.hex);
  }

  function rejectInvalidAccent(message: string) {
    setAccentTouched(true);
    showErrorToast(message);
    setAccentColor(draft.accentColor ?? defaultSiteAccentColor);
  }

  function handleAccentBlur() {
    const trimmed = accentColor.trim();
    setAccentTouched(true);

    if (!trimmed) {
      setAccentColor(defaultSiteAccentColor);
      commitAccentToDraft(defaultSiteAccentColor);
      return;
    }

    if (!isValidBrandAccentColor(trimmed)) {
      rejectInvalidAccent("Use a valid hex color (#RGB or #RRGGBB).");
      return;
    }

    const normalized = normalizeBrandAccentColor(trimmed) ?? defaultSiteAccentColor;
    commitAccentToDraft(trimmed);
    setAccentColor(normalized);
  }

  function handleAccentChange(value: string) {
    setAccentColor(value);
    setAccentTouched(true);

    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    if (isValidBrandAccentColor(trimmed)) {
      commitAccentToDraft(trimmed);
    }
  }

  function applyCustomAccent() {
    const trimmed = accentColor.trim();
    setAccentTouched(true);
    if (!trimmed || !isValidBrandAccentColor(trimmed)) {
      rejectInvalidAccent("Enter a valid hex color like #c45c26.");
      return;
    }

    const normalized = normalizeBrandAccentColor(trimmed) ?? defaultSiteAccentColor;
    setAccentColor(normalized);
    commitAccentToDraft(normalized);
  }

  function resetAccentToDefault() {
    setAccentColor(defaultSiteAccentColor);
    commitAccentToDraft(defaultSiteAccentColor);
  }

  return (
    <section className="space-y-4 rounded-xl border border-border-warm bg-card p-4 sm:p-5">
      <div>
        <h3 className="text-section text-text-warm">Site branding</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Logo and accent apply on the public homepage after you publish.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Site logo</Label>
        {logoPreviewUrl ? (
          <div className="relative size-16 overflow-hidden rounded-xl border border-border-warm bg-card">
            <Image
              src={logoPreviewUrl}
              alt=""
              fill
              className="object-contain p-2"
              unoptimized
            />
          </div>
        ) : (
          <p className="text-sm text-text-muted-warm">
            No site logo uploaded. The default platform mark is used until you publish a logo.
          </p>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          id="site-logo-upload"
          disabled={disabled || isUploadingLogo}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file || disabled || isUploadingLogo) {
              return;
            }

            const uploadSeq = ++logoUploadSeqRef.current;
            setIsUploadingLogo(true);

            void uploadCampaignAsset(authFetch, file, "Site logo")
              .then((asset) => {
                if (uploadSeq !== logoUploadSeqRef.current) {
                  return;
                }

                onDraftChange((current) =>
                  updateSiteDocument(current, { logoAssetId: asset.id })
                );
              })
              .catch((error) => {
                if (uploadSeq !== logoUploadSeqRef.current) {
                  return;
                }

                showErrorToast(
                  error instanceof Error ? error.message : "Could not upload site logo."
                );
              })
              .finally(() => {
                if (uploadSeq !== logoUploadSeqRef.current) {
                  return;
                }

                setIsUploadingLogo(false);
                onLogoUploadBusyChangeRef.current?.(false);
              });
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || isUploadingLogo}
            onClick={() => document.getElementById("site-logo-upload")?.click()}
          >
            {isUploadingLogo ? "Uploading…" : logoPreviewUrl ? "Replace logo" : "Upload logo"}
          </Button>
          {logoPreviewUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || isUploadingLogo}
              onClick={() =>
                onDraftChange((current) =>
                  updateSiteDocument(current, { logoAssetId: null })
                )
              }
            >
              Use default logo
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <Label>Accent color</Label>
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted-warm">Presets</p>
          <div className="flex flex-wrap gap-2">
            {brandAccentPresets.map((preset) => {
              const isActive = activePreset === preset.id;

              return (
                <button
                  key={preset.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isActive}
                  onClick={() => selectPreset(preset.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 sm:px-3 sm:py-2 sm:text-sm",
                    isActive
                      ? "border-primary bg-primary/5 text-text-warm"
                      : "border-border-warm bg-card text-text-muted-warm hover:bg-muted/50"
                  )}
                >
                  <span
                    className="size-4 shrink-0 rounded-full border border-border-warm"
                    style={{ backgroundColor: preset.hex }}
                    aria-hidden
                  />
                  {preset.label}
                  {isActive ? (
                    <Check className="size-3.5 text-primary sm:size-4" aria-hidden />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="site-accent-color">Custom color</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="site-accent-color"
              value={accentColor}
              disabled={disabled}
              placeholder={defaultSiteAccentColor}
              onChange={(event) => handleAccentChange(event.target.value)}
              onBlur={handleAccentBlur}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyCustomAccent();
                }
              }}
              aria-invalid={accentIsInvalid}
              aria-describedby={
                accentIsInvalid ? "site-accent-color-error" : undefined
              }
              className={cn(
                "max-w-[10rem] font-mono text-sm",
                accentIsInvalid &&
                  accentTouched &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/30"
              )}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={applyCustomAccent}
            >
              Apply custom
            </Button>
            <span
              className={cn(
                "inline-flex size-9 rounded-lg border border-border-warm",
                !previewAccent && "bg-muted"
              )}
              style={
                previewAccent ? { backgroundColor: previewAccent } : undefined
              }
              aria-hidden
            />
          </div>
          {accentIsInvalid && accentTouched ? (
            <p
              id="site-accent-color-error"
              role="alert"
              className="text-xs text-destructive"
            >
              Enter a valid hex color (#RGB or #RRGGBB), then click Apply custom or
              press Enter.
            </p>
          ) : (
            <p className="text-xs text-text-muted-warm">
              Example: #2d6a4f or #abc. Invalid values block save until fixed.
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={resetAccentToDefault}
          className="h-auto px-0 text-xs text-text-muted-warm hover:text-text-warm"
        >
          Reset to default ({defaultSiteAccentColor})
        </Button>
        <p className="text-xs text-text-muted-warm">
          Used for buttons and highlights on your public homepage.
        </p>
      </div>

      {previewStyle ? (
        <div
          className="rounded-lg border border-border-warm px-4 py-3"
          style={previewStyle}
        >
          <span className="inline-flex rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
            Accent preview
          </span>
        </div>
      ) : null}
    </section>
  );
});
