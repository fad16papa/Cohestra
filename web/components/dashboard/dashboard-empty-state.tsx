import Link from "next/link";
import { Compass, Sparkles } from "lucide-react";

import { ProductEmptyState } from "@/components/shared/product-empty-state";
import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";

export function DashboardEmptyState() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border-warm bg-gradient-to-br from-primary/15 via-card to-card p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-accent/20 blur-3xl"
        />
        <p className="relative flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" aria-hidden />
          Open your atelier
        </p>
        <h2 className="relative mt-3 text-display-sm text-text-warm">
          Start with one community, then your first activity
        </h2>
        <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-text-muted-warm">
          Basic is free forever — no card required. Create a community to organize your work,
          publish an activity, and share a registration link or QR at your next event.
        </p>
        <ol className="relative mt-6 space-y-2 text-sm text-text-warm">
          <li>1. Create a community (your program or venue)</li>
          <li>2. Add an activity with a registration form</li>
          <li>3. Publish and share the QR / link</li>
        </ol>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link href="/activities/communities" className={marketingAtelierButtonClass("lagoon")}>
            Create a community
          </Link>
          <Link href="/activities/new" className={marketingAtelierButtonClass("ghost")}>
            Skip to new activity
          </Link>
        </div>
      </section>

      <ProductEmptyState
        icon={Compass}
        title="Your workshop is ready"
        description="Most operators publish their first activity in under fifteen minutes. You'll get a live registration link and QR code instantly."
        primaryHref="/activities/communities"
        primaryLabel="Set up communities"
        secondaryHref="/activities/new"
        secondaryLabel="Create an activity"
      />
    </div>
  );
}
