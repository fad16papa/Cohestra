"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SiteSection } from "@/lib/public-site-api";
import {
  getPhonePlaceholder,
  getPhonePrefixLabel,
  validatePhoneLocalNumber,
} from "@/lib/phone-countries";
import { submitWebsiteInquiry } from "@/lib/website-inquiry-api";
import {
  WEBSITE_INQUIRY_MAX_EMAIL_LENGTH,
  WEBSITE_INQUIRY_MAX_MESSAGE_LENGTH,
  WEBSITE_INQUIRY_MAX_NAME_LENGTH,
  WEBSITE_INQUIRY_MAX_PHONE_LENGTH,
} from "@/lib/website-inquiry-limits";
import { cn } from "@/lib/utils";

import { SectionShell, SectionTitle } from "./section-shell";

type ContactSectionProps = {
  section: SiteSection;
  isPreview?: boolean;
};

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
};

const DEFAULT_PHONE_COUNTRY = "SG";

function readStringProp(props: Record<string, unknown>, key: string, fallback: string): string {
  const value = props[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

export function ContactSection({ section, isPreview = false }: ContactSectionProps) {
  const props = section.props;
  const heading = readStringProp(props, "heading", "Get in touch");
  const intro = readStringProp(
    props,
    "intro",
    "Have a question? Send us a message and we'll get back to you."
  );
  const buttonLabel = readStringProp(props, "buttonLabel", "Send message");
  const successMessage = readStringProp(
    props,
    "successMessage",
    "Thanks — we've received your message."
  );
  const consentLabel = readStringProp(
    props,
    "consentLabel",
    "I'd like to receive updates and marketing from this community."
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validate(): boolean {
    const nextErrors: FieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedMessage = message.trim();

    if (!trimmedName) {
      nextErrors.name = "Name is required.";
    } else if (trimmedName.length > WEBSITE_INQUIRY_MAX_NAME_LENGTH) {
      nextErrors.name = `Name must be at most ${WEBSITE_INQUIRY_MAX_NAME_LENGTH} characters.`;
    }

    if (!trimmedEmail && !trimmedPhone) {
      nextErrors.email = "Provide an email or phone number.";
    } else {
      if (trimmedEmail) {
        if (!trimmedEmail.includes("@")) {
          nextErrors.email = "Enter a valid email address.";
        } else if (trimmedEmail.length > WEBSITE_INQUIRY_MAX_EMAIL_LENGTH) {
          nextErrors.email = `Email must be at most ${WEBSITE_INQUIRY_MAX_EMAIL_LENGTH} characters.`;
        }
      }

      if (trimmedPhone) {
        if (trimmedPhone.length > WEBSITE_INQUIRY_MAX_PHONE_LENGTH) {
          nextErrors.phone = `Phone must be at most ${WEBSITE_INQUIRY_MAX_PHONE_LENGTH} characters.`;
        } else {
          const phoneError = validatePhoneLocalNumber(DEFAULT_PHONE_COUNTRY, trimmedPhone, false);
          if (phoneError) {
            nextErrors.phone = phoneError;
          }
        }
      }
    }

    if (!trimmedMessage) {
      nextErrors.message = "Message is required.";
    } else if (trimmedMessage.length > WEBSITE_INQUIRY_MAX_MESSAGE_LENGTH) {
      nextErrors.message = `Message must be at most ${WEBSITE_INQUIRY_MAX_MESSAGE_LENGTH} characters.`;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (isPreview) {
      setSubmitError("Preview only — publish the site to accept submissions.");
      return;
    }

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitWebsiteInquiry({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        message: message.trim(),
        consentGiven,
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Unable to send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const controlClass = "min-h-12 text-base";
  const textareaClass = cn(
    "flex min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
    errors.message && "border-destructive ring-3 ring-destructive/20"
  );

  return (
    <SectionShell>
      <SectionTitle description={intro}>{heading}</SectionTitle>

      {submitted ? (
        <div
          className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-text-warm"
          role="status"
        >
          {successMessage}
        </div>
      ) : (
        <form className="mx-auto max-w-xl space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor={`${section.id}-name`}>
              Name<span className="text-destructive"> *</span>
            </Label>
            <Input
              id={`${section.id}-name`}
              value={name}
              autoComplete="name"
              maxLength={WEBSITE_INQUIRY_MAX_NAME_LENGTH}
              className={cn(controlClass, errors.name && "border-destructive ring-3 ring-destructive/20")}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name ? (
              <p className="text-sm text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${section.id}-email`}>Email</Label>
            <Input
              id={`${section.id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              maxLength={WEBSITE_INQUIRY_MAX_EMAIL_LENGTH}
              className={cn(controlClass, errors.email && "border-destructive ring-3 ring-destructive/20")}
              onChange={(event) => setEmail(event.target.value)}
            />
            {errors.email ? (
              <p className="text-sm text-destructive">{errors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${section.id}-phone`}>Phone</Label>
            <div
              className={cn(
                "flex overflow-hidden rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                errors.phone && "border-destructive ring-3 ring-destructive/20"
              )}
            >
              <span
                className="flex min-h-12 items-center border-r border-input bg-muted/40 px-3 text-sm text-text-muted-warm"
                aria-hidden
              >
                {getPhonePrefixLabel(DEFAULT_PHONE_COUNTRY)}
              </span>
              <input
                id={`${section.id}-phone`}
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={getPhonePlaceholder(DEFAULT_PHONE_COUNTRY)}
                value={phone}
                maxLength={WEBSITE_INQUIRY_MAX_PHONE_LENGTH}
                onChange={(event) => setPhone(event.target.value)}
                className="min-h-12 flex-1 bg-transparent px-3 text-base outline-none"
              />
            </div>
            {errors.phone ? (
              <p className="text-sm text-destructive">{errors.phone}</p>
            ) : (
              <p className="text-xs text-text-muted-warm">Local Singapore mobile number.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${section.id}-message`}>
              Message<span className="text-destructive"> *</span>
            </Label>
            <textarea
              id={`${section.id}-message`}
              className={textareaClass}
              value={message}
              maxLength={WEBSITE_INQUIRY_MAX_MESSAGE_LENGTH}
              onChange={(event) => setMessage(event.target.value)}
            />
            {errors.message ? (
              <p className="text-sm text-destructive">{errors.message}</p>
            ) : null}
          </div>

          <label className="flex items-start gap-3 text-sm text-text-warm">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-input"
              checked={consentGiven}
              onChange={(event) => setConsentGiven(event.target.checked)}
            />
            <span>{consentLabel}</span>
          </label>

          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" className="min-h-12 w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Sending…" : buttonLabel}
          </Button>
        </form>
      )}
    </SectionShell>
  );
}
