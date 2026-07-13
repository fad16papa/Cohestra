"use client";

import { useMemo } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  builderSelectClassName,
  buildCtaTargetOptions,
  resolveCtaTargetOptions,
  type CtaTargetOption,
} from "./builder-field-utils";

type CtaEditorProps = {
  idPrefix: string;
  label: string;
  cta: { label: string; target: string };
  options?: CtaTargetOption[];
  disabled?: boolean;
  onChange: (label: string, target: string) => void;
};

export function CtaEditor({
  idPrefix,
  label,
  cta,
  options,
  disabled = false,
  onChange,
}: CtaEditorProps) {
  const targetOptions = options ?? buildCtaTargetOptions([]);
  const isExternal =
    cta.target.startsWith("http://") ||
    cta.target.startsWith("https://") ||
    (cta.target !== "scroll-upcoming" &&
      !cta.target.startsWith("activity:") &&
      cta.target !== "__external__" &&
      !targetOptions.some((option) => option.value === cta.target));

  const selectValue = isExternal ? "__external__" : cta.target;
  const resolvedOptions = useMemo(
    () => resolveCtaTargetOptions(targetOptions, selectValue),
    [targetOptions, selectValue]
  );

  return (
    <div className="space-y-3 rounded-lg border border-border-warm p-3">
      <p className="text-sm font-medium text-text-warm">{label}</p>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-label`}>Button label</Label>
        <Input
          id={`${idPrefix}-label`}
          value={cta.label}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value, cta.target)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-target`}>Target</Label>
        <select
          id={`${idPrefix}-target`}
          className={builderSelectClassName}
          value={selectValue}
          disabled={disabled}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "__external__") {
              onChange(cta.label, "https://");
              return;
            }

            onChange(cta.label, value);
          }}
        >
          {resolvedOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {selectValue === "__external__" || isExternal ? (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-url`}>External URL</Label>
          <Input
            id={`${idPrefix}-url`}
            value={isExternal ? cta.target : "https://"}
            disabled={disabled}
            onChange={(event) => onChange(cta.label, event.target.value)}
          />
        </div>
      ) : null}
    </div>
  );
}
