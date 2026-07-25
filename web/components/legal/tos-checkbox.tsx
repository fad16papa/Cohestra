"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type TosCheckboxProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  className?: string;
  disabled?: boolean;
};

export function TosCheckbox({
  checked,
  onCheckedChange,
  id = "accept-legal",
  className,
  disabled = false,
}: TosCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-stone",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className="mt-1 size-4 shrink-0 rounded-sm border-line-strong text-lagoon focus-visible:ring-2 focus-visible:ring-lagoon/40"
      />
      <span>
        I agree to the{" "}
        <Link href="/terms" className="font-medium text-ink underline-offset-2 hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="font-medium text-ink underline-offset-2 hover:underline">
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
