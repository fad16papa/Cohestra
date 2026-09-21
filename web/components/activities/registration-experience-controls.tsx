"use client";

import { PlanBadge } from "@/components/shell/plan-badge";
import type { RegistrationTheme } from "@/lib/activities-api";
import {
  activeExperienceFlow,
  activeExperienceLayoutChoice,
  activeExperienceStyle,
  applyExperienceFlow,
  applyExperienceStyle,
  applyPrimaryExperienceLayout,
  canSelectExperienceFlow,
  canSelectExperienceLayout,
  canSelectExperienceStyle,
  EXPERIENCE_FLOW_OPTIONS,
  EXPERIENCE_LAYOUT_OPTIONS,
  EXPERIENCE_STYLE_OPTIONS,
  isLegacyLayoutPreset,
  type ExperienceLayoutChoice,
} from "@/lib/registration-experience-studio";
import type { RegistrationExperienceFlow } from "@/lib/registration-experience";
import { cn } from "@/lib/utils";

type RegistrationExperienceControlsProps = {
  plan: string;
  draftTheme: RegistrationTheme;
  disabled?: boolean;
  onThemeChange: (theme: RegistrationTheme) => void;
};

function OptionCard({
  name,
  optionId,
  label,
  description,
  selected,
  disabled,
  lockedPlan,
  onSelect,
}: {
  name: string;
  optionId: string;
  label: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  lockedPlan: string | null;
  onSelect: () => void;
}) {
  const locked = Boolean(lockedPlan);

  return (
    <label
      className={cn(
        "relative flex cursor-pointer rounded-xl border p-4 text-left motion-local",
        selected && !locked
          ? "border-primary bg-gold-soft/40 ring-2 ring-primary/30"
          : "border-border-warm bg-card hover:border-primary/40",
        (disabled || locked) && "cursor-not-allowed opacity-80 hover:border-border-warm"
      )}
    >
      <input
        type="radio"
        name={name}
        value={optionId}
        checked={selected && !locked}
        disabled={disabled || locked}
        onChange={() => onSelect()}
        className="sr-only"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-text-warm">{label}</span>
          {lockedPlan ? <PlanBadge plan={lockedPlan} /> : null}
        </span>
        <span className="mt-1 block text-xs text-text-muted-warm">{description}</span>
        {locked ? (
          <span className="mt-2 block text-xs text-text-muted-warm">
            Available on {lockedPlan}. Upgrade to unlock this experience.
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function RegistrationExperienceControls({
  plan,
  draftTheme,
  disabled = false,
  onThemeChange,
}: RegistrationExperienceControlsProps) {
  const layoutChoice = activeExperienceLayoutChoice(draftTheme);
  const flowChoice = activeExperienceFlow(draftTheme);
  const styleChoice = activeExperienceStyle(draftTheme);
  const legacyPresetActive = isLegacyLayoutPreset(draftTheme.preset);

  function selectLayout(layout: ExperienceLayoutChoice) {
    if (!canSelectExperienceLayout(plan, layout)) {
      return;
    }

    onThemeChange(applyPrimaryExperienceLayout(draftTheme, layout));
  }

  function selectFlow(flow: RegistrationExperienceFlow) {
    if (!canSelectExperienceFlow(plan, flow)) {
      return;
    }

    onThemeChange(applyExperienceFlow(draftTheme, flow));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="experience-layout-heading">
        <div>
          <h4 id="experience-layout-heading" className="text-sm font-semibold text-text-warm">
            Layout
          </h4>
          <p className="mt-0.5 text-xs text-text-muted-warm">
            How Activity context and the registration form are arranged.
          </p>
        </div>
        {legacyPresetActive ? (
          <p role="status" className="text-xs text-text-muted-warm">
            An advanced layout preset is active below. Switch to Classic preset to use Split or
            Poster experiences.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EXPERIENCE_LAYOUT_OPTIONS.map((option) => {
            const lockedPlan =
              canSelectExperienceLayout(plan, option.id) || legacyPresetActive
                ? null
                : option.requiredPlan;

            return (
              <OptionCard
                key={option.id}
                name="registration-experience-layout"
                optionId={option.id}
                label={option.label}
                description={option.description}
                selected={!legacyPresetActive && layoutChoice === option.id}
                disabled={disabled || legacyPresetActive}
                lockedPlan={lockedPlan}
                onSelect={() => selectLayout(option.id)}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="experience-flow-heading">
        <div>
          <h4 id="experience-flow-heading" className="text-sm font-semibold text-text-warm">
            Flow
          </h4>
          <p className="mt-0.5 text-xs text-text-muted-warm">
            Single scrollable page or one question at a time.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXPERIENCE_FLOW_OPTIONS.map((option) => {
            const lockedPlan = canSelectExperienceFlow(plan, option.id)
              ? null
              : option.requiredPlan;

            return (
              <OptionCard
                key={option.id}
                name="registration-experience-flow"
                optionId={option.id}
                label={option.label}
                description={option.description}
                selected={flowChoice === option.id}
                disabled={disabled}
                lockedPlan={lockedPlan}
                onSelect={() => selectFlow(option.id)}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="experience-style-heading">
        <div>
          <h4 id="experience-style-heading" className="text-sm font-semibold text-text-warm">
            Style
          </h4>
          <p className="mt-0.5 text-xs text-text-muted-warm">
            Visual tone for registration chrome (not field definitions).
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {EXPERIENCE_STYLE_OPTIONS.map((option) => {
            const lockedPlan = canSelectExperienceStyle(plan, option.id)
              ? null
              : option.requiredPlan;

            return (
              <OptionCard
                key={option.id}
                name="registration-experience-style"
                optionId={option.id}
                label={option.label}
                description={option.description}
                selected={styleChoice === option.id}
                disabled={disabled}
                lockedPlan={lockedPlan}
                onSelect={() =>
                  onThemeChange(applyExperienceStyle(draftTheme, option.id))
                }
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
