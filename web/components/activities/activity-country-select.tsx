"use client";

import { Label } from "@/components/ui/label";
import type { CountryOption } from "@/lib/countries";

type ActivityCountrySelectProps = {
  countryCode: string;
  countryOptions: CountryOption[];
  onCountryCodeChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string | null;
};

export function ActivityCountrySelect({
  countryCode,
  countryOptions,
  onCountryCodeChange,
  disabled = false,
  helperText = null,
}: ActivityCountrySelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="activity-country">Country</Label>
      <select
        id="activity-country"
        required
        disabled={disabled}
        value={countryCode}
        onChange={(event) => onCountryCodeChange(event.target.value)}
        className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {countryOptions.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </select>
      <p className="min-h-8 text-xs text-text-muted-warm">
        {helperText ?? "\u00A0"}
      </p>
    </div>
  );
}
