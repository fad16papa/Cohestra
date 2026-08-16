"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";

export function PlatformHeader() {
  const { logout, profile } = useAuth();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/platform", label: "Tenants" },
    { href: "/platform/support", label: "Support" },
  ];

  return (
    <header className="border-b border-[var(--plat-line)] bg-[var(--plat-ink)] text-[var(--plat-paper)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
        <div className="flex items-baseline gap-3">
          <Link
            href="/platform"
            className="text-lg tracking-tight"
            style={{ fontFamily: "var(--font-plat-display), Georgia, serif" }}
          >
            Cohestra
          </Link>
          <p className="text-sm text-[var(--plat-stone)]">Platform</p>
        </div>

        <nav className="hidden items-center gap-5 text-sm sm:flex" aria-label="Platform">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[var(--plat-paper)]/90 transition-colors hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          {profile?.email ? (
            <span className="text-[var(--plat-stone)]">{profile.email}</span>
          ) : null}
          <button
            type="button"
            onClick={logout}
            className="text-[var(--plat-paper)]/90 transition-colors hover:text-white"
          >
            Sign out
          </button>
        </nav>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-[10px] border border-white/15 sm:hidden"
          aria-expanded={open}
          aria-controls="platform-mobile-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <nav
          id="platform-mobile-nav"
          className="border-t border-white/10 px-5 py-3 sm:hidden"
          aria-label="Platform mobile"
        >
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="block rounded-[10px] px-3 py-2.5 text-sm hover:bg-white/5"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {profile?.email ? (
              <li className="px-3 py-2 text-sm text-[var(--plat-stone)]">{profile.email}</li>
            ) : null}
            <li>
              <button
                type="button"
                className="block w-full rounded-[10px] px-3 py-2.5 text-left text-sm hover:bg-white/5"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
              >
                Sign out
              </button>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
