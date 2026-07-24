import Link from "next/link";

import { marketingAtelierButtonClass } from "@/components/marketing/marketing-shell";
import type { PublicHomepageActivity } from "@/lib/public-site-api";

type StubHomeProps = {
  tenantName: string;
  activities: PublicHomepageActivity[];
};

export function StubHome({ tenantName, activities }: StubHomeProps) {
  return (
    <div className="min-h-screen bg-[#0A0F14] text-paper">
      <header className="relative flex min-h-[42vh] items-end overflow-hidden px-5 pb-16 pt-20">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,color-mix(in_srgb,var(--lagoon,#0B6B63)_35%,transparent),#0A0F14)]"
        />
        <div className="relative z-10 mx-auto w-full max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gold">
            Public door
          </p>
          <h1 className="mt-3 font-serif text-4xl font-medium tracking-tight text-paper sm:text-5xl">
            {tenantName}
          </h1>
          <p className="mt-3 max-w-sm text-base text-paper/85">
            Browse published activities and register in a few steps.
          </p>
        </div>
      </header>

      <div className="relative z-10 mx-auto -mt-10 max-w-xl px-5 pb-16">
        <section className="overflow-hidden rounded-2xl bg-paper shadow-[0_32px_64px_rgba(0,0,0,0.35)]">
          <div className="border-b border-line px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone">
            Published activities
          </div>
          {activities.length === 0 ? (
            <p className="px-5 py-8 text-sm text-stone">No published activities yet.</p>
          ) : (
            <ul>
              {activities.map((activity) => (
                <li key={activity.slug} className="border-b border-line last:border-b-0">
                  <Link
                    href={`/register/${activity.slug}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 px-5 py-5 transition hover:bg-[#F7F8FA]"
                  >
                    <div>
                      <strong className="block font-serif text-lg font-medium tracking-tight text-ink">
                        {activity.name}
                      </strong>
                      <span className="text-sm text-stone">
                        {[activity.schedule, activity.location].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span className={marketingAtelierButtonClass("lagoon")}>Register</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
