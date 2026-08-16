"use client";

import { cn } from "@/lib/utils";

/** Soft CSS 3D orbs + cookie discs — decorative only, no WebGL dependency. */
export function MarketingAmbientScene({
  variant = "default",
  className,
}: {
  variant?: "default" | "pricing" | "hero";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        "[perspective:1200px]",
        className
      )}
    >
      <div
        className={cn(
          "absolute -left-[12%] top-[8%] size-48 rounded-full bg-lagoon/12 blur-3xl",
          "animate-marketing-float-slow [transform-style:preserve-3d]"
        )}
        style={{ transform: "translateZ(-40px) rotateX(12deg)" }}
      />
      <div
        className={cn(
          "absolute -right-[8%] top-[22%] size-56 rounded-full bg-gold/15 blur-3xl",
          "animate-marketing-float [transform-style:preserve-3d]"
        )}
        style={{ transform: "translateZ(-20px) rotateY(-8deg)" }}
      />
      {variant !== "pricing" ? (
        <div
          className={cn(
            "absolute left-[6%] top-[42%] size-32 rounded-full bg-lagoon/8 blur-2xl",
            "animate-marketing-float-delayed"
          )}
        />
      ) : null}

      {/* Cookie discs — playful atelier motif */}
      <MarketingCookieDisc
        className="left-[8%] top-[18%] rotate-[-18deg] animate-marketing-float"
        size={56}
        chips={4}
      />
      <MarketingCookieDisc
        className="right-[10%] top-[12%] rotate-[14deg] animate-marketing-float-delayed"
        size={44}
        chips={3}
      />
      {variant === "hero" ? (
        <MarketingCookieDisc
          className="right-[22%] bottom-[28%] rotate-[6deg] animate-marketing-float-slow"
          size={36}
          chips={2}
        />
      ) : null}
      {variant === "pricing" ? (
        <MarketingCookieDisc
          className="left-[42%] bottom-[8%] rotate-[-8deg] animate-marketing-float-slow opacity-60"
          size={48}
          chips={3}
        />
      ) : null}
    </div>
  );
}

function MarketingCookieDisc({
  className,
  size,
  chips,
}: {
  className?: string;
  size: number;
  chips: number;
}) {
  const chipOffsets = [
    { top: "22%", left: "28%" },
    { top: "55%", left: "62%" },
    { top: "38%", left: "72%" },
    { top: "68%", left: "35%" },
  ].slice(0, chips);

  return (
    <div
      className={cn(
        "absolute rounded-full border border-gold/25 bg-gradient-to-br from-[#f5e6c8] to-[#e8c98a] shadow-[0_12px_32px_rgba(7,13,18,0.12)]",
        "[transform-style:preserve-3d]",
        className
      )}
      style={{ width: size, height: size, transform: "translateZ(24px)" }}
    >
      {chipOffsets.map((chip, index) => (
        <span
          key={index}
          className="absolute size-1.5 rounded-full bg-ink/35"
          style={{ top: chip.top, left: chip.left }}
        />
      ))}
    </div>
  );
}
