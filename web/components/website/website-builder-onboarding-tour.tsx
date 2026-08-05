"use client";

import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from "react";

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

const MEASURE_RETRY_MS = 80;

export function WebsiteBuilderOnboardingTour({
  steps,
  open,
  activeTab,
  onClose,
  onRequestTab,
}: WebsiteBuilderOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;
  const tabReady = !step?.tab || step.tab === activeTab;

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

    element.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
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
      if (!found && attempt < 4) {
        retryTimer = window.setTimeout(() => attemptMeasure(attempt + 1), MEASURE_RETRY_MS);
      }
    };

    const frame = window.requestAnimationFrame(() => {
      attemptMeasure();
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

    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
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

  if (!open || !step || steps.length === 0) {
    return null;
  }

  const tooltipStyle = getTooltipStyle(targetRect, step.placement ?? "bottom");

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      <div
        className="absolute inset-0 bg-black/55 transition-opacity"
        aria-hidden
        onClick={handleSkip}
      />

      {targetRect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-4 ring-primary/80 ring-offset-2 ring-offset-background transition-all duration-200"
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
          "absolute z-[101] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border-warm bg-card p-4 shadow-xl",
          !targetRect && "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={targetRect ? tooltipStyle : undefined}
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
    </div>
  );
}

function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getTooltipStyle(
  rect: TargetRect | null,
  placement: "top" | "bottom" | "left" | "right"
): CSSProperties | undefined {
  if (!rect) {
    return undefined;
  }

  const gap = 12;
  const maxWidth = Math.min(352, window.innerWidth - 32);
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;

  switch (placement) {
    case "top":
      return {
        top: Math.max(16, rect.top - gap),
        left: clamp(targetCenterX - maxWidth / 2, 16, window.innerWidth - maxWidth - 16),
        transform: "translateY(-100%)",
      };
    case "left":
      return {
        top: clamp(targetCenterY - 80, 16, window.innerHeight - 200),
        left: Math.max(16, rect.left - gap),
        transform: "translateX(-100%)",
      };
    case "right":
      return {
        top: clamp(targetCenterY - 80, 16, window.innerHeight - 200),
        left: Math.min(rect.left + rect.width + gap, window.innerWidth - maxWidth - 16),
      };
    case "bottom":
    default:
      return {
        top: Math.min(rect.top + rect.height + gap, window.innerHeight - 180),
        left: clamp(targetCenterX - maxWidth / 2, 16, window.innerWidth - maxWidth - 16),
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
