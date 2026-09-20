import { CalendarDays, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";

type RegistrationActivityMetadataProps = {
  schedule: string;
  location: string;
  className?: string;
  rowClassName?: string;
};

export function RegistrationActivityMetadata({
  schedule,
  location,
  className,
  rowClassName,
}: RegistrationActivityMetadataProps) {
  if (!schedule.trim() && !location.trim()) {
    return null;
  }

  return (
    <dl
      className={cn(
        "mx-auto flex w-full max-w-md flex-col gap-2.5 text-left sm:max-w-lg",
        className
      )}
    >
      {schedule.trim() ? (
        <div className={cn("flex gap-3", rowClassName)}>
          <dt className="sr-only">When</dt>
          <CalendarDays
            className="mt-0.5 size-4 shrink-0 text-primary/80"
            aria-hidden
          />
          <dd className="min-w-0 flex-1 text-pretty leading-snug">{schedule}</dd>
        </div>
      ) : null}
      {location.trim() ? (
        <div className={cn("flex gap-3", rowClassName)}>
          <dt className="sr-only">Where</dt>
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-primary/80"
            aria-hidden
          />
          <dd className="min-w-0 flex-1 text-pretty leading-snug">{location}</dd>
        </div>
      ) : null}
    </dl>
  );
}
