"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { PersonAvatar } from "@/components/shared/person-avatar";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

function profileDisplayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function AdminUserMenu() {
  const { profile, logout, status } = useAuth();

  if (status !== "authenticated" || !profile) {
    return null;
  }

  const displayName = profileDisplayName(profile.email);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-2 px-2 hover:bg-muted/60"
            aria-label="Open account menu"
          />
        }
      >
        <PersonAvatar name={displayName} size="sm" className="size-8 text-xs" />
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-text-warm md:inline">
          {displayName}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-0">
        <PopoverHeader className="border-b border-border-warm px-3 py-3">
          <PopoverTitle className="text-text-warm">{displayName}</PopoverTitle>
          <PopoverDescription className="truncate text-xs">
            {profile.email}
          </PopoverDescription>
        </PopoverHeader>
        <div className="p-1.5">
          <Link
            href="/settings"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-text-warm transition-colors hover:bg-muted/60"
          >
            <Settings className="size-4 text-text-muted-warm" aria-hidden />
            Settings
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            onClick={logout}
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

