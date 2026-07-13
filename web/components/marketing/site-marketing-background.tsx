import { cn } from "@/lib/utils";

type SiteMarketingBackgroundProps = {
  className?: string;
};

/** Premium mesh + grid backdrop for public marketing pages (Framer / Attio style). */
export function SiteMarketingBackground({ className }: SiteMarketingBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0 bg-background" />
      <div className="motion-safe:animate-marketing-gradient-drift absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent)]" />
      <div className="motion-safe:animate-marketing-float absolute -left-[20%] top-[10%] size-[36rem] rounded-full bg-primary/[0.06] blur-[100px] dark:bg-primary/[0.14]" />
      <div className="motion-safe:animate-marketing-float-slow absolute -right-[15%] top-[20%] size-[32rem] rounded-full bg-accent/[0.05] blur-[90px] dark:bg-accent/[0.12]" />
      <div className="motion-safe:animate-marketing-float-delayed absolute bottom-0 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-[80px]" />
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--border-warm) 35%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--border-warm) 35%, transparent) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 0%, black 20%, transparent 75%)",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-warm/80 to-transparent" />
    </div>
  );
}
