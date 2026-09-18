"use client";

import { PublicRegistrationOpen } from "@/components/registration/public-registration-open";

export default function TestRegistrationPage() {
  const mockFormSchema = {
    version: 2,
    fields: [
      { type: "text", id: "fullName", label: "Full name", required: true },
      { type: "tel", id: "phone", label: "Phone", required: false },
      { type: "email", id: "email", label: "Email", required: false },
    ],
    meta: {
      introMarkdown: null,
      successCopyMarkdown: null,
    },
    marketingConsent: {
      enabled: true,
      required: true,
      label: "I agree to be contacted about community activities.",
    },
  };

  return (
    <PublicRegistrationOpen
      slug="demo-marina-social-meetup"
      name="Marina Pickleball — Member Social"
      schedule="Thu, Sep 17, 2026, 5:00 PM"
      location="Marina Pickleball Club venue"
      communityLabel="MARINA PICKLEBALL CLUB"
      heroImageUrl={null}
      accentColor="#0d9488"
      preset="modern-centered"
      formSchema={mockFormSchema}
      variant="public"
    />
  );
}
