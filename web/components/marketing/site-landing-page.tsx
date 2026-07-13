"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, QrCode, Sparkles, Users } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { LoginAmbientBackground } from "@/components/auth/login-ambient-background";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { fetchOnboardingStatus } from "@/lib/auth-api";
import { getSiteLandingConfig } from "@/lib/site-landing-config";
import { PLATFORM_LOGO_PATH } from "@/lib/brand-assets";
import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: CalendarDays,
    title: "Discover activities",
    description: "Workshops, game nights, sports, and social gatherings in one place.",
  },
  {
    icon: QrCode,
    title: "Register in seconds",
    description: "Scan a QR code or open a link — no account needed to sign up for an event.",
  },
  {
    icon: Users,
    title: "Stay in the loop",
    description: "Your details are kept on file so organisers can follow up with care and consent.",
  },
];

export function SiteLandingPage() {
  const config = getSiteLandingConfig();
  const { status } = useAuth();
  const [registerAvailable, setRegisterAvailable] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      window.location.replace("/dashboard");
    }
  }, [status]);

  useEffect(() => {
    void fetchOnboardingStatus()
      .then((result) => setRegisterAvailable(result.registrationAvailable))
      .catch(() => setRegisterAvailable(false));
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <LoginAmbientBackground />

      <header className="relative z-10 flex items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-card/90 p-2 shadow-sm ring-1 ring-border-warm backdrop-blur-sm">
            <Image
              src={PLATFORM_LOGO_PATH}
              alt=""
              width={28}
              height={28}
              className="size-7 object-contain"
            />
          </span>
          <div>
            <p className="text-sm font-semibold text-text-warm">{config.siteName}</p>
            <p className="text-xs text-text-muted-warm">{config.heroEyebrow}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-card/70 p-0.5 shadow-sm ring-1 ring-border-warm/80 backdrop-blur-sm">
            <ThemeToggle variant="public" />
          </div>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "default", size: "sm" }), "hidden sm:inline-flex")}
          >
            {config.operatorCtaLabel}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 pb-16 pt-8 sm:px-8 lg:px-12 lg:pb-20 lg:pt-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-14">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              {config.heroEyebrow}
            </div>
            <h1 className="text-display text-balance text-text-warm">{config.tagline}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-text-muted-warm">
              {config.description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                {config.operatorCtaLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              {registerAvailable ? (
                <Link
                  href="/register"
                  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                >
                  Create operator account
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-text-muted-warm">
              Received an event link or QR code? Open it directly — you do not need to start from
              this page.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-border-warm bg-card/80 p-5 shadow-sm backdrop-blur-sm motion-safe:animate-fade-in-up"
                  style={{ animationDelay: `${100 + index * 80}ms` }}
                >
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h2 className="text-base font-semibold text-text-warm">{item.title}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted-warm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-border-warm bg-card/70 p-8 shadow-sm backdrop-blur-sm sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-section text-text-warm">For community operators</h2>
              <p className="mt-3 text-text-muted-warm">
                Manage activities, registrations, client follow-up, email campaigns, and reports
                from one workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/login" className={buttonVariants({ size: "lg" })}>
                Go to operator login
              </Link>
              {registerAvailable ? (
                <Link href="/register" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Set up operator account
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/60 bg-background/80 px-5 py-4 backdrop-blur-sm sm:px-8">
        <p className="text-center text-xs text-muted-foreground sm:text-sm">
          {config.poweredByLabel}
          <span aria-hidden="true"> · </span>
          {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
