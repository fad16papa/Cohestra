"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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

type ViewportBounds = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
};

const MEASURE_RETRY_MS = 80;
const MAX_MEASURE_ATTEMPTS = 16;
const VIEWPORT_MARGIN = 16;
const TOOLTIP_GAP = 12;
const TARGET_PADDING = 8;
const FALLBACK_TOOLTIP_WIDTH = 352;
const FALLBACK_TOOLTIP_HEIGHT = 168;

export function WebsiteBuilderOnboardingTour({
  steps,
  open,
  activeTab,
  onClose,
  onRequestTab,
}: WebsiteBuilderOnboardingTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState<ViewportBounds>(() => readViewportBounds());
  const [tooltipSize, setTooltipSize] = useState({
    width: FALLBACK_TOOLTIP_WIDTH,
    height: FALLBACK_TOOLTIP_HEIGHT,
  });
  const [mounted, setMounted] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

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

  const syncViewport = useCallback(() => {
    setViewport(readViewportBounds());
  }, []);

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

    element.scrollIntoView({ behavior: "auto", block: "center", inline: "nearest" });

    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: rect.top - TARGET_PADDING,
      left: rect.left - TARGET_PADDING,
      width: rect.width + TARGET_PADDING * 2,
      height: rect.height + TARGET_PADDING * 2,
    });
    return true;
  }, [open, step]);

  const remeasure = useCallback(() => {
    syncViewport();
    window.requestAnimationFrame(() => {
      measureTarget();
    });
  }, [measureTarget, syncViewport]);

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

      syncViewport();
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
            syncViewport();
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
  }, [activeTab, measureTarget, onRequestTab, open, step, stepIndex, syncViewport]);

  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!open || !node) {
      return;
    }

    const syncTooltipSize = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTooltipSize({ width: rect.width, height: rect.height });
      }
    };

    syncTooltipSize();

    const observer = new ResizeObserver(syncTooltipSize);
    observer.observe(node);

    return () => observer.disconnect();
  }, [open, stepIndex, step?.body, step?.title, targetRect]);

  useEffect(() => {
    if (!open || !tabReady) {
      return;
    }

    remeasure();

    window.addEventListener("resize", remeasure);
    window.addEventListener("scroll", remeasure, true);

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", remeasure);
    visualViewport?.addEventListener("scroll", remeasure);

    return () => {
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("scroll", remeasure, true);
      visualViewport?.removeEventListener("resize", remeasure);
      visualViewport?.removeEventListener("scroll", remeasure);
    };
  }, [open, remeasure, stepIndex, tabReady]);

  useObserveLayoutShifts(open && tabReady, step?.targetSelector ?? null, remeasure);

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
    tooltipSize,
    viewport,
    step.placement
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
          className="pointer-events-none fixed rounded-xl ring-4 ring-primary/80 ring-offset-2 ring-offset-background transition-[top,left,width,height] duration-150"
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
        ref={tooltipRef}
        className={cn(
          "fixed z-[201] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border-warm bg-card p-4 shadow-xl transition-[top,left] duration-150",
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

function useObserveLayoutShifts(
  enabled: boolean,
  targetSelector: string | null,
  onShift: () => void
) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const observer = new ResizeObserver(onShift);
    const observed = new Set<Element>();

    const attach = (element: Element | null) => {
      if (!element || observed.has(element)) {
        return;
      }

      observer.observe(element);
      observed.add(element);
    };

    attach(document.querySelector("[data-admin-shell]"));
    if (targetSelector) {
      attach(document.querySelector(targetSelector));
    }

    return () => observer.disconnect();
  }, [enabled, onShift, targetSelector]);
}

function readViewportBounds(): ViewportBounds {
  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return {
      width: visualViewport.width,
      height: visualViewport.height,
      offsetTop: visualViewport.offsetTop,
      offsetLeft: visualViewport.offsetLeft,
    };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetTop: 0,
    offsetLeft: 0,
  };
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
  tooltipSize: { width: number; height: number },
  viewport: ViewportBounds,
  preferred?: ResolvedPlacement
): TooltipPosition {
  if (!rect) {
    return {
      top: viewport.offsetTop + viewport.height / 2,
      left: viewport.offsetLeft + viewport.width / 2,
      transform: "translate(-50%, -50%)",
      placement: preferred ?? "bottom",
    };
  }

  const tooltipWidth = Math.min(
    tooltipSize.width,
    viewport.width - VIEWPORT_MARGIN * 2
  );
  const tooltipHeight = tooltipSize.height;

  const candidates = buildPlacementCandidates(rect, viewport, preferred);

  for (const placement of candidates) {
    const position = computeTooltipPosition(
      rect,
      placement,
      tooltipWidth,
      tooltipHeight,
      viewport
    );
    if (fitsViewport(position, tooltipWidth, tooltipHeight, viewport)) {
      return position;
    }
  }

  return clampTooltipToViewport(
    computeTooltipPosition(rect, "bottom", tooltipWidth, tooltipHeight, viewport),
    tooltipWidth,
    tooltipHeight,
    viewport
  );
}

function buildPlacementCandidates(
  rect: TargetRect,
  viewport: ViewportBounds,
  preferred?: ResolvedPlacement
): ResolvedPlacement[] {
  const spaces = measureAvailableSpace(rect, viewport);
  const isWideTarget = rect.width >= viewport.width * 0.55;
  const isTallTarget = rect.height >= viewport.height * 0.45;

  const ranked = (["top", "bottom", "left", "right"] as const)
    .filter((placement) => {
      if (isWideTarget && (placement === "left" || placement === "right")) {
        return false;
      }
      if (isTallTarget && (placement === "top" || placement === "bottom")) {
        return false;
      }
      return true;
    })
    .sort((a, b) => spaces[b] - spaces[a]);

  const ordered: ResolvedPlacement[] = [];
  if (preferred) {
    ordered.push(preferred);
  }
  for (const placement of ranked) {
    if (!ordered.includes(placement)) {
      ordered.push(placement);
    }
  }

  return ordered;
}

