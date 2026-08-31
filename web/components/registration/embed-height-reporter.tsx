"use client";

import { useEffect, useRef } from "react";

import { EMBED_RESIZE_MESSAGE_TYPE } from "@/lib/embed-snippet";

type EmbedHeightReporterProps = {
  children: React.ReactNode;
};

export function EmbedHeightReporter({ children }: EmbedHeightReporterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === "undefined") {
      return;
    }

    if (window.parent === window) {
      return;
    }

    function postHeight() {
      const height = Math.ceil(container?.getBoundingClientRect().height ?? 0);
      if (!Number.isFinite(height) || height <= 0) {
        return;
      }

      window.parent.postMessage(
        { type: EMBED_RESIZE_MESSAGE_TYPE, height },
        "*"
      );
    }

    postHeight();

    const observer = new ResizeObserver(() => {
      postHeight();
    });

    observer.observe(container);
    observer.observe(document.documentElement);

    window.addEventListener("load", postHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", postHeight);
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
