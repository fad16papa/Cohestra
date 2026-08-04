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
  onClose: () => void;
  onRequestTab: (tab: WebsiteBuilderEditorTab) => void;
};

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function WebsiteBuilderOnboardingTour({
  steps,
  open,
  onClose,
  onRequestTab,
}: WebsiteBuilderOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  const measureTarget = useCallback(() => {
    if (!open || !step) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.targetSelector);
    if (!element) {
      setTargetRect(null);
      return;
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
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !step) {
      return;
    }

    if (step.tab) {
      onRequestTab(step.tab);
    }

    const frame = window.requestAnimationFrame(() => {
      measureTarget();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [measureTarget, onRequestTab, open, step, stepIndex]);

  useEffect(() => {
    if (!open) {
      return;
    }

    measureTarget();
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget, open, stepIndex]);

  function finishTour() {
    markWebsiteBuilderTourCompleted();
    onClose();
  }

  function handleNext() {
    if (isLast) {
      finishTour();
      return;
    }

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

function getTooltipStyle(
  rect: TargetRect | null,
  placement: "top" | "bottom" | "left" | "right"
): CSSProperties | undefined {
  if (!rect) {
    return undefined;
  }

  const gap = 12;
  const maxWidth = Math.min(352, window.innerWidth - 32);

  switch (placement) {
    case "top":
      return {
        top: Math.max(16, rect.top - gap),
        left: clamp(rect.left, 16, window.innerWidth - maxWidth - 16),
        transform: "translateY(-100%)",
      };
    case "left":
      return {
        top: clamp(rect.top, 16, window.innerHeight - 200),
        left: Math.max(16, rect.left - gap),
        transform: "translateX(-100%)",
      };
    case "right":
      return {
        top: clamp(rect.top, 16, window.innerHeight - 200),
        left: rect.left + rect.width + gap,
      };
    case "bottom":
    default:
      return {
        top: rect.top + rect.height + gap,
        left: clamp(rect.left, 16, window.innerWidth - maxWidth - 16),
      };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
