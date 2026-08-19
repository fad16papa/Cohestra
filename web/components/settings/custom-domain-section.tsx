"use client";

import { Globe } from "lucide-react";

export function CustomDomainSection() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-border-warm bg-muted/15 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-text-muted-warm">
        <Globe className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 space-y-2">
        <div>
          <h2 className="text-sm font-semibold text-text-warm">Custom domain</h2>
          <p className="mt-1 text-sm leading-relaxed text-text-muted-warm">
            Enterprise plans can use your own hostname for public homepage and registration
            links. Custom domains are coming soon.
          </p>
        </div>
        <p className="text-sm">
          <a
            href="mailto:hello@cohestra.app?subject=Enterprise%20custom%20domain"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Join the waitlist — hello@cohestra.app
          </a>
        </p>
      </div>
    </div>
  );
}
