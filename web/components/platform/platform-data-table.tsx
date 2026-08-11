import type { ReactNode, ThHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type PlatformDataTableProps = {
  children: ReactNode;
  className?: string;
  minWidthClassName?: string;
};

export function PlatformDataTable({
  children,
  className,
  minWidthClassName = "min-w-[720px]",
}: PlatformDataTableProps) {
  return (
    <div className={cn("overflow-x-auto border-y border-[var(--plat-line)]", className)}>
      <table className={cn("w-full border-collapse text-left text-sm", minWidthClassName)}>
        {children}
      </table>
    </div>
  );
}

export function PlatformDataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-[var(--plat-line)] text-xs uppercase tracking-[0.06em] text-[var(--plat-stone)]">
        {children}
      </tr>
    </thead>
  );
}

export function PlatformDataTableHeaderCell({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("py-3 pr-4 font-semibold", className)} {...props}>
      {children}
    </th>
  );
}

export function PlatformDataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function PlatformDataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-[var(--plat-line)]/80 transition-colors hover:bg-white/60",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function PlatformDataTableCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cn("py-3.5 pr-4", className)}>{children}</td>;
}
