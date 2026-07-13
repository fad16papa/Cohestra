"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PREVIEW_DESKTOP_CANVAS_WIDTH,
  PREVIEW_PHONE_WIDTH,
  SitePreviewLayoutProvider,
} from "@/lib/site-preview-layout";

export type WebsitePreviewDeviceMode = "phone" | "desktop";

type WebsiteLivePreviewProps = {
  deviceMode: WebsitePreviewDeviceMode;
  onDeviceModeChange: (mode: WebsitePreviewDeviceMode) => void;
  children: ReactNode;
};

export function WebsiteLivePreview({
  deviceMode,
  onDeviceModeChange,
  children,
}: WebsiteLivePreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [desktopScale, setDesktopScale] = useState(1);
  const [scaledCanvasHeight, setScaledCanvasHeight] = useState<number | null>(null);

  const updateDesktopScale = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || deviceMode !== "desktop") {
      return;
    }

    const nextScale = Math.min(1, viewport.clientWidth / PREVIEW_DESKTOP_CANVAS_WIDTH);
    setDesktopScale(nextScale);
  }, [deviceMode]);

  useEffect(() => {
    updateDesktopScale();

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateDesktopScale();
    });
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [updateDesktopScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || deviceMode !== "desktop") {
      setScaledCanvasHeight(null);
      return;
    }

    const syncHeight = () => {
      setScaledCanvasHeight(canvas.offsetHeight * desktopScale);
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [deviceMode, desktopScale]);

  return (
    <section className="space-y-3 xl:sticky xl:top-4 xl:self-start">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-section text-text-warm">Live preview</h3>
          <p className="text-xs text-text-muted-warm">
            Read-only preview — draft changes appear here as you edit on the left.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border-warm bg-card p-1">
          <Button
            type="button"
            size="sm"
            variant={deviceMode === "phone" ? "default" : "ghost"}
            aria-pressed={deviceMode === "phone"}
            onClick={() => onDeviceModeChange("phone")}
          >
            <Smartphone className="size-4" aria-hidden />
            Phone
          </Button>
          <Button
            type="button"
            size="sm"
            variant={deviceMode === "desktop" ? "default" : "ghost"}
            aria-pressed={deviceMode === "desktop"}
            onClick={() => onDeviceModeChange("desktop")}
          >
            <Monitor className="size-4" aria-hidden />
            Desktop
          </Button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-xl border border-border-warm bg-muted/30 shadow-sm ring-1 ring-border-warm/60"
        data-site-preview-pane
      >
        {deviceMode === "phone" ? (
          <div
            ref={viewportRef}
            className="flex justify-center bg-gradient-to-b from-muted/40 to-muted/20 p-4 sm:p-6"
            data-site-preview-pane
          >
            <div
              className="flex flex-col overflow-hidden rounded-[2rem] border-[10px] border-zinc-800 bg-zinc-800 shadow-2xl"
              style={{ width: PREVIEW_PHONE_WIDTH + 20 }}
            >
              <div className="flex items-center justify-center gap-2 bg-zinc-800 px-4 py-2">
                <span className="h-1.5 w-12 rounded-full bg-zinc-600" aria-hidden />
              </div>
              <div
                className="max-h-[min(72dvh,780px)] overflow-x-hidden overflow-y-auto bg-background"
                style={{ width: PREVIEW_PHONE_WIDTH }}
              >
                <SitePreviewLayoutProvider mode="phone">
                  <section
                    className="pointer-events-none select-none"
                    inert
                    aria-label="Read-only homepage preview"
                  >
                    {children}
                  </section>
                </SitePreviewLayoutProvider>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 border-b border-border-warm bg-card/80 px-3 py-2">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-red-400/90" />
                <span className="size-2.5 rounded-full bg-amber-400/90" />
                <span className="size-2.5 rounded-full bg-emerald-400/90" />
              </span>
              <div className="mx-auto min-w-0 flex-1 truncate rounded-md bg-muted/60 px-3 py-1 text-center text-[11px] text-text-muted-warm">
                yoursite.com
              </div>
            </div>
            <div
              ref={viewportRef}
              className="max-h-[min(72dvh,780px)] overflow-x-auto overflow-y-auto bg-muted/20 p-3 sm:p-4"
              data-site-preview-pane
            >
              <div
                className="mx-auto"
                style={{
                  width: PREVIEW_DESKTOP_CANVAS_WIDTH * desktopScale,
                  height: scaledCanvasHeight ?? undefined,
                }}
              >
                <div
                  ref={canvasRef}
                  className="origin-top-left overflow-hidden rounded-lg border border-border-warm bg-background shadow-sm"
                  style={{
                    width: PREVIEW_DESKTOP_CANVAS_WIDTH,
                    transform: `scale(${desktopScale})`,
                  }}
                >
                  <SitePreviewLayoutProvider mode="desktop">
                    <section
                      className="pointer-events-none select-none"
                      inert
                      aria-label="Read-only homepage preview"
                    >
                      {children}
                    </section>
                  </SitePreviewLayoutProvider>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-text-muted-warm">
        {deviceMode === "phone"
          ? `${PREVIEW_PHONE_WIDTH}px wide — mobile layout`
          : `Scaled from ${PREVIEW_DESKTOP_CANVAS_WIDTH}px — desktop layout`}
      </p>
    </section>
  );
}
