import {
  PLATFORM_NAME,
  PLATFORM_VENDOR,
  PLATFORM_VENDOR_URL,
} from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type PlatformBylineProps = {
  className?: string;
  showYear?: boolean;
  linkClassName?: string;
};

export function PlatformByline({
  className,
  showYear = false,
  linkClassName,
}: PlatformBylineProps) {
  const year = new Date().getFullYear();

  return (
    <span className={className}>
      {PLATFORM_NAME} by{" "}
      <a
        href={PLATFORM_VENDOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "font-medium text-foreground/80 underline-offset-4 transition-colors hover:text-foreground hover:underline",
          linkClassName
        )}
      >
        {PLATFORM_VENDOR}
      </a>
      {showYear ? (
        <>
          <span aria-hidden="true"> · </span>
          <span>{year}</span>
        </>
      ) : null}
    </span>
  );
}
