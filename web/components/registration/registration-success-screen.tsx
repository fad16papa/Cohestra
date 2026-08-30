"use client";

import { CalendarCheck, CheckCircle2, Copy, RotateCcw } from "lucide-react";
import { useState } from "react";

import { PublisherWebsiteLinkButton } from "@/components/registration/publisher-website-link";
import { Button } from "@/components/ui/button";
import { copyTextToClipboard } from "@/lib/clipboard";
import type { PublisherWebsiteLink } from "@/lib/publisher-website-url";
import { splitParticipantCopyParagraphs } from "@/lib/registration-piping";

type RegistrationSuccessScreenProps = {
  activityName: string;
  schedule: string;
  location: string;
  communityLabel: string;
  registrationNumber: string;
  successCopyMarkdown?: string | null;
  confirmationEmailSent?: boolean;
  confirmationEmail?: string | null;
  websiteLink?: PublisherWebsiteLink | null;
  onRegisterAnother: () => void;
};

export function RegistrationSuccessScreen({
  activityName,
  schedule,
  location,
  communityLabel,
  registrationNumber,
  successCopyMarkdown = null,
  confirmationEmailSent = false,
  confirmationEmail = null,
  websiteLink = null,
  onRegisterAnother,
}: RegistrationSuccessScreenProps) {
  const [copied, setCopied] = useState(false);

  async function copyRegistrationNumber() {
    const copied = await copyTextToClipboard(registrationNumber);
    setCopied(copied);
    if (copied) {
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  const personalizedCopy = successCopyMarkdown?.trim() ?? "";
  const personalizedParagraphs = personalizedCopy
    ? splitParticipantCopyParagraphs(personalizedCopy)
    : [];

  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-border-warm bg-card text-center shadow-sm"
    >
      <div className="bg-gradient-to-b from-primary/10 to-transparent px-5 pb-2 pt-8 sm:px-6 sm:pt-10">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary ring-4 ring-primary/10 sm:size-16">
          <CheckCircle2 className="size-7 sm:size-8" aria-hidden />
        </span>
        <h2 className="mt-4 text-public-hero text-balance text-text-warm sm:mt-5">
          You&apos;re registered!
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">
          We&apos;ve saved your spot for{" "}
          <span className="font-medium text-text-warm">{activityName}</span>.
        </p>
        {personalizedParagraphs.length > 0 ? (
          <div className="mt-3 space-y-2">
            {personalizedParagraphs.map((paragraph, index) => (
              <p
                key={`${index}-${paragraph.slice(0, 24)}`}
                className="text-sm leading-relaxed text-text-warm"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-6 text-left sm:px-6 sm:py-8">
        {communityLabel ? (
          <p className="text-center text-xs font-medium uppercase tracking-wide text-primary">
            {communityLabel}
          </p>
        ) : null}

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted-warm">
            Registration ID
          </p>
          <p className="mt-2 break-all font-mono text-base font-semibold tracking-wide text-text-warm sm:text-lg">
            {registrationNumber}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted-warm">
            Show this ID at check-in so we can validate your registration.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 w-full gap-2 sm:w-auto"
            onClick={() => void copyRegistrationNumber()}
          >
            <Copy className="size-4" aria-hidden />
            {copied ? "Copied" : "Copy registration ID"}
          </Button>
        </div>

        <div className="rounded-xl border border-border-warm bg-muted/30 p-4">
          <div className="flex items-start gap-3">
            <CalendarCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-medium leading-relaxed text-text-warm">{schedule}</p>
              {location ? (
                <p className="leading-relaxed text-text-muted-warm">{location}</p>
              ) : null}
            </div>
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-text-muted-warm">
          {confirmationEmailSent && confirmationEmail ? (
            <>
              A confirmation email was sent to{" "}
              <span className="font-medium break-all text-text-warm">{confirmationEmail}</span>.
            </>
          ) : confirmationEmail && !confirmationEmailSent ? (
            <>
              We could not send a confirmation email to{" "}
              <span className="font-medium break-all text-text-warm">{confirmationEmail}</span>.
              Save your registration ID below — you&apos;ll need it at check-in.
            </>
          ) : (
            <>Save your registration ID below — you&apos;ll need it at check-in.</>
          )}
        </p>

        <p className="text-center text-sm leading-relaxed text-text-muted-warm">
          Save the date — we look forward to seeing you there.
        </p>

        <div className="flex flex-col gap-2.5 pt-1">
          {websiteLink ? <PublisherWebsiteLinkButton link={websiteLink} /> : null}
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full min-h-11 gap-2"
            onClick={onRegisterAnother}
          >
            <RotateCcw className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Register another person</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
