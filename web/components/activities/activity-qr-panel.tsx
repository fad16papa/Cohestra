"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchActivityQrCodeBlob,
  fetchActivityRegistrationLink,
  type Activity,
  type ActivityRegistrationLink,
} from "@/lib/activities-api";
import { publishGateSavedFormNote } from "@/lib/form-schema-utils";
import { copyTextToClipboard } from "@/lib/clipboard";

type ActivityQrPanelProps = {
  activity: Activity;
  publishGateIssues: string[];
};

export function ActivityQrPanel({
  activity,
  publishGateIssues,
}: ActivityQrPanelProps) {
  const { authFetch } = useAuth();
  const [registrationLink, setRegistrationLink] =
    useState<ActivityRegistrationLink | null>(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isPublished = activity.status === "published";
  const isArchived = activity.status === "archived";
  const gateBlocked = publishGateIssues.length > 0;

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
              : "Could not load QR code."
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

    setCopyMessage(null);

    const copied = await copyTextToClipboard(registrationLink.url);
    if (copied) {
      setCopyMessage("Public link copied.");
    } else {
      setCopyMessage("Select the URL below and copy manually (Ctrl+C).");
    }
  }

  async function handleDownloadQr() {
    if (!isPublished) {
      return;
    }

    setError(null);

    try {
      const blob = await fetchActivityQrCodeBlob(authFetch, activity.id);
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `${activity.slug}-registration-qr.png`;
      anchor.click();
      URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Could not download QR code."
      );
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-border-warm bg-card p-4">
      <div>
        <h3 className="text-section text-text-warm">QR &amp; link</h3>
        <p className="mt-1 text-sm text-text-muted-warm">
          Share the public registration URL. The QR code always points to the
          same link shown below.
        </p>
      </div>

      {isArchived ? (
        <p className="rounded-lg border border-border-warm bg-muted/40 px-4 py-3 text-sm text-text-muted-warm">
          QR and public link are unavailable for archived activities.
        </p>
      ) : null}

      {!isArchived && !isPublished ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border-warm bg-muted/20 px-4 py-3 text-sm text-text-muted-warm">
          <p>{publishGateSavedFormNote}</p>
          <p role="status">
            QR and copy-link stay disabled until publish succeeds.
          </p>
          {gateBlocked ? (
            <ul className="list-disc space-y-1 pl-5 text-destructive">
              {publishGateIssues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          ) : (
            <p className="text-text-warm">
              Form meets publish requirements. Publish the activity to activate
              the public link and QR code.
            </p>
          )}
        </div>
      ) : null}

      {isPublished ? (
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-text-muted-warm">Loading QR preview…</p>
          ) : null}

          {qrPreviewUrl ? (
            <div className="inline-block rounded-lg border border-border-warm bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrPreviewUrl}
                alt={`QR code for ${activity.name} registration link`}
                className="size-48"
              />
            </div>
          ) : null}

          {registrationLink ? (
            <div className="space-y-2">
              <p className="text-sm text-text-warm">
                <code className="rounded bg-muted px-1 py-0.5">
                  {registrationLink.path}
                </code>
              </p>
              <Input
                readOnly
                value={registrationLink.url}
                aria-label="Public registration URL"
                className="font-mono text-xs"
                onFocus={(event) => event.target.select()}
                onClick={(event) => event.currentTarget.select()}
              />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={!registrationLink || isLoading}
              onClick={() => void handleCopyLink()}
            >
              Copy public link
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void handleDownloadQr()}
            >
              Download PNG
            </Button>
          </div>

          {copyMessage ? (
            <p role="status" className="text-sm text-text-muted-warm">
              {copyMessage}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled>
            Copy public link
          </Button>
          <Button type="button" variant="outline" disabled>
            Download PNG
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
