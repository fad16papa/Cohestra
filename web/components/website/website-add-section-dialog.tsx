"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isProPlan } from "@/lib/shell/tenant-shell-api";
import {
  ESSENTIALS_SECTION_TYPES,
  SECTION_TYPE_LABELS,
  STUDIO_SECTION_TYPES,
  type AddableSectionType,
} from "@/lib/site-sections/registry";
import { MAX_SECTIONS } from "@/lib/site-sections/limits";
import { cn } from "@/lib/utils";

type WebsiteAddSectionDialogProps = {
  plan: string;
  disabled?: boolean;
  currentSectionCount: number;
  addableTypes: AddableSectionType[];
  onAddSection: (type: AddableSectionType) => void;
};

function SectionPickerGroup({
  title,
  types,
  disabled,
  onAddSection,
  onPick,
}: {
  title: string;
  types: readonly AddableSectionType[];
  disabled?: boolean;
  onAddSection: (type: AddableSectionType) => void;
  onPick: () => void;
}) {
  if (types.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted-warm">
        {title}
      </p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {types.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            className={cn(
              "rounded-lg border border-border-warm bg-background px-3 py-2 text-left text-sm font-medium text-text-warm transition-colors",
              "hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50",
            )}
            onClick={() => {
              onAddSection(type);
              onPick();
            }}
          >
            {SECTION_TYPE_LABELS[type] ?? type}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WebsiteAddSectionDialog({
  plan,
  disabled = false,
  currentSectionCount,
  addableTypes,
  onAddSection,
}: WebsiteAddSectionDialogProps) {
  const [open, setOpen] = useState(false);
  const essentials = ESSENTIALS_SECTION_TYPES.filter((type) =>
    addableTypes.includes(type),
  );
  const studio = STUDIO_SECTION_TYPES.filter((type) =>
    addableTypes.includes(type),
  );
  const atLimit = currentSectionCount >= MAX_SECTIONS;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8"
        disabled={disabled || atLimit}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" aria-hidden />
        Add section
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(85dvh,640px)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add homepage section</DialogTitle>
            <DialogDescription>
              Choose a section type to append to your homepage. Up to {MAX_SECTIONS}{" "}
              sections total.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <SectionPickerGroup
              title="Core"
              types={essentials}
              disabled={disabled || atLimit}
              onAddSection={onAddSection}
              onPick={() => setOpen(false)}
            />
            {isProPlan(plan) ? (
              <SectionPickerGroup
                title="Studio"
                types={studio}
                disabled={disabled || atLimit}
                onAddSection={onAddSection}
                onPick={() => setOpen(false)}
              />
            ) : studio.length > 0 ? (
              <p className="text-xs text-text-muted-warm">
                Carousel, testimonials, FAQ, and other studio sections unlock on Pro.
              </p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
