import { Label } from "@/components/ui/label";
import { SECTION_VARIANTS, type SectionVariant } from "@/lib/site-sections/limits";

import { builderSelectClassName } from "./builder-field-utils";

type SectionVariantFieldProps = {
  id: string;
  value: SectionVariant;
  disabled?: boolean;
  onChange: (variant: SectionVariant) => void;
};

export function SectionVariantField({
  id,
  value,
  disabled = false,
  onChange,
}: SectionVariantFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Background style</Label>
      <select
        id={id}
        className={builderSelectClassName}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as SectionVariant)}
      >
        {SECTION_VARIANTS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
