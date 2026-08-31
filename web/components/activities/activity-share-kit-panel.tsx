"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Link2, MessageCircle, Code2 } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { ShareLinkPreview } from "@/components/shared/share-link-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchActivityQrCodeBlob,
  fetchActivityRegistrationLink,
  type Activity,
  type ActivityRegistrationLink,
} from "@/lib/activities-api";
import { copyTextToClipboard } from "@/lib/clipboard";
import {
  buildActivityEmbedIframeSnippet,
  buildActivityEmbedUrl,
  buildEmbedResizeListenerSnippet,
} from "@/lib/embed-snippet";
import { fetchTenantEmbedSettings, type TenantEmbedSettings } from "@/lib/tenant-settings-api";
import {
  buildActivitySharePackText,
  buildActivitySharePreview,
  buildActivityWhatsAppMessage,
  downloadBlobFile,
  downloadSharePackFiles,
} from "@/lib/share-kit-utils";

type ActivityShareKitPanelProps = {
  activity: Activity;
  publishGateIssues: string[];
};

export function ActivityShareKitPanel({
  activity,
  publishGateIssues,
}: ActivityShareKitPanelProps) {
  const { authFetch } = useAuth();
  const [registrationLink, setRegistrationLink] =
    useState<ActivityRegistrationLink | null>(null);
  const [embedSettings, setEmbedSettings] = useState<TenantEmbedSettings | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const isPublished = activity.status === "published";
  const isArchived = activity.status === "archived";
  const gateBlocked = publishGateIssues.length > 0;

  const sharePreview = useMemo(() => {
    if (!registrationLink) {
      return null;
    }

    return buildActivitySharePreview(activity, registrationLink.url);
  }, [activity, registrationLink]);

  const whatsAppMessage = useMemo(() => {
    if (!registrationLink) {
      return null;
    }

    return buildActivityWhatsAppMessage(activity, registrationLink.url);
  }, [activity, registrationLink]);

  const embedUrl = useMemo(() => {
    if (!registrationLink) {
      return null;
    }

    return buildActivityEmbedUrl(registrationLink.url, registrationLink.path);
  }, [registrationLink]);

  const embedSnippet = useMemo(() => {
    if (!embedUrl) {
      return null;
    }

    return buildActivityEmbedIframeSnippet(embedUrl, activity.name);
  }, [activity.name, embedUrl]);

  const embedResizeHelper = useMemo(() => buildEmbedResizeListenerSnippet(), []);

  const embedHostsConfigured = (embedSettings?.allowedEmbedOrigins.length ?? 0) > 0;

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPublishedAssets() {
      if (!isPublished) {
        setRegistrationLink(null);
        setEmbedSettings(null);
        setQrPreviewUrl(null);
        setLinkError(null);
        setQrError(null);
        return;
      }

      setIsLoading(true);
      setLinkError(null);
      setQrError(null);

      const [linkResult, qrResult, embedResult] = await Promise.allSettled([
        fetchActivityRegistrationLink(authFetch, activity.id),
        fetchActivityQrCodeBlob(authFetch, activity.id),
        fetchTenantEmbedSettings(authFetch),
      ]);

      if (cancelled) {
        return;
      }

      if (linkResult.status === "fulfilled") {
        setRegistrationLink(linkResult.value);
      } else {
        setRegistrationLink(null);
        setLinkError(
          linkResult.reason instanceof Error
            ? linkResult.reason.message
            : "Could not load registration link."
        );
      }

      if (embedResult.status === "fulfilled") {
        setEmbedSettings(embedResult.value);
      } else {
        setEmbedSettings(null);
      }

      if (qrResult.status === "fulfilled") {
        objectUrl = URL.createObjectURL(qrResult.value);
        setQrPreviewUrl(objectUrl);
      } else {
        setQrPreviewUrl(null);
        setQrError(
          qrResult.reason instanceof Error
            ? qrResult.reason.message
            : "Could not load QR code."
        );
      }

      setIsLoading(false);
    }

    void loadPublishedAssets();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setQrPreviewUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
    };
  }, [activity.id, authFetch, isPublished, reloadToken]);

  async function handleCopyEmbedSnippet() {
    if (!embedSnippet || !embedHostsConfigured) {
      return;
    }

    setStatusMessage(null);
    const copied = await copyTextToClipboard(embedSnippet);
    setStatusMessage(
      copied
        ? "Embed snippet copied."
        : "Select the snippet and copy manually (Ctrl+C)."
    );
  }

  async function handleCopyLink() {
    if (!registrationLink) {
      return;
    }

    setStatusMessage(null);
    const copied = await copyTextToClipboard(registrationLink.url);
    setStatusMessage(
      copied
        ? "Link copied."
        : "Select the URL and copy manually (Ctrl+C)."
    );
  }

  async function handleCopyWhatsAppMessage() {
    if (!whatsAppMessage) {
      return;
    }

    setStatusMessage(null);
    const copied = await copyTextToClipboard(whatsAppMessage);
    setStatusMessage(
      copied
        ? "WhatsApp message copied."
        : "Could not copy automatically."
    );
  }

  async function handleDownloadQr() {
    if (!isPublished) {
      return;
    }

    setQrError(null);

    try {
      const blob = await fetchActivityQrCodeBlob(authFetch, activity.id);
      downloadBlobFile(`${activity.slug}-registration-qr.png`, blob);
    } catch (downloadError) {
      setQrError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download QR code."
      );
    }
  }

  async function handleDownloadSharePack() {
    if (!registrationLink) {
      return;
    }

    setLinkError(null);
    setQrError(null);
    setStatusMessage(null);

    try {
      const qrBlob = await fetchActivityQrCodeBlob(authFetch, activity.id);
      downloadSharePackFiles(
        activity.slug,
        qrBlob,
        buildActivitySharePackText(activity, registrationLink.url)
      );
      setStatusMessage("Share pack downloaded.");
    } catch (downloadError) {
      setLinkError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download share pack."
      );
    }
  }

  function handleRetryLoad() {
    setReloadToken((current) => current + 1);
  }

  const hasShareActions = Boolean(registrationLink || qrPreviewUrl);
  const loadErrorMessage = linkError ?? qrError;

  if (isArchived) {
    return (
      <p className="text-sm text-text-muted-warm">
        Share kit is unavailable for archived activities.
      </p>
    );
  }

  if (!isPublished) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-text-muted-warm">
          Publish this activity to unlock link, QR, and WhatsApp copy.
        </p>
        {gateBlocked ? (
          <ul className="list-disc space-y-0.5 pl-5 text-sm text-destructive">
            {publishGateIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {isLoading ? (
        <p className="text-sm text-text-muted-warm">Loading…</p>
      ) : null}

      {!isLoading && !hasShareActions && loadErrorMessage ? (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-destructive">
            {loadErrorMessage}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={handleRetryLoad}>
            Retry
          </Button>
        </div>
      ) : null}

      {hasShareActions ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="space-y-4">
            {registrationLink ? (
              <div className="space-y-2">
                <label
                  htmlFor="activity-share-link"
                  className="text-sm font-medium text-text-warm"
                >
                  Registration link
                </label>
                <Input
                  id="activity-share-link"
                  readOnly
                  value={registrationLink.url}
                  aria-label="Public registration URL"
                  className="font-mono text-xs"
                  onFocus={(event) => event.target.select()}
                  onClick={(event) => event.currentTarget.select()}
                />
              </div>
            ) : linkError ? (
              <div className="space-y-2">
                <p role="alert" className="text-sm text-destructive">
                  {linkError}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleRetryLoad}
                >
                  Retry link
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isLoading || !registrationLink}
                onClick={() => void handleCopyLink()}
              >
                <Link2 className="size-4" aria-hidden />
                Copy link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || !whatsAppMessage}
                onClick={() => void handleCopyWhatsAppMessage()}
              >
                <MessageCircle className="size-4" aria-hidden />
                Copy WhatsApp
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => void handleDownloadQr()}
              >
                <Download className="size-4" aria-hidden />
                QR PNG
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading || !registrationLink}
                onClick={() => void handleDownloadSharePack()}
              >
                <Download className="size-4" aria-hidden />
                Share pack
              </Button>
            </div>

            {qrError && registrationLink ? (
              <p role="status" className="text-xs text-text-muted-warm">
                QR preview unavailable — you can still download the PNG.
              </p>
            ) : null}

            {registrationLink ? (
              <div className="space-y-2 border-t border-border-warm pt-4">
                <p className="text-sm font-medium text-text-warm">Website embed</p>
                {embedHostsConfigured && embedSnippet ? (
                  <>
                    <label
                      htmlFor="activity-embed-snippet"
                      className="text-xs text-text-muted-warm"
                    >
                      iframe snippet
                    </label>
                    <textarea
                      id="activity-embed-snippet"
                      readOnly
                      rows={3}
                      value={embedSnippet}
                      aria-label="iframe embed snippet"
                      className="w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-xs"
                      onFocus={(event) => event.target.select()}
                      onClick={(event) => event.currentTarget.select()}
                    />
                    <p className="text-xs text-text-muted-warm">
                      Paste on an allowed host (Settings → Allowed embed hosts). Add this
                      resize listener on the parent page:
                    </p>
                    <textarea
                      readOnly
                      rows={4}
                      value={embedResizeHelper}
                      aria-label="Parent page resize listener example"
                      className="w-full resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => void handleCopyEmbedSnippet()}
                    >
                      <Code2 className="size-4" aria-hidden />
                      Copy embed snippet
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-text-muted-warm">
                    Add at least one allowed embed host in Settings before copying an iframe
                    snippet.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          {qrPreviewUrl ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm font-medium text-text-warm">QR code</p>
              <div className="rounded-lg border border-border-warm bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrPreviewUrl}
                  alt={`QR code for ${activity.name}`}
                  className="size-36 sm:size-40"
                />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {sharePreview && whatsAppMessage ? (
        <ShareLinkPreview
          preview={sharePreview}
          sampleMessage={whatsAppMessage.split("\n")[0] ?? "Join us!"}
          helperText="How your link may appear when shared."
        />
      ) : null}

      {statusMessage ? (
        <p role="status" className="text-sm text-text-muted-warm">
          {statusMessage}
        </p>
      ) : null}
    </div>
  );
}
