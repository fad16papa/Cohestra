import Image from "next/image";
import Link from "next/link";

import {
  PLATFORM_LOGO_PATH,
  PLATFORM_NAME,
} from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

type CohestraLogoProps = {
  /** Show wordmark text beside the mark. */
  showWordmark?: boolean;
  /** Link mark (and wordmark) to home. */
  href?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  wordmarkClassName?: string;
};

const SIZE_MAP = {
  sm: { box: "size-8", img: 28, pad: "p-1" },
  md: { box: "size-9", img: 32, pad: "p-1" },
  lg: { box: "size-11", img: 40, pad: "p-1.5" },
} as const;

export function CohestraLogo({
  showWordmark = true,
  href = "/",
  size = "md",
  className,
  wordmarkClassName,
}: CohestraLogoProps) {
  const dims = SIZE_MAP[size];

  const content = (
    <>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px]",
          dims.box,
          dims.pad,
          className
        )}
      >
        <Image
          src={PLATFORM_LOGO_PATH}
          alt=""
          width={dims.img}
          height={dims.img}
          className="size-full object-contain"
          priority={size === "lg"}
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-[family-name:var(--font-fraunces)] text-[1.55rem] font-medium tracking-[-0.04em] text-ink",
            wordmarkClassName
          )}
        >
          {PLATFORM_NAME}
        </span>
      ) : null}
    </>
  );

  if (!href) {
    return (
      <span className={cn("inline-flex min-w-0 items-center gap-2.5", showWordmark && "gap-2.5")}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-w-0 items-center gap-2.5 rounded-[10px] outline-none ring-offset-paper focus-visible:ring-2 focus-visible:ring-lagoon/40",
        showWordmark && "gap-2.5"
      )}
    >
      {content}
    </Link>
  );
}
