"use client";

import { PlanBadge } from "@/components/shell/plan-badge";
import type { RegistrationDesignTokens, RegistrationTheme } from "@/lib/activities-api";
import {
  isDesignTokenOptionLocked,
  type ButtonWidth,
  type FieldRadius,
  type FieldSize,
  type SurfaceEmphasis,
  type TypographyScale,
} from "@/lib/registration-design-tokens";
import { cn } from "@/lib/utils";

type RegistrationDesignTokenControlsProps = {
  plan: string;
  draftTheme: RegistrationTheme;
  disabled?: boolean;
  onThemeChange: (theme: RegistrationTheme) => void;
};

type TokenOption<T extends string> = {
  id: T;
  label: string;
  description: string;
};

const TYPOGRAPHY_OPTIONS: TokenOption<TypographyScale>[] = [
  { id: "compact", label: "Compact", description: "Tighter labels and field spacing." },
  { id: "default", label: "Default", description: "Balanced rhythm for most forms." },
  {
    id: "spacious",
    label: "Spacious",
    description: "More breathing room between blocks.",
  },
];

const FIELD_SIZE_OPTIONS: TokenOption<FieldSize>[] = [
  { id: "default", label: "Default", description: "Standard touch-friendly height." },
  {
    id: "comfortable",
    label: "Comfortable",
    description: "Taller inputs for long forms.",
  },
];

const FIELD_RADIUS_OPTIONS: TokenOption<FieldRadius>[] = [
  { id: "sm", label: "Subtle", description: "Small corner radius." },
  { id: "md", label: "Rounded", description: "Default rounded inputs." },
  { id: "lg", label: "Soft", description: "Generous corner radius." },
];

const BUTTON_WIDTH_OPTIONS: TokenOption<ButtonWidth>[] = [
  { id: "full", label: "Full width", description: "CTA spans the form column." },
  { id: "auto", label: "Auto", description: "CTA sizes to label with minimum width." },
];

const SURFACE_OPTIONS: TokenOption<SurfaceEmphasis>[] = [
  { id: "flat", label: "Flat", description: "Minimal borders and no elevation." },
  { id: "soft", label: "Soft", description: "Light surface separation." },
  { id: "elevated", label: "Elevated", description: "Card-like form surface on Modern Centered." },
];

function currentTokens(theme: RegistrationTheme): RegistrationDesignTokens {
  return theme.designTokens ?? {};
}

function patchTokens(
  theme: RegistrationTheme,
  patch: RegistrationDesignTokens
): RegistrationTheme {
  return {
    ...theme,
    designTokens: {
      ...currentTokens(theme),
      ...patch,
    },
  };
}

function TokenRadioGroup<T extends string>({
  name,
  legend,
  options,
  value,
  plan,
  lockGroup,
  disabled,
  onSelect,
}: {
  name: string;
  legend: string;
  options: TokenOption<T>[];
  value: T;
  plan: string;
  lockGroup: "typographyScale" | "fieldSize" | "fieldRadius" | "surfaceEmphasis";
  disabled?: boolean;
  onSelect: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-3" disabled={disabled}>
      <legend className="text-sm font-semibold text-text-warm">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const locked = isDesignTokenOptionLocked(plan, lockGroup, option.id);
          const selected = value === option.id && !locked;

          return (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer rounded-lg border p-3 text-left motion-local",
                selected
                  ? "border-primary bg-gold-soft/40 ring-2 ring-primary/30"
                  : "border-border-warm bg-card hover:border-primary/40",
                (disabled || locked) && "cursor-not-allowed opacity-80"
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={selected}
                disabled={disabled || locked}
                onChange={() => onSelect(option.id)}
                className="sr-only"
              />
              <span className="min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-warm">{option.label}</span>
                  {locked ? <PlanBadge plan="Core" /> : null}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted-warm">
                  {option.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function RegistrationDesignTokenControls({
  plan,
  draftTheme,
  disabled = false,
  onThemeChange,
}: RegistrationDesignTokenControlsProps) {
  const tokens = currentTokens(draftTheme);
  const typography = (tokens.typographyScale as TypographyScale | null) ?? "default";
  const fieldSize = (tokens.fieldSize as FieldSize | null) ?? "default";
  const fieldRadius = (tokens.fieldRadius as FieldRadius | null) ?? "md";
  const buttonWidth = (tokens.buttonWidth as ButtonWidth | null) ?? "full";
  const surface = (tokens.surfaceEmphasis as SurfaceEmphasis | null) ?? "soft";

  return (
    <div className="space-y-8">
      <TokenRadioGroup
        name="design-typography"
        legend="Typography scale"
        options={TYPOGRAPHY_OPTIONS}
        value={typography}
        plan={plan}
        lockGroup="typographyScale"
        disabled={disabled}
        onSelect={(value) => onThemeChange(patchTokens(draftTheme, { typographyScale: value }))}
      />
      <TokenRadioGroup
        name="design-field-size"
        legend="Field size"
        options={FIELD_SIZE_OPTIONS}
        value={fieldSize}
        plan={plan}
        lockGroup="fieldSize"
        disabled={disabled}
        onSelect={(value) => onThemeChange(patchTokens(draftTheme, { fieldSize: value }))}
      />
      <TokenRadioGroup
        name="design-field-radius"
        legend="Field corners"
        options={FIELD_RADIUS_OPTIONS}
        value={fieldRadius}
        plan={plan}
        lockGroup="fieldRadius"
        disabled={disabled}
        onSelect={(value) => onThemeChange(patchTokens(draftTheme, { fieldRadius: value }))}
      />
      <fieldset className="space-y-3" disabled={disabled}>
        <legend className="text-sm font-semibold text-text-warm">Button width</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {BUTTON_WIDTH_OPTIONS.map((option) => {
            const selected = buttonWidth === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer rounded-lg border p-3 text-left motion-local",
                  selected
                    ? "border-primary bg-gold-soft/40 ring-2 ring-primary/30"
                    : "border-border-warm bg-card hover:border-primary/40",
                  disabled && "cursor-not-allowed opacity-80"
                )}
              >
                <input
                  type="radio"
                  name="design-button-width"
                  value={option.id}
                  checked={selected}
                  disabled={disabled}
                  onChange={() =>
                    onThemeChange(patchTokens(draftTheme, { buttonWidth: option.id }))
                  }
                  className="sr-only"
                />
                <span className="min-w-0">
                  <span className="text-sm font-medium text-text-warm">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-text-muted-warm">
                    {option.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <TokenRadioGroup
        name="design-surface"
        legend="Form surface"
        options={SURFACE_OPTIONS}
        value={surface}
        plan={plan}
        lockGroup="surfaceEmphasis"
        disabled={disabled}
        onSelect={(value) =>
          onThemeChange(patchTokens(draftTheme, { surfaceEmphasis: value }))
        }
      />
    </div>
  );
}
