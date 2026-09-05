import Image from "next/image";

import { PublisherWebsiteTextLink } from "@/components/registration/publisher-website-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  PLATFORM_BYLINE,
  PLATFORM_LOGO_PATH,
  PLATFORM_NAME,
} from "@/lib/brand-assets";
import type { PublisherWebsiteLink } from "@/lib/publisher-website-url";

type PublicFormLayoutProps = {
  children: React.ReactNode;
  websiteLink?: PublisherWebsiteLink | null;
};

export function PublicFormLayout({
  children,
  websiteLink = null,
}: PublicFormLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface-warm">
      <header className="border-b border-border-warm/70 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary/10 p-2 ring-1 ring-primary/15">
              <Image
                src={PLATFORM_LOGO_PATH}
                alt=""
                width={28}
                height={28}
                className="size-7 object-contain"
              />
            </span>
            <div className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold text-text-warm">{PLATFORM_NAME}</p>
              <p className="truncate text-xs text-text-muted-warm">Community registration</p>
            </div>
          </div>
          <ThemeToggle variant="public" className="min-h-11 shrink-0 px-3" />
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center px-5 py-6 pb-8 sm:py-8">
        <div className="w-full min-w-0 max-w-[480px]">{children}</div>
      </main>

      <footer className="border-t border-border-warm/70 bg-card/60 px-5 py-6 text-center backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-3">
          <p className="text-sm font-medium text-text-warm">{PLATFORM_BYLINE}</p>
          {websiteLink ? <PublisherWebsiteTextLink link={websiteLink} /> : null}
          <p className="text-xs text-text-muted-warm">
            Secure registration powered by {PLATFORM_NAME}
          </p>
        </div>
      </footer>
    </div>
  );
}
