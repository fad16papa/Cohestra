import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProductErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
  actions?: ReactNode;
};

export function ProductErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Try again",
  backHref,
  backLabel = "Go back",
  className,
  actions,
}: ProductErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-destructive/20 bg-card/80 px-6 py-10 text-center backdrop-blur-sm sm:px-10",
        className
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-6" aria-hidden />
        </span>
        <h2 className="mt-4 text-section text-text-warm">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">{message}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <Button type="button" onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {backHref ? (
            <a href={backHref} className={buttonVariants({ variant: "outline" })}>
              {backLabel}
            </a>
          ) : null}
          {actions}
        </div>
      </div>
    </div>
  );
}
