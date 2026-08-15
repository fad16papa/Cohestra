"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize2, Minimize2, Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PREVIEW_DESKTOP_CANVAS_WIDTH,
  PREVIEW_PHONE_WIDTH,
  SitePreviewLayoutProvider,
} from "@/lib/site-preview-layout";
import { cn } from "@/lib/utils";

export type WebsitePreviewDeviceMode = "phone" | "desktop";

type WebsiteLivePreviewProps = {
  deviceMode: WebsitePreviewDeviceMode;
  onDeviceModeChange: (mode: WebsitePreviewDeviceMode) => void;
  siteHostname: string;
  children: ReactNode;
  /** Mobile preview tab — use more of the viewport height. */
  fillViewport?: boolean;
};

export function WebsiteLivePreview({
  deviceMode,
  onDeviceModeChange,
  siteHostname,
  children,
  fillViewport = false,
}: WebsiteLivePreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const [desktopScale, setDesktopScale] = useState(1);
  const [phoneScale, setPhoneScale] = useState(1);
  const [scaledCanvasHeight, setScaledCanvasHeight] = useState<number | null>(null);
  const [scaledPhoneHeight, setScaledPhoneHeight] = useState<number | null>(null);
  const phoneFrameRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateDesktopScale = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || deviceMode !== "desktop") {
      return;
    }

    const nextScale = Math.min(1, viewport.clientWidth / PREVIEW_DESKTOP_CANVAS_WIDTH);
    setDesktopScale(nextScale);
  }, [deviceMode]);

  const updatePhoneScale = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || deviceMode !== "phone") {
      return;
    }

    const frameWidth = PREVIEW_PHONE_WIDTH + 20;
    const nextScale = Math.min(1, Math.max(0.55, (viewport.clientWidth - 16) / frameWidth));
    setPhoneScale(nextScale);
  }, [deviceMode]);

  useEffect(() => {
    updateDesktopScale();
    updatePhoneScale();

    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateDesktopScale();
      updatePhoneScale();
    });
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [updateDesktopScale, updatePhoneScale, isFullscreen, deviceMode]);

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

  useEffect(() => {
    const frame = phoneFrameRef.current;
    if (!frame || deviceMode !== "phone") {
      setScaledPhoneHeight(null);
      return;
    }

    const syncHeight = () => {
      setScaledPhoneHeight(frame.offsetHeight * phoneScale);
    };

    syncHeight();

    const observer = new ResizeObserver(syncHeight);
    observer.observe(frame);

    return () => observer.disconnect();
  }, [deviceMode, phoneScale]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === shellRef.current);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    if (!shellRef.current) {
      return;
    }

    if (document.fullscreenElement === shellRef.current) {
      await document.exitFullscreen();
      return;
    }

    await shellRef.current.requestFullscreen();
  }

  const deviceToggle = (
    <div className="inline-flex rounded-md border border-border-warm/80 bg-background/90 p-0.5 shadow-sm">
      <Button
        type="button"
        size="sm"
        variant={deviceMode === "phone" ? "default" : "ghost"}
        className="h-7 px-2"
        aria-pressed={deviceMode === "phone"}
        onClick={() => onDeviceModeChange("phone")}
      >
        <Smartphone className="size-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:inline">Phone</span>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={deviceMode === "desktop" ? "default" : "ghost"}
        className="h-7 px-2"
        aria-pressed={deviceMode === "desktop"}
        onClick={() => onDeviceModeChange("desktop")}
      >
        <Monitor className="size-3.5" aria-hidden />
        <span className="sr-only sm:not-sr-only sm:ml-1.5 sm:inline">Desktop</span>
      </Button>
    </div>
  );

  return (
    <section
      id="website-builder-live-preview"
      ref={shellRef}
      className="flex min-h-0 min-w-0 flex-col gap-2 lg:sticky lg:top-4 lg:self-start"
    >
      <div className="flex items-center justify-between gap-2 px-0.5">
        <p className="text-sm font-medium text-text-warm">Live preview</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2"
          onClick={() => void toggleFullscreen()}
          aria-label={isFullscreen ? "Exit fullscreen preview" : "Fullscreen preview"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-3.5" aria-hidden />
          ) : (
            <Maximize2 className="size-3.5" aria-hidden />
          )}
        </Button>
      </div>

      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden rounded-xl border border-border-warm bg-muted/30 shadow-sm ring-1 ring-border-warm/60",
          fillViewport
            ? "min-h-[min(72dvh,720px)]"
            : "min-h-[min(48dvh,520px)] sm:min-h-[min(58dvh,680px)] lg:min-h-[min(68dvh,780px)] xl:min-h-[min(78dvh,860px)]"
        )}
        data-site-preview-pane
      >
        {deviceMode === "phone" ? (
          <div
            ref={viewportRef}
            className="flex flex-1 flex-col bg-gradient-to-b from-muted/40 to-muted/20"
            data-site-preview-pane
          >
            <div className="flex items-center justify-between gap-2 border-b border-border-warm/60 bg-card/70 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-center text-[11px] font-medium text-text-muted-warm">
                {siteHostname}
              </span>
              {deviceToggle}
            </div>
            <div className="flex flex-1 items-start justify-center overflow-auto p-2 sm:p-4 lg:p-6">
              <div
                className="mx-auto"
                style={{
                  width: (PREVIEW_PHONE_WIDTH + 20) * phoneScale,
                  height: scaledPhoneHeight ?? undefined,
                }}
              >
                <div
                  ref={phoneFrameRef}
                  className="origin-top flex flex-col overflow-hidden rounded-[1.75rem] border-[8px] border-zinc-800 bg-zinc-800 shadow-2xl sm:rounded-[2rem] sm:border-[10px]"
                  style={{
                    width: PREVIEW_PHONE_WIDTH + 20,
                    transform: `scale(${phoneScale})`,
                  }}
                >
                  <div className="flex items-center justify-center gap-2 bg-zinc-800 px-4 py-2">
                    <span className="h-1.5 w-12 rounded-full bg-zinc-600" aria-hidden />
                  </div>
                  <div
                    className="max-h-[min(56dvh,640px)] overflow-x-hidden overflow-y-auto bg-background sm:max-h-[min(68dvh,760px)]"
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
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center gap-2 border-b border-border-warm bg-card/80 px-3 py-2">
              <span className="flex gap-1.5" aria-hidden>
                <span className="size-2.5 rounded-full bg-red-400/90" />
                <span className="size-2.5 rounded-full bg-amber-400/90" />
                <span className="size-2.5 rounded-full bg-emerald-400/90" />
              </span>
              <div className="mx-auto min-w-0 flex-1 truncate rounded-md bg-muted/60 px-3 py-1 text-center text-[11px] text-text-muted-warm">
                {siteHostname}
              </div>
              {deviceToggle}
            </div>
            <div
              ref={viewportRef}
              className="min-h-0 flex-1 overflow-x-auto overflow-y-auto bg-muted/20 p-3 sm:p-4"
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
          ? `${PREVIEW_PHONE_WIDTH}px — mobile layout`
          : `Scaled from ${PREVIEW_DESKTOP_CANVAS_WIDTH}px — desktop layout`}
      </p>
    </section>
  );
}
