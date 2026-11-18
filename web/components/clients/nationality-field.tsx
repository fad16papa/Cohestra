"use client";

import { Label } from "@/components/ui/label";
import { SearchableListbox } from "@/components/clients/searchable-listbox";
import {
  buildNationalityChoices,
  type NationalityChoice,
} from "@/lib/nationalities";

type NationalityFieldProps = {
  id: string;
  value: string;
  savedValue: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function NationalityField({
  id,
  value,
  savedValue,
  disabled = false,
  onChange,
}: NationalityFieldProps) {
  const options = buildNationalityChoices(savedValue || value);

  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>Nationality</Label>
      <SearchableListbox
        id={id}
        ariaLabel={value.trim() ? `Nationality, ${value.trim()}` : "Nationality"}
        value={value}
        options={options}
        disabled={disabled}
        placeholder="Select nationality"
        searchPlaceholder="Search nationality"
        allowEmptyLabel="Not specified"
        emptyLabel="No matching nationality"
        trigger={(option: NationalityChoice) => (
          <span className="text-text-warm">
            {option.label}
            {option.legacy ? (
              <span className="ml-2 text-xs text-text-muted-warm">Saved value</span>
            ) : null}
          </span>
        )}
        renderOption={(option) => (
          <span className="min-w-0 whitespace-normal">
            {option.label}
            {option.legacy ? (
              <span className="mt-0.5 block text-xs opacity-80">Saved value</span>
            ) : null}
          </span>
        )}
        onChange={onChange}
      />
    </div>
  );
}
