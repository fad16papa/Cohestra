import { RegistrationCapacityStatus } from "@/components/registration/registration-capacity-status";
import type { ResolvedFormDomainBlock } from "@/lib/form-domain-blocks";
import { cn } from "@/lib/utils";

export function RegistrationDomainBlock({
  resolved,
  className,
}: {
  resolved: ResolvedFormDomainBlock;
  className?: string;
}) {
  if (!resolved.visible) {
    return null;
  }

  if (resolved.domain === "activityDetails") {
    return (
      <div
        className={cn("min-w-0 space-y-2 text-sm", className)}
        data-domain-block="activityDetails"
      >
        {resolved.schedule ? (
          <p className="min-w-0">
            <span className="font-medium text-text-warm">When</span>
            <span className="text-text-muted-warm"> · </span>
            <span className="break-words text-text-warm">{resolved.schedule}</span>
          </p>
        ) : null}
        {resolved.location ? (
          <p className="min-w-0">
            <span className="font-medium text-text-warm">Where</span>
            <span className="text-text-muted-warm"> · </span>
            <span className="break-words text-text-warm">{resolved.location}</span>
          </p>
        ) : null}
      </div>
    );
  }

  if (resolved.domain === "communityIdentity") {
    return (
      <div
        className={cn("flex min-w-0 items-center gap-3", className)}
        data-domain-block="communityIdentity"
      >
        {resolved.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolved.logoUrl}
            alt={resolved.logoAlt}
            className="size-10 shrink-0 rounded-md object-cover"
          />
        ) : null}
        {resolved.communityLabel ? (
          <p className="min-w-0 break-words text-sm font-medium text-text-warm">
            {resolved.communityLabel}
          </p>
        ) : null}
      </div>
    );
  }

  if (resolved.domain === "capacityStatus") {
    return (
      <div data-domain-block="capacityStatus" className={className}>
        <RegistrationCapacityStatus summary={resolved.summary} />
      </div>
    );
  }

  return null;
}
