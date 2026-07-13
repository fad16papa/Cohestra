import { CalendarDays, Sparkles } from "lucide-react";

import { ProductEmptyState } from "@/components/shared/product-empty-state";

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
          Let&apos;s launch your first community moment
        </p>
        <h2 className="relative mt-3 text-display-sm text-text-warm">
          Your outreach cockpit is ready when you are
        </h2>
        <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-text-muted-warm">
          Create an activity, share the QR at your next event, and watch registrations
          flow into Clients — then follow up with campaigns in one calm workspace.
        </p>
        <ol className="relative mt-6 space-y-2 text-sm text-text-warm">
          <li>1. Create activity metadata and registration form</li>
          <li>2. Publish and share your QR / link</li>
          <li>3. Follow up with segmented email campaigns</li>
        </ol>
      </section>

      <ProductEmptyState
        icon={CalendarDays}
        title="Start with one activity"
        description="Most operators launch in under 15 minutes using a template form — you'll get a live registration link and QR code instantly."
        primaryHref="/activities/new"
        primaryLabel="Create your first activity"
        secondaryHref="/activities/communities"
        secondaryLabel="Set up communities"
      />
    </div>
  );
}
