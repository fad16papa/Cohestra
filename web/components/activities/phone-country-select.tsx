"use client";

import { Label } from "@/components/ui/label";
import {
  formatPhoneCountryOptionLabel,
  phoneCountryOptions,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type PhoneCountrySelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
};

export function PhoneCountrySelect({
  id,
  value,
  onChange,
  disabled = false,
  label = "Mobile country",
  helperText = "Participants enter a local number for this country.",
}: PhoneCountrySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {phoneCountryOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {formatPhoneCountryOptionLabel(option)}
          </option>
        ))}
      </select>
      {helperText ? (
        <p className={cn("text-xs text-text-muted-warm")}>{helperText}</p>
      ) : null}
    </div>
  );
}
