import type { ActivityFormSchema, FormFieldDefinition } from "@/lib/activities-api";

export type FormTemplateId =
  | "tgh-tennis"
  | "ikigai-pickleball"
  | "ikigai-board-game";

export type FormTemplate = {
  id: FormTemplateId;
  name: string;
  description: string;
  schema: ActivityFormSchema;
};

function field(definition: FormFieldDefinition): FormFieldDefinition {
  return definition;
}

const tghTennisSchema: ActivityFormSchema = {
  version: 1,
  fields: [
    field({
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "contact_number",
      type: "phone",
      label: "Contact number",
      required: true,
      placeholder: "+65 …",
      options: null,
      consentText: null,
      phoneCountry: "SG",
    }),
    field({
      id: "email",
      type: "email",
      label: "Email address",
      required: true,
      placeholder: "you@example.com",
      options: null,
      consentText: null,
    }),
    field({
      id: "instagram",
      type: "text",
      label: "Instagram handle",
      required: false,
      placeholder: "@username",
      options: null,
      consentText: null,
    }),
    field({
      id: "nationality",
      type: "text",
      label: "Nationality",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "profession",
      type: "text",
      label: "Profession / industry",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "tennis_level",
      type: "select",
      label: "Tennis level",
      required: true,
      placeholder: null,
      options: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
        { value: "competitive", label: "Competitive" },
      ],
      consentText: null,
    }),
    field({
      id: "clinic_interest",
      type: "checkbox",
      label: "Interested in a tennis clinic",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "referral_source",
      type: "referral_source",
      label: "How did you hear about us?",
      required: false,
      placeholder: null,
      options: [
        { value: "friend", label: "Friend or member" },
        { value: "instagram", label: "Instagram" },
        { value: "event", label: "At the club / event" },
        { value: "other", label: "Other" },
      ],
      consentText: null,
    }),
    field({
      id: "community_consent",
      type: "consent",
      label: "Community consent",
      required: true,
      placeholder: null,
      options: null,
      consentText:
        "I agree to receive Golden Hour Club updates and event communications by email.",
    }),
  ],
};

const ikigaiPickleballSchema: ActivityFormSchema = {
  version: 1,
  fields: [
    field({
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "profession",
      type: "text",
      label: "Profession",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "contact_number",
      type: "phone",
      label: "Contact number",
      required: true,
      placeholder: "+65 …",
      options: null,
      consentText: null,
      phoneCountry: "SG",
    }),
    field({
      id: "email",
      type: "email",
      label: "Email address",
      required: true,
      placeholder: "you@example.com",
      options: null,
      consentText: null,
    }),
    field({
      id: "first_timer",
      type: "checkbox",
      label: "First time playing pickleball",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "playing_level",
      type: "select",
      label: "Playing level",
      required: true,
      placeholder: null,
      options: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
      ],
      consentText: null,
    }),
    field({
      id: "invited_by",
      type: "text",
      label: "Invited by",
      required: false,
      placeholder: "Friend or member name",
      options: null,
      consentText: null,
    }),
    field({
      id: "referral_source",
      type: "referral_source",
      label: "How did you hear about us?",
      required: false,
      placeholder: null,
      options: [
        { value: "friend", label: "Friend" },
        { value: "instagram", label: "Instagram" },
        { value: "venue", label: "At the venue" },
        { value: "other", label: "Other" },
      ],
      consentText: null,
    }),
    field({
      id: "community_consent",
      type: "consent",
      label: "Community consent",
      required: true,
      placeholder: null,
      options: null,
      consentText:
        "I agree to receive Ikigai community updates and event communications by email.",
    }),
  ],
};

const ikigaiBoardGameSchema: ActivityFormSchema = {
  version: 1,
  fields: [
    field({
      id: "full_name",
      type: "text",
      label: "Full name",
      required: true,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "phone",
      type: "phone",
      label: "Mobile number",
      required: true,
      placeholder: "+65 …",
      options: null,
      consentText: null,
      phoneCountry: "SG",
    }),
    field({
      id: "email",
      type: "email",
      label: "Email address",
      required: true,
      placeholder: "you@example.com",
      options: null,
      consentText: null,
    }),
    field({
      id: "profession",
      type: "text",
      label: "Profession",
      required: false,
      placeholder: null,
      options: null,
      consentText: null,
    }),
    field({
      id: "residency",
      type: "select",
      label: "Residency status",
      required: true,
      placeholder: null,
      options: [
        { value: "local", label: "Local resident" },
        { value: "expat", label: "Expat" },
        { value: "visitor", label: "Visitor" },
      ],
      consentText: null,
    }),
    field({
      id: "community_consent",
      type: "consent",
      label: "Community consent",
      required: true,
      placeholder: null,
      options: null,
      consentText:
        "I agree to join the Ikigai community updates and event communications for Board Game Night.",
    }),
    field({
      id: "social_handle",
      type: "text",
      label: "Facebook or Instagram",
      required: false,
      placeholder: "@username or profile link",
      options: null,
      consentText: null,
    }),
    field({
      id: "registration_source",
      type: "referral_source",
      label: "How did you hear about this event?",
      required: false,
      placeholder: null,
      options: [
        { value: "friend", label: "Friend" },
        { value: "facebook", label: "Facebook" },
        { value: "instagram", label: "Instagram" },
        { value: "other", label: "Other" },
      ],
      consentText: null,
    }),
  ],
};

export const formTemplates: FormTemplate[] = [
  {
    id: "tgh-tennis",
    name: "TGH Tennis",
    description:
      "The Golden Hour Club — tennis level, clinic interest, referral source.",
    schema: tghTennisSchema,
  },
  {
    id: "ikigai-pickleball",
    name: "Ikigai Pickleball",
    description:
      "Dink & Drive — first-timer toggle, playing level, invited-by, referral.",
    schema: ikigaiPickleballSchema,
  },
  {
    id: "ikigai-board-game",
    name: "Board Game Night",
    description:
      "Play & Laugh — residency select, required consent block, social handle.",
    schema: ikigaiBoardGameSchema,
  },
];

export function getFormTemplate(id: FormTemplateId): FormTemplate {
  const template = formTemplates.find((item) => item.id === id);
  if (!template) {
    throw new Error(`Unknown form template: ${id}`);
  }

  return template;
}

/** Returns a deep copy so editor mutations do not affect the seed. */
export function cloneFormSchema(schema: ActivityFormSchema): ActivityFormSchema {
  return {
    version: schema.version,
    fields: schema.fields.map((item) => ({
      ...item,
      options: item.options?.map((option) => ({ ...option })) ?? null,
    })),
  };
}

export function cloneFormTemplate(id: FormTemplateId): ActivityFormSchema {
  return cloneFormSchema(getFormTemplate(id).schema);
}
