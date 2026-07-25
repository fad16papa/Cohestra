"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";

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
import { publishGateSavedFormNote } from "@/lib/form-schema-utils";
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
        ? "Public link copied."
        : "Select the URL below and copy manually (Ctrl+C)."
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
        ? "WhatsApp message copied — paste it in your chat."
        : "Could not copy automatically. Select the message preview below."
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
      setStatusMessage("Share pack downloaded (QR PNG + message file).");
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download share pack."
      );
    }
  }

  return (
    <section className="space-y-6 rounded-xl border border-border-warm bg-card p-4 sm:p-5">
      <div>
        <h3 className="text-section text-text-warm">Share kit</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Copy a WhatsApp-ready message, preview how your link looks when shared,
          and download a QR pack for print or social.
        </p>
      </div>

      {isArchived ? (
        <p className="rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm">
          Share kit is unavailable for archived activities.
        </p>
      ) : null}

      {!isArchived && !isPublished ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border-warm bg-muted/20 px-4 py-3 text-sm text-text-muted-warm">
          <p>{publishGateSavedFormNote}</p>
          <p role="status">
            Share kit stays disabled until publish succeeds.
          </p>
          {gateBlocked ? (
            <ul className="list-disc space-y-1 pl-5 text-destructive">
              {publishGateIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="text-text-warm">
              Form meets publish requirements. Publish the activity to unlock
              link, QR, and WhatsApp copy.
            </p>
          )}
        </div>
      ) : null}

      {isPublished ? (
        <div className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-text-muted-warm">Loading share kit…</p>
          ) : null}

          {registrationLink ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-warm">Public link</p>
              <Input
                readOnly
                value={registrationLink.url}
                aria-label="Public registration URL"
                className="font-mono text-xs"
                onFocus={(event) => event.target.select()}
                onClick={(event) => event.currentTarget.select()}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handleCopyLink()}
                >
                  Copy link
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || !whatsAppMessage}
                  onClick={() => void handleCopyWhatsAppMessage()}
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Copy WhatsApp message
                </Button>
              </div>
            </div>
          ) : null}

          {qrPreviewUrl ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-warm">QR code</p>
              <div className="inline-block rounded-lg border border-border-warm bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrPreviewUrl}
                  alt={`QR code for ${activity.name} registration link`}
                  className="size-48"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => void handleDownloadQr()}
                >
                  Download QR PNG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading || !registrationLink}
                  onClick={() => void handleDownloadSharePack()}
                >
                  Download share pack
                </Button>
              </div>
              <p className="text-xs text-text-muted-warm">
                Share pack includes the QR PNG and a text file with your link and
                WhatsApp message.
              </p>
            </div>
          ) : null}

          {sharePreview && whatsAppMessage ? (
            <ShareLinkPreview
              preview={sharePreview}
              sampleMessage={whatsAppMessage.split("\n")[0] ?? "Join us!"}
              helperText="Approximate preview when you share the registration link in WhatsApp or iMessage."
            />
          ) : null}

          {whatsAppMessage ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-text-warm">WhatsApp message</p>
              <pre className="overflow-x-auto rounded-lg border border-border-warm bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-wrap text-text-warm">
                {whatsAppMessage}
              </pre>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled>
            Copy link
          </Button>
          <Button type="button" variant="outline" disabled>
            Copy WhatsApp message
          </Button>
          <Button type="button" variant="outline" disabled>
            Download share pack
          </Button>
        </div>
      )}

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
    </section>
  );
}