function measureAvailableSpace(
  rect: TargetRect,
  viewport: ViewportBounds
): Record<ResolvedPlacement, number> {
  const viewTop = viewport.offsetTop + VIEWPORT_MARGIN;
  const viewLeft = viewport.offsetLeft + VIEWPORT_MARGIN;
  const viewBottom = viewport.offsetTop + viewport.height - VIEWPORT_MARGIN;
  const viewRight = viewport.offsetLeft + viewport.width - VIEWPORT_MARGIN;

  return {
    top: Math.max(0, rect.top - viewTop),
    bottom: Math.max(0, viewBottom - (rect.top + rect.height)),
    left: Math.max(0, rect.left - viewLeft),
    right: Math.max(0, viewRight - (rect.left + rect.width)),
  };
}

function computeTooltipPosition(
  rect: TargetRect,
  placement: ResolvedPlacement,
  tooltipWidth: number,
  tooltipHeight: number,
  viewport: ViewportBounds
): TooltipPosition {
  const targetCenterX = rect.left + rect.width / 2;
  const targetCenterY = rect.top + rect.height / 2;
  const viewLeft = viewport.offsetLeft + VIEWPORT_MARGIN;
  const viewTop = viewport.offsetTop + VIEWPORT_MARGIN;
  const viewRight = viewport.offsetLeft + viewport.width - VIEWPORT_MARGIN;
  const viewBottom = viewport.offsetTop + viewport.height - VIEWPORT_MARGIN;

  switch (placement) {
    case "top":
      return {
        placement,
        top: rect.top - TOOLTIP_GAP,
        left: clamp(
          targetCenterX - tooltipWidth / 2,
          viewLeft,
          viewRight - tooltipWidth
        ),
        transform: "translateY(-100%)",
      };
    case "left":
      return {
        placement,
        top: clamp(
          targetCenterY - tooltipHeight / 2,
          viewTop,
          viewBottom - tooltipHeight
        ),
        left: rect.left - TOOLTIP_GAP,
        transform: "translateX(-100%)",
      };
    case "right":
      return {
        placement,
        top: clamp(
          targetCenterY - tooltipHeight / 2,
          viewTop,
          viewBottom - tooltipHeight
        ),
        left: rect.left + rect.width + TOOLTIP_GAP,
      };
    case "bottom":
    default:
      return {
        placement: "bottom",
        top: rect.top + rect.height + TOOLTIP_GAP,
        left: clamp(
          targetCenterX - tooltipWidth / 2,
          viewLeft,
          viewRight - tooltipWidth
        ),
      };
  }
}

function fitsViewport(
  position: TooltipPosition,
  tooltipWidth: number,
  tooltipHeight: number,
  viewport: ViewportBounds
): boolean {
  const box = tooltipBox(position, tooltipWidth, tooltipHeight);
  const viewLeft = viewport.offsetLeft + VIEWPORT_MARGIN;
  const viewTop = viewport.offsetTop + VIEWPORT_MARGIN;
  const viewRight = viewport.offsetLeft + viewport.width - VIEWPORT_MARGIN;
  const viewBottom = viewport.offsetTop + viewport.height - VIEWPORT_MARGIN;

  return (
    box.left >= viewLeft
    && box.top >= viewTop
    && box.right <= viewRight
    && box.bottom <= viewBottom
  );
}

function clampTooltipToViewport(
  position: TooltipPosition,
  tooltipWidth: number,
  tooltipHeight: number,
  viewport: ViewportBounds
): TooltipPosition {
  const box = tooltipBox(position, tooltipWidth, tooltipHeight);
  const viewLeft = viewport.offsetLeft + VIEWPORT_MARGIN;
  const viewTop = viewport.offsetTop + VIEWPORT_MARGIN;
  const viewRight = viewport.offsetLeft + viewport.width - VIEWPORT_MARGIN;
  const viewBottom = viewport.offsetTop + viewport.height - VIEWPORT_MARGIN;

  let deltaLeft = 0;
  let deltaTop = 0;

  if (box.left < viewLeft) {
    deltaLeft = viewLeft - box.left;
  } else if (box.right > viewRight) {
    deltaLeft = viewRight - box.right;
  }

  if (box.top < viewTop) {
    deltaTop = viewTop - box.top;
  } else if (box.bottom > viewBottom) {
    deltaTop = viewBottom - box.bottom;
  }

  return {
    ...position,
    left: position.left + deltaLeft,
    top: position.top + deltaTop,
  };
}

function tooltipBox(
  position: TooltipPosition,
  tooltipWidth: number,
  tooltipHeight: number
) {
  let left = position.left;
  let top = position.top;

  if (position.transform?.includes("translateX(-100%)")) {
    left -= tooltipWidth;
  }
  if (position.transform?.includes("translateY(-100%)")) {
    top -= tooltipHeight;
  }
  if (position.transform?.includes("translate(-50%, -50%)")) {
    left -= tooltipWidth / 2;
    top -= tooltipHeight / 2;
  }

  return {
    left,
    top,
    right: left + tooltipWidth,
    bottom: top + tooltipHeight,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
