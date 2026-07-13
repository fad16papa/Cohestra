import { cn } from "@/lib/utils";

const statuses = [
  { label: "New", className: "bg-status-new text-status-new-foreground" },
  {
    label: "Contacted",
    className: "bg-status-contacted text-status-contacted-foreground",
  },
  {
    label: "Active",
    className: "bg-status-active text-status-active-foreground",
  },
  {
    label: "Inactive",
    className: "bg-status-inactive text-status-inactive-foreground",
  },
] as const;

export function BrandTokenPreview() {
  return (
    <div className="space-y-3 rounded-lg border border-border-warm bg-surface-warm p-4">
      <p className="text-section text-text-warm">Brand tokens</p>
      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => (
          <span
            key={status.label}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium",
              status.className
            )}
          >
            {status.label}
          </span>
        ))}
        <span className="rounded-full bg-whatsapp px-2.5 py-0.5 text-xs font-medium text-whatsapp-foreground">
          WhatsApp
        </span>
      </div>
    </div>
  );
}
