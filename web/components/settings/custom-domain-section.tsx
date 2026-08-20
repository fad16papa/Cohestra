"use client";

import { Globe } from "lucide-react";

type CustomDomainSectionProps = {
  embedded?: boolean;
};

export function CustomDomainSection({ embedded = false }: CustomDomainSectionProps) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-text-muted-warm">
        <Globe className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 space-y-2">
        {!embedded ? (
          <div>
            <h2 className="text-sm font-semibold text-text-warm">Custom domain</h2>
            <p className="mt-1 text-sm leading-relaxed text-text-muted-warm">
              Enterprise plans can use your own hostname for public homepage and registration
              links. Custom domains are coming soon.
            </p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-text-muted-warm">
            Enterprise plans can use your own hostname for public homepage and registration
            links. Custom domains are coming soon.
          </p>
        )}
        <p className="text-sm">
          <a
            href="mailto:hello@cohestra.app?subject=Enterprise%20custom%20domain"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Join the waitlist — hello@cohestra.app
          </a>
        </p>
      </div>
    </section>
  );
}
