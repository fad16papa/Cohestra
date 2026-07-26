"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Link2, MessageCircle } from "lucide-react";

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
  buildActivitySharePackText,
  buildActivitySharePreview,
  buildActivityWhatsAppMessage,
  downloadBlobFile,
  downloadTextFile,
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
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPublishedAssets() {
      if (!isPublished) {
        setRegistrationLink(null);
        setQrPreviewUrl(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [link, qrBlob] = await Promise.all([
          fetchActivityRegistrationLink(authFetch, activity.id),
          fetchActivityQrCodeBlob(authFetch, activity.id),
        ]);

        if (cancelled) {
          return;
        }

        objectUrl = URL.createObjectURL(qrBlob);
        setRegistrationLink(link);
        setQrPreviewUrl(objectUrl);
      } catch (loadError) {
        if (!cancelled) {
          setRegistrationLink(null);
          setQrPreviewUrl(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load share kit."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
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
  }, [activity.id, activity.status, authFetch, isPublished]);

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

    setError(null);

    try {
      const blob = await fetchActivityQrCodeBlob(authFetch, activity.id);
      downloadBlobFile(`${activity.slug}-registration-qr.png`, blob);
    } catch (downloadError) {
      setError(
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

    setError(null);
    setStatusMessage(null);

    try {
      const qrBlob = await fetchActivityQrCodeBlob(authFetch, activity.id);
      downloadBlobFile(`${activity.slug}-registration-qr.png`, qrBlob);
      downloadTextFile(
        `${activity.slug}-share-kit.txt`,
        buildActivitySharePackText(activity, registrationLink.url)
      );
      setStatusMessage("Share pack downloaded.");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download share pack."
      );
    }
  }

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

      {registrationLink ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div className="space-y-4">
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

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isLoading}
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

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
