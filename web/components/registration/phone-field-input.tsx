import { Label } from "@/components/ui/label";
import type { FormFieldDefinition } from "@/lib/activities-api";
import {
  getPhonePlaceholder,
  getPhonePrefixLabel,
  resolvePhoneCountry,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type PhoneFieldInputProps = {
  field: FormFieldDefinition;
  fieldId: string;
  value: string;
  error?: string;
  isPublic?: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function PhoneFieldInput({
  field,
  fieldId,
  value,
  error,
  isPublic = false,
  onChange,
  onBlur,
}: PhoneFieldInputProps) {
  const countryCode = resolvePhoneCountry(field.phoneCountry);
  const prefix = getPhonePrefixLabel(countryCode);
  const errorDescribedBy = error ? `${fieldId}-error` : undefined;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId}>
        {field.label}
        {field.required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </Label>
      <div
        className={cn(
          "flex overflow-hidden rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          error && "border-destructive ring-3 ring-destructive/20"
        )}
      >
        <span
          className={cn(
            "flex items-center border-r border-input bg-muted/40 px-3 text-sm text-text-muted-warm",
            isPublic ? "min-h-12" : "min-h-9"
          )}
          aria-hidden
        >
          {prefix}
        </span>
        <input
          id={fieldId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={field.placeholder ?? getPhonePlaceholder(countryCode)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={errorDescribedBy}
          className={cn(
            "flex-1 bg-transparent px-3 outline-none",
            isPublic ? "min-h-12 text-base" : "min-h-9 text-sm"
          )}
        />
      </div>
      <p className="text-xs text-text-muted-warm">
        Local {countryCode} mobile — country is set by the activity form.
      </p>
    </div>
  );
}
