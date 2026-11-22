import { cn } from "@/lib/utils";
import { getCountryName } from "@/lib/countries";
import {
  formatPhoneDisplay,
  maskPhoneNationalNumber,
} from "@/lib/phone-countries";

type ClientPhoneDisplayProps = {
  phone: string | null | undefined;
  /** When true, shows e.g. +65 9339 ** ** (admin profile keeps full digits). */
  maskLastDigits?: boolean;
  className?: string;
  emptyLabel?: string;
  /** Master Profile uses flag | prefix - number. Other callers keep the default. */
  layout?: "default" | "master-profile";
};

export function ClientPhoneDisplay({
  phone,
  maskLastDigits = false,
  className,
  emptyLabel = "Not provided",
  layout = "default",
}: ClientPhoneDisplayProps) {
  const formatted = formatPhoneDisplay(phone);

  if (layout === "master-profile" && formatted) {
    const nationalDisplay = maskLastDigits
      ? maskPhoneNationalNumber(formatted.nationalNumber)
      : formatted.nationalNumber;
    const countryName = getCountryName(formatted.countryCode);

    return (
      <span
        data-contact-layout="flag-prefix-number"
        className={cn(
          "inline-flex max-w-full min-w-0 flex-nowrap items-center text-sm tabular-nums",
          className
        )}
      >
        <span aria-hidden className="text-base leading-none">
          {formatted.flag}
        </span>
        <span aria-hidden data-contact-separator="prefix"> | </span>
        <span aria-hidden className="font-medium text-text-muted-warm">
          {formatted.prefix}
        </span>
        <span aria-hidden data-contact-separator="number"> - </span>
        <span aria-hidden className="text-text-warm">
          {nationalDisplay}
        </span>
        <span className="sr-only">
          {countryName} {formatted.prefix} {nationalDisplay}
        </span>
      </span>
    );
  }

  if (!formatted) {
    return (
      <span className={cn("text-sm text-text-muted-warm", className)}>
        {phone?.trim() ? phone : emptyLabel}
      </span>
    );
  }

  const nationalDisplay = maskLastDigits
    ? maskPhoneNationalNumber(formatted.nationalNumber)
    : formatted.nationalNumber;
  const countryName = getCountryName(formatted.countryCode);

  return (
    <span
      className={cn(
        "inline-flex flex-wrap items-center gap-2 text-sm tabular-nums transition-colors",
        className
      )}
    >
      <span
        className="inline-flex size-7 items-center justify-center rounded-md border border-border-warm bg-muted/30 text-base leading-none motion-local motion-safe:transition-transform"
        aria-hidden
      >
        {formatted.flag}
      </span>
      <span className="text-text-warm">
        <span className="font-medium text-text-muted-warm">{formatted.prefix}</span>{" "}
        {nationalDisplay}
      </span>
      <span className="sr-only">
        {countryName} {formatted.display}
      </span>
    </span>
  );
}
