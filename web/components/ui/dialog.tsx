"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { useModalInert } from "@/lib/use-modal-inert";
import { trapOverlayTab } from "@/lib/overlay-tab-trap";
import { cn } from "@/lib/utils";

function Dialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: DialogPrimitive.Root.Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(Boolean(defaultOpen));
  const isOpen = open ?? uncontrolledOpen;
  useModalInert(Boolean(isOpen));

  return (
    <DialogPrimitive.Root
      data-slot="dialog"
      {...props}
      {...(open !== undefined ? { open } : {})}
      {...(defaultOpen !== undefined ? { defaultOpen } : {})}
      onOpenChange={(next, eventDetails) => {
        if (open === undefined) {
          setUncontrolledOpen(next);
        }
        onOpenChange?.(next, eventDetails);
      }}
    />
  );
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/20 transition-opacity duration-[160ms] motion-reduce:transition-none data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  initialFocus,
  finalFocus,
  onKeyDown,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        initialFocus={initialFocus}
        finalFocus={finalFocus}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl border border-border-warm bg-popover p-6 text-popover-foreground shadow-lg transition duration-[160ms] ease-out motion-reduce:transition-none data-ending-style:duration-[160ms] data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
          className
        )}
        {...props}
        onKeyDown={(event) => {
          trapOverlayTab(event);
          onKeyDown?.(event);
        }}
      />
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-lg font-semibold text-text-warm", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-text-muted-warm", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
