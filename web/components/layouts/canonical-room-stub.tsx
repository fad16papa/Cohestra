import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { ProductErrorState } from "@/components/shared/product-error-state";

export type CanonicalRoomStubState = "empty" | "loading" | "error";

type CanonicalRoomStubProps = {
  title: string;
  state?: CanonicalRoomStubState;
  emptyTitle: string;
  emptyDescription: string;
  icon: LucideIcon;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  errorMessage?: string;
};

export function CanonicalRoomLoading({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <div role="status" aria-live="polite">
        <p className="text-sm text-text-muted-warm">Loading {title}…</p>
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

export function CanonicalRoomStub({
  title,
  state = "empty",
  emptyTitle,
  emptyDescription,
  icon,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  errorMessage = "This room could not be loaded.",
}: CanonicalRoomStubProps) {
  if (state === "loading") {
    return <CanonicalRoomLoading title={title} />;
  }

  if (state === "error") {
    return (
      <div className="space-y-6">
        <PageHeader title={title} />
        <ProductErrorState
          message={errorMessage}
          backHref={primaryHref}
          backLabel={primaryLabel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={title} />
      <ProductEmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
        primaryHref={primaryHref}
        primaryLabel={primaryLabel}
        secondaryHref={secondaryHref}
        secondaryLabel={secondaryLabel}
      />
    </div>
  );
}
