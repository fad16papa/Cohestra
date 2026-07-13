import { cn } from "@/lib/utils";

type LoginAmbientBackgroundProps = {
  className?: string;
};

/** Soft mesh backdrop for the sign-in column — works in light and dark themes. */
export function LoginAmbientBackground({
  className,
}: LoginAmbientBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div className="absolute inset-0 bg-surface-warm dark:bg-background" />
      <div className="absolute -left-1/4 top-0 size-[32rem] rounded-full bg-primary/[0.07] blur-3xl dark:bg-primary/[0.12]" />
      <div className="absolute -right-1/4 top-1/3 size-[28rem] rounded-full bg-accent/[0.06] blur-3xl dark:bg-accent/[0.1]" />
      <div className="absolute bottom-0 left-1/3 size-80 rounded-full bg-primary/[0.04] blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, color-mix(in oklab, var(--border-warm) 55%, transparent) 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
