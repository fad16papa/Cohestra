"use client";

import type { ButtonHTMLAttributes, DragEvent, PointerEvent } from "react";
import { GripVertical } from "lucide-react";

import { BUILDER_REORDER_HANDLE_ATTR } from "@/lib/builder-pointer-reorder";
import { cn } from "@/lib/utils";

type BuilderReorderHandleProps = {
  itemName: string;
  disabled?: boolean;
  dragging?: boolean;
  handleId?: string;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: (event: DragEvent<HTMLButtonElement>) => void;
  onPointerDown?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerMove?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (event: PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (event: PointerEvent<HTMLButtonElement>) => void;
  onLostPointerCapture?: (event: PointerEvent<HTMLButtonElement>) => void;
  onKeyDown?: ButtonHTMLAttributes<HTMLButtonElement>["onKeyDown"];
  className?: string;
};

export function BuilderReorderHandle({
  itemName,
  disabled = false,
  dragging = false,
  handleId,
  onDragStart,
  onDragEnd,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onLostPointerCapture,
  onKeyDown,
  className,
}: BuilderReorderHandleProps) {
  return (
    <button
      id={handleId}
      type="button"
      disabled={disabled}
      draggable={!disabled}
      aria-label={`Reorder ${itemName}`}
      aria-grabbed={dragging}
      {...{ [BUILDER_REORDER_HANDLE_ATTR]: "" }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onKeyDown={onKeyDown}
      className={cn(
        "mt-0.5 inline-flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-text-muted-warm outline-none touch-none select-none hover:bg-muted/60 hover:text-text-warm focus-visible:ring-2 focus-visible:ring-ring",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
}
