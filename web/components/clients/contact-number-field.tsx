"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableListbox } from "@/components/clients/searchable-listbox";
import {
  getPhonePlaceholder,
  getPhonePrefixLabel,
  normalizeLocalPhoneInput,
  phoneCountrySelectChoices,
  type PhoneCountrySelectChoice,
} from "@/lib/phone-countries";
import { cn } from "@/lib/utils";

type ContactNumberFieldProps = {
  countryId: string;
  numberId: string;
  countryCode: string;
  localNumber: string;
  disabled?: boolean;
  error?: string | null;
  onCountryChange: (countryCode: string) => void;
  onLocalNumberChange: (localNumber: string) => void;
};

export function ContactNumberField({
  countryId,
  numberId,
  countryCode,
  localNumber,
  disabled = false,
  error,
  onCountryChange,
  onLocalNumberChange,
}: ContactNumberFieldProps) {
  const selected = phoneCountrySelectChoices.find((option) => option.value === countryCode);
  const errorId = error ? `${numberId}-error` : undefined;
  const countryName = selected?.name ?? "country";

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={numberId}>Contact number</Label>
      <div
        data-contact-layout="flag-prefix-number"
        className={cn(
          "flex min-w-0 flex-nowrap items-center overflow-hidden rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring",
          error && "border-destructive ring-3 ring-destructive"
        )}
      >
        <SearchableListbox
          id={countryId}
          ariaLabel={`Calling code for ${countryName}. ${getPhonePrefixLabel(countryCode)}`}
          value={countryCode}
          options={phoneCountrySelectChoices}
          disabled={disabled}
          hideChevron
          searchPlaceholder="Search country or code"
          triggerClassName="h-auto min-h-9 w-auto shrink-0 self-stretch rounded-none border-0 bg-transparent px-2.5 shadow-none focus-visible:ring-0"
          trigger={(option: PhoneCountrySelectChoice) => (
            <span className="inline-flex items-center whitespace-nowrap text-text-warm">
              <span aria-hidden className="text-base leading-none">
                {option.flag}
              </span>
              <span aria-hidden data-contact-separator="prefix"> | </span>
              <span className="tabular-nums">+{option.callingCode}</span>
            </span>
          )}
          renderOption={(option) => (
            <span className="flex w-full min-w-0 items-center gap-2">
              <span aria-hidden className="text-base leading-none">
                {option.flag}
              </span>
              <span className="min-w-0 flex-1 whitespace-normal">{option.name}</span>
              <span className="shrink-0 tabular-nums text-current/80">+{option.callingCode}</span>
            </span>
          )}
          onChange={(nextCountry) => {
            onCountryChange(nextCountry);
            onLocalNumberChange(normalizeLocalPhoneInput(nextCountry, localNumber));
          }}
        />
        <span aria-hidden data-contact-separator="number"> - </span>
        <Input
          id={numberId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className="min-w-0 flex-1 border-0 shadow-none focus-visible:ring-0"
          placeholder={getPhonePlaceholder(countryCode)}
          value={localNumber}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          onChange={(event) => {
            onLocalNumberChange(
              normalizeLocalPhoneInput(countryCode, event.target.value)
            );
          }}
        />
      </div>
      {error ? (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
