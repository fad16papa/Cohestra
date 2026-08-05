"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { markWebsiteBuilderTourCompleted } from "@/lib/website-builder-preferences";
import type { WebsiteBuilderEditorTab } from "@/lib/website-builder-tour";
import type { WebsiteBuilderTourStep } from "@/lib/website-builder-tour";
import { cn } from "@/lib/utils";

type WebsiteBuilderOnboardingTourProps = {
  steps: WebsiteBuilderTourStep[];
  open: boolean;
  activeTab: WebsiteBuilderEditorTab;
  onClose: () => void;
  onRequestTab: (tab: WebsiteBuilderEditorTab) => void;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ResolvedPlacement = "top" | "bottom" | "left" | "right";

type TooltipPosition = {
  top: number;
  left: number;
  transform?: string;
  placement: ResolvedPlacement;
};

const MEASURE_RETRY_MS = 100;
const MAX_MEASURE_ATTEMPTS = 12;
const TOOLTIP_WIDTH = 352;
const TOOLTIP_HEIGHT = 200;
const VIEWPORT_MARGIN = 16;
const TOOLTIP_GAP = 12;

export function WebsiteBuilderOnboardingTour({
  steps,
  open,
  activeTab,
  onClose,
  onRequestTab,
}: WebsiteBuilderOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;
  const tabReady = !step?.tab || step.tab === activeTab;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setTargetRect(null);
    }
  }, [open]);

  const measureTarget = useCallback(() => {
    if (!open || !step) {
      setTargetRect(null);
      return false;
    }

    const element = document.querySelector(step.targetSelector);
    if (!element || !isElementVisible(element)) {
      setTargetRect(null);
      return false;
    }

    element.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });

    const rect = element.getBoundingClientRect();
    const padding = 8;
    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
    return true;
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !step) {
      return;
    }

    if (step.tab && step.tab !== activeTab) {
      onRequestTab(step.tab);
      setTargetRect(null);
      return;
    }

    let cancelled = false;
    let retryTimer: number | undefined;

    const attemptMeasure = (attempt = 0) => {
      if (cancelled) {
        return;
      }

      const found = measureTarget();
      if (!found && attempt < MAX_MEASURE_ATTEMPTS) {
        retryTimer = window.setTimeout(
          () => attemptMeasure(attempt + 1),
          MEASURE_RETRY_MS
        );
        return;
      }

      if (found) {
        window.requestAnimationFrame(() => {
          if (!cancelled) {
            measureTarget();
          }
        });
      }
    };

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        attemptMeasure();
      });
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
    };
  }, [activeTab, measureTarget, onRequestTab, open, step, stepIndex]);

  useEffect(() => {
    if (!open || !tabReady) {
      return;
    }

    const remeasure = () => {
      window.requestAnimationFrame(() => {
        measureTarget();
      });
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
    };
  }, [measureTarget, open, stepIndex, tabReady]);

  function finishTour() {
    markWebsiteBuilderTourCompleted();
    onClose();
  }

  function handleNext() {
    if (isLast) {
      finishTour();
      return;
    }

    setTargetRect(null);
    setStepIndex((current) => current + 1);
  }

  function handleSkip() {
    finishTour();
  }

  if (!open || !step || steps.length === 0 || !mounted) {
    return null;
  }

  const tooltipPosition = resolveTooltipPosition(
    targetRect,
    step.placement ?? "bottom"
  );

  // Portal to document.body so fixed positioning uses the viewport. Admin <main>
  // keeps a transform from page-enter animation, which would break in-tree fixed.
  return createPortal(
    <div className="fixed inset-0 z-[200]" aria-live="polite">
      <div
        className="fixed inset-0 bg-black/55"
        aria-hidden
        onClick={handleSkip}
      />

      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-4 ring-primary/80 ring-offset-2 ring-offset-background transition-all duration-200"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
      ) : null}

      <div
        className={cn(
          "fixed z-[201] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border-warm bg-card p-4 shadow-xl",
          !targetRect && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={
          targetRect
            ? {
                top: tooltipPosition.top,
                left: tooltipPosition.left,
                transform: tooltipPosition.transform,
              }
            : undefined
        }
        role="dialog"
        aria-labelledby="website-builder-tour-title"
        aria-describedby="website-builder-tour-body"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-primary">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h3 id="website-builder-tour-title" className="mt-1 text-base font-semibold text-text-warm">
          {step.title}
        </h3>
        <p id="website-builder-tour-body" className="mt-2 text-sm text-text-muted-warm">
          {step.body}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
            Skip tour
          </Button>
          <Button type="button" size="sm" onClick={handleNext}>
            {isLast ? "Got it" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  let current: HTMLElement | null = element;
  while (current) {
    if (current.hidden || current.getAttribute("aria-hidden") === "true") {
      return false;
    }

    const style = window.getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return false;
    }

    current = current.parentElement;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 8 && rect.height > 8;
}

function resolveTooltipPosition(
  rect: TargetRect | null,
  preferred: ResolvedPlacement
): TooltipPosition {
  if (!rect) {
    return { top: 0, left: 0, placement: preferred };
  }

  const maxWidth = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const candidates: ResolvedPlacement[] = [
    preferred,
    "bottom",
    "top",
    "right",
    "left",
  ].filter((value, index, array) => array.indexOf(value) === index);

  for (const placement of candidates) {
    const position = computeTooltipPosition(rect, placement, maxWidth);
    if (fitsViewport(position, maxWidth)) {
      return position;
    }
  }

  return computeTooltipPosition(rect, "bottom", maxWidth);
}

function computeTooltipPosition(
  rect: TargetRect,
  placement: ResolvedPlacement,
  maxWidth: number
): TooltipPosition {
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;

  switch (placement) {
    case "top":
      return {
        placement,
        top: rect.top - TOOLTIP_GAP,
        left: clamp(
          targetCenterX - maxWidth / 2,
          VIEWPORT_MARGIN,
          window.innerWidth - maxWidth - VIEWPORT_MARGIN
        ),
        transform: "translateY(-100%)",
      };
    case "left":
      return {
        placement,
        top: clamp(
          targetCenterY - TOOLTIP_HEIGHT / 2,
          VIEWPORT_MARGIN,
          window.innerHeight - TOOLTIP_HEIGHT - VIEWPORT_MARGIN
        ),
        left: rect.left - TOOLTIP_GAP,
        transform: "translateX(-100%)",
      };
    case "right":
      return {
        placement,
        top: clamp(
          targetCenterY - TOOLTIP_HEIGHT / 2,
          VIEWPORT_MARGIN,
          window.innerHeight - TOOLTIP_HEIGHT - VIEWPORT_MARGIN
        ),
        left: rect.left + rect.width + TOOLTIP_GAP,
      };
    case "bottom":
    default:
      return {
        placement: "bottom",
        top: rect.top + rect.height + TOOLTIP_GAP,
        left: clamp(
          targetCenterX - maxWidth / 2,
          VIEWPORT_MARGIN,
          window.innerWidth - maxWidth - VIEWPORT_MARGIN
        ),
      };
  }
}

function fitsViewport(position: TooltipPosition, maxWidth: number): boolean {
  const height = TOOLTIP_HEIGHT;
  let left = position.left;
  let top = position.top;

  if (position.transform?.includes("translateX(-100%)")) {
    left -= maxWidth;
  }
  if (position.transform?.includes("translateY(-100%)")) {
    top -= height;
  }

  return (
    left >= VIEWPORT_MARGIN
    && top >= VIEWPORT_MARGIN
    && left + maxWidth <= window.innerWidth - VIEWPORT_MARGIN
    && top + height <= window.innerHeight - VIEWPORT_MARGIN
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
