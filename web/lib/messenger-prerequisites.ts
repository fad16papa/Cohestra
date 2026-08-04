export type MessengerChannel = "whatsapp" | "viber";

export type MessengerPrerequisiteCopy = {
  title: string;
  intro: string;
  requirements: readonly string[];
  continueLabel: string;
};

export const messengerPrerequisites: Record<
  MessengerChannel,
  MessengerPrerequisiteCopy
> = {
  whatsapp: {
    title: "Before you open WhatsApp",
    intro:
      "Cohestra opens a chat to this client's number. You send the message from your organisation's WhatsApp — not from Cohestra.",
    requirements: [
      "Use a WhatsApp account registered to your organisation's business mobile number.",
      "WhatsApp Web (web.whatsapp.com) or the WhatsApp app must be available on this device.",
      "Stay logged in to your business WhatsApp before you continue.",
    ],
    continueLabel: "Continue to WhatsApp",
  },
  viber: {
    title: "Before you open Viber",
    intro:
      "Cohestra opens a chat to this client's number. You send the message from your organisation's Viber — not from Cohestra.",
    requirements: [
      "Use a Viber account registered to your organisation's business mobile number.",
      "Install the Viber desktop or mobile app and sign in before you continue.",
      "Unlike WhatsApp, Viber cannot run in the browser — the app is required.",
    ],
    continueLabel: "Continue to Viber",
  },
};
