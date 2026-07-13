"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";

import {
  getThemeToggleAriaLabel,
  themeOptionLabels,
  themePreferences,
  type ThemePreference,
} from "./theme-config";
import { usePersistedThemePreference } from "./use-persisted-theme-preference";

const themeOptionIcons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

type ThemeToggleProps = {
  variant?: "admin" | "public";
  className?: string;
};

export function ThemeToggle({ variant = "admin", className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const { persistThemePreference, selected } = usePersistedThemePreference();
  const { showToast } = useToast();
  const mounted = useMounted();

  const preference =
    variant === "admin"
      ? selected
      : theme === "light" || theme === "dark" || theme === "system"
        ? theme
        : "system";
  const resolved: "light" | "dark" =
    resolvedTheme === "dark" ? "dark" : "light";
  const TriggerIcon = resolved === "dark" ? Moon : Sun;

  function selectTheme(next: ThemePreference) {
    if (variant === "public") {
      setTheme(next);
      return;
    }

    setTheme(next);
    void persistThemePreference(next).then((result) => {
      if (!result.ok) {
        showToast(result.message);
      }
    });
  }

  function handleOptionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight"
    ) {
      return;
    }

    event.preventDefault();
    const offset = event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 1;
    const nextIndex =
      (index + offset + themePreferences.length) % themePreferences.length;
    selectTheme(themePreferences[nextIndex]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
      [nextIndex]?.focus();
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size={variant === "admin" ? "icon" : "default"}
        className={className}
        disabled
        aria-label="Appearance: loading"
      >
        <Sun className="size-4" aria-hidden />
        {variant === "public" ? (
          <span className="hidden sm:inline">Appearance</span>
        ) : null}
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size={variant === "admin" ? "icon" : "default"}
            className={cn(
              variant === "public" && "gap-2",
              className
            )}
            aria-label={getThemeToggleAriaLabel(preference, resolved)}
          />
        }
      >
        <TriggerIcon className="size-4" aria-hidden />
        {variant === "public" ? (
          <span className="hidden sm:inline">Appearance</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div
          role="radiogroup"
          aria-label="Theme appearance"
          className="flex flex-col gap-1"
        >
          {themePreferences.map((option, index) => {
            const OptionIcon = themeOptionIcons[option];
            const isActive = preference === option;

            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => selectTheme(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, index)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <OptionIcon className="size-4 shrink-0" aria-hidden />
                {themeOptionLabels[option]}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
