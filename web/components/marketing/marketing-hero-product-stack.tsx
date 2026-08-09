"use client";

import Image from "next/image";

import { LANDING_IMAGES } from "@/lib/marketing/landing-images";
import { cn } from "@/lib/utils";

const FLOAT_ROWS = [
  { name: "Elena M.", meta: "Sunday clinic", pill: "New" },
  { name: "Sam R.", meta: "Clinic, also board games", pill: "Returning" },
  { name: "Jordan K.", meta: "Youth open play", pill: "New" },
] as const;

function HeroCommunityPhoto() {
  return (
    <figure className="relative aspect-[4/5] w-full max-h-[520px] overflow-hidden rounded-[24px] shadow-[0_40px_80px_rgba(7,13,18,0.16)] sm:max-h-[580px] lg:aspect-[3/4] lg:max-h-none lg:min-h-[700px] xl:min-h-[760px]">
      <Image
        src={LANDING_IMAGES.hero.src}
        alt={LANDING_IMAGES.hero.alt}
        fill
        priority
        className="object-cover saturate-[0.92] contrast-[1.05]"
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink/[0.04] via-ink/15 to-ink/55" />
      <figcaption className="absolute inset-x-6 bottom-6 z-[2] max-w-[18ch] text-paper">
        <span className="text-section mb-2 block text-gold">Sunday clinic</span>
        <span className="font-[family-name:var(--font-fraunces)] text-lg leading-snug tracking-[-0.02em]">
          New and returning clients in one list.
        </span>
      </figcaption>
    </figure>
  );
}

function HeroClientsPreview() {
  return (
    <aside
      aria-label="Live clients preview"
      className={cn(
        "absolute z-[3] w-[min(100%,320px)] rounded-[16px] border border-line bg-paper p-4 shadow-[0_28px_60px_rgba(7,13,18,0.2)]",
        "right-0 bottom-[18%] max-lg:relative max-lg:mx-4 max-lg:-mt-12 max-lg:mb-0 max-lg:w-auto max-lg:max-w-none"
      )}
    >
      <p className="text-label mb-3 text-gold">Tonight&apos;s clients</p>
      {FLOAT_ROWS.map((row) => (
        <div
          key={row.name}
          className="flex items-baseline justify-between border-t border-line py-2.5 first:border-t-0 first:pt-0"
        >
          <div>
            <p className="text-sm font-semibold text-ink">{row.name}</p>
            <p className="text-xs text-stone">{row.meta}</p>
          </div>
          <span className="rounded-sm bg-lagoon/10 px-2 py-0.5 text-[0.625rem] font-bold tracking-wide text-lagoon uppercase">
            {row.pill}
          </span>
        </div>
      ))}
    </aside>
  );
}

export function MarketingHeroProductStack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "marketing-product-lift relative mx-auto w-full max-w-[640px] lg:flex lg:h-full lg:max-w-none lg:flex-col lg:justify-end",
        className
      )}
      aria-label="Community photo with live clients preview"
    >
      <HeroCommunityPhoto />
      <HeroClientsPreview />
    </div>
  );
}
