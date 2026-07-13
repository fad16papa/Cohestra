"use client";

import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

type MarketingRevealProps<T extends ElementType = "div"> = {
  as?: T;
  children: ReactNode;
  className?: string;
  delayMs?: number;
  offsetY?: number;
  /** Reveal on mount — for hero / above-the-fold blocks. */
  immediate?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

function isInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight * 0.94 && rect.bottom > 0;
}

/**
 * Scroll/mount rise-in. Content is ALWAYS opacity 1 — only transform animates.
 * Never hides content; safe if IntersectionObserver fails.
 */
export function MarketingReveal<T extends ElementType = "div">({
  as,
  children,
  className,
  delayMs = 0,
  offsetY = 20,
  immediate = false,
  style,
  ...rest
}: MarketingRevealProps<T>) {
  const Component = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setMotionEnabled(false);
      setRevealed(true);
      return;
    }

    setMotionEnabled(true);

    const reveal = () => setRevealed(true);

    if (immediate) {
      const id = window.setTimeout(reveal, delayMs);
      return () => window.clearTimeout(id);
    }

    if (isInViewport(element)) {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -2% 0px" }
    );

    observer.observe(element);

    // Safety: never leave content offset if observer misses (e.g. nested scroll).
    const fallbackId = window.setTimeout(reveal, 1800);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallbackId);
    };
  }, [immediate, delayMs]);

  const offset = motionEnabled && !revealed ? offsetY : 0;

  return (
    <Component
      ref={ref}
      className={cn(
        "opacity-100",
        motionEnabled &&
          "transition-transform duration-[850ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        className
      )}
      style={{
        ...style,
        transform: offset ? `translate3d(0, ${offset}px, 0)` : undefined,
        transitionDelay:
          revealed && motionEnabled && !immediate && delayMs > 0 ? `${delayMs}ms` : undefined,
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function marketingRevealDelay(index: number, baseMs = 70, stepMs = 55): number {
  return baseMs + index * stepMs;
}

/** Hero above-the-fold fade + rise (CSS keyframes; ends visible). */
export function marketingHeroEnterClass(className?: string) {
  return cn("marketing-hero-enter", className);
}

export function marketingHeroEnterStyle(delayMs = 0) {
  return { animationDelay: `${delayMs}ms` };
}
