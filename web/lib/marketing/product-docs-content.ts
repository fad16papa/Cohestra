import type { DocsImageBlock } from "@/lib/marketing/product-docs-images";

export type DocsBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | DocsImageBlock
  | { type: "next"; href: string; label: string };

export type DocsGroupId =
  | "start"
  | "workspace"
  | "activities"
  | "form-studio"
  | "publishing"
  | "people"
  | "website"
  | "campaigns"
  | "insights"
  | "account"
  | "help";

export type DocsSection = {
  id: string;
  title: string;
  group: DocsGroupId;
  blocks: DocsBlock[];
};

export const PRODUCT_DOCS_GROUPS: Array<{ id: DocsGroupId; label: string }> = [
  { id: "start", label: "Getting started" },
  { id: "workspace", label: "Dashboard and navigation" },
  { id: "activities", label: "Activities and registrations" },
  { id: "form-studio", label: "Form Studio" },
  { id: "publishing", label: "Publishing and public registration" },
  { id: "people", label: "Clients and Follow-up" },
  { id: "website", label: "Website Studio" },
  { id: "campaigns", label: "Email Campaigns" },
  { id: "insights", label: "Analytics and Cohestra AI" },
  { id: "account", label: "Workspace settings and plans" },
  { id: "help", label: "Troubleshooting and glossary" },
];

export const PRODUCT_DOCS_START_PATHS = [
  {
    href: "/docs#first-ten-minutes",
    title: "First ten minutes",
    detail: "Create an account and publish your first activity.",
  },
  {
    href: "/docs#create-an-activity",
    title: "Create an activity",
    detail: "Name it, set the form, then share a QR code.",
  },
  {
    href: "/docs#build-the-form",
    title: "Form Studio",
    detail: "Build, design, and preview the registration form.",
  },
  {
    href: "/docs#follow-up",
    title: "Follow-up",
    detail: "Work Due now, At risk, Opportunity, and Healthy.",
  },
] as const;

export const PRODUCT_DOCS_TITLE = "How to use Cohestra";
export const PRODUCT_DOCS_EYEBROW = "Document";
export const PRODUCT_DOCS_INTRO =
  "A workspace guide for the Cohestra you have today: activities, Form Studio, clients, Follow-up, Website Studio, campaigns, Analytics, and Cohestra AI.";

function shot(
  file: string,
  alt: string,
  caption: string,
  width = 1440,
  height = 900
): DocsImageBlock {
  return {
    type: "image",
    src: `/docs-screenshots/${file}`,
    alt,
    caption,
    width,
    height,
  };
}

export const PRODUCT_DOCS_SECTIONS: DocsSection[] = [
  {
    id: "what-is-cohestra",
    title: "What Cohestra is",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "Cohestra is workspace software for clubs, workshops, and groups. You publish activities, collect registrations, keep one client list, follow up, and — on higher plans — run a public website and email campaigns.",
      },
      {
        type: "list",
        items: [
          "Create an activity and a registration form.",
          "Share a public link or QR code. Guests never create an account.",
          "Each signup lands on Registrations and in Clients.",
          "Use Follow-up, Analytics, and Cohestra AI in the same workspace.",
        ],
      },
      {
        type: "note",
        text: "This Document is for workspace operators and teammates only.",
      },
      { type: "next", href: "#two-kinds-of-people", label: "Who signs in" },
    ],
  },
  {
    id: "two-kinds-of-people",
    title: "Who uses Cohestra",
    group: "start",
    blocks: [
      {
        type: "table",
        headers: ["Who", "What they do", "Account?"],
        rows: [
          [
            "Workspace admin",
            "Owns the workspace, billing (when shown), Team on Core+, and settings",
            "Yes. Role appears as admin.",
          ],
          [
            "Workspace member",
            "Uses unlocked rooms their admin can open. Team and Billing stay hidden.",
            "Yes. Role appears as member.",
          ],
          [
            "Guests",
            "Open your public form or website and register",
            "No. They never sign in.",
          ],
        ],
      },
      {
        type: "note",
        text: "Guests are not operators. Do not send them /login.",
      },
      { type: "next", href: "#sign-up-and-sign-in", label: "Sign up and sign in" },
    ],
  },
  {
    id: "sign-up-and-sign-in",
    title: "Sign up, sign in, and recovery",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "On the marketing site, choose Start free for a new workspace or Sign in for an existing one. Public pages: /signup, /login, /forgot-password.",
      },
      shot(
        "01-login.png",
        "Cohestra Sign in page with Email, Password, Sign in, and Forgot password.",
        "Sign in. Use Forgot password if you need a reset code."
      ),
      {
        type: "steps",
        items: [
          "On Sign up, enter your name, email, and password, then agree to the terms.",
          "Choose a plan. Basic is free. Core and Pro start a 30 day trial.",
          "Select Create account.",
          "Open the email and enter the 6-digit code on the verify screen.",
          "You land on Dashboard.",
        ],
      },
      {
        type: "p",
        text: "Forgot password: on Sign in, select Forgot password, enter the email code, then choose a new password. To sign out, open the initials control and select Sign out.",
      },
      {
        type: "note",
        text: "Availability: any signed-in workspace user. Team invites are a Core+ admin action, not public signup.",
      },
      { type: "next", href: "#first-ten-minutes", label: "First ten minutes" },
    ],
  },
  {
    id: "first-ten-minutes",
    title: "First ten minutes",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "Do this once in order. Later chapters explain each room.",
      },
      {
        type: "steps",
        items: [
          "Create the account and verify email.",
          "Open Dashboard.",
          "Open Activities → Communities and add your group name.",
          "Open Activities → Categories and add a type such as Class.",
          "Select New activity. Fill name, schedule, and place. Save the draft.",
          "Open the Form tab. Use Build form, then Preview. Save the form.",
          "Open Overview and select Publish.",
          "Open Share kit. Copy the link or download the QR code.",
          "Share it. New names appear on Registrations, Clients, and Follow-up.",
        ],
      },
      { type: "next", href: "#the-left-menu", label: "Workspace navigation" },
    ],
  },
  {
    id: "the-left-menu",
    title: "Workspace navigation",
    group: "workspace",
    blocks: [
      {
        type: "p",
        text: "After sign-in the left nav is the map. On a phone, open the menu first. Locked items stay visible with an upgrade or ask-admin state — they are not removed.",
      },
      {
        type: "table",
        headers: ["Menu item", "Route", "Who can use it"],
        rows: [
          ["Dashboard", "/dashboard", "Every plan"],
          ["Clients", "/clients", "Every plan"],
          ["Activities", "/activities", "Every plan. Children: All activities, Communities, Categories"],
          ["Follow-up", "/follow-up", "Every plan"],
          ["Analytics", "/analytics", "Every plan. /reports still opens Analytics"],
          ["Cohestra AI", "/ai", "Every plan. Not a free-form chatbot"],
          ["Website", "/dashboard/website", "Core and above. Basic shows a Core lock"],
          ["Campaigns", "/campaigns", "Pro. Basic and Core show a Pro lock"],
        ],
      },
      {
        type: "p",
        text: "Settings, Team, Billing, and Appearance live under Settings — not as extra primary nav rooms.",
      },
      { type: "next", href: "#dashboard", label: "Dashboard" },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    group: "workspace",
    blocks: [
      {
        type: "p",
        text: "Dashboard is the signed-in home. It summarizes recent registrations and work that needs attention. It does not replace Follow-up or Analytics.",
      },
      shot(
        "02-dashboard.png",
        "Cohestra Dashboard after sign-in, with workspace navigation and today’s summary.",
        "Dashboard. Use the left nav to open other rooms."
      ),
      {
        type: "p",
        text: "Where: left nav → Dashboard. Availability: every plan and both admin and member.",
      },
      { type: "next", href: "#communities-and-categories", label: "Communities and categories" },
    ],
  },
  {
    id: "communities-and-categories",
    title: "Communities and categories",
    group: "activities",
    blocks: [
      {
        type: "p",
        text: "Communities are the groups you run. Categories are the types of activity. Create them before the first activity if you can — the New activity form asks for both.",
      },
      {
        type: "steps",
        items: [
          "Open Activities → Communities. Add a name such as your club.",
          "Open Activities → Categories. Add a type such as Class or Social.",
          "Return to All activities when you are ready to create.",
        ],
      },
      {
        type: "note",
        text: "Plan caps apply to how many communities you can keep. Basic includes 1 community; Core 3; Pro 10.",
      },
      { type: "next", href: "#create-an-activity", label: "Create an activity" },
    ],
  },
  {
    id: "create-an-activity",
    title: "Create an activity",
    group: "activities",
    blocks: [
      {
        type: "p",
        text: "An activity is one session people can register for. Open Activities → All activities, then New activity.",
      },
      shot(
        "03-activities-list.png",
        "Activities list showing All activities with published and draft sessions.",
        "All activities. Use New activity to start a draft."
      ),
      {
        type: "steps",
        items: [
          "Select New activity.",
          "Enter the name, community, category, schedule, and place.",
          "Save the draft. You land on the activity with tabs Overview, Design, Form, Registrations, and Share kit.",
        ],
      },
      shot(
        "04-activity-create.png",
        "New activity form with name, schedule, and place fields.",
        "New activity. Save a draft before you publish."
      ),
      {
        type: "p",
        text: "Expected outcome: a draft activity you can still edit. Publishing happens on Overview after the form is ready.",
      },
      { type: "next", href: "#build-the-form", label: "Form Studio" },
    ],
  },
  {
    id: "build-the-form",
    title: "Form Studio — Build form",
    group: "form-studio",
    blocks: [
      {
        type: "p",
        text: "Form Studio lives on the activity Form tab. Modes are Build form and Preview. Add fields, sections, columns, and domain blocks here. Saved templates exist on every plan (Basic 1, Core 5, Pro 25). Recipes, two-column layouts, and activity/community blocks need Core or above. Splitting a form into steps needs Pro.",
      },
      shot(
        "05-form-studio-build.png",
        "Activity Form tab in Build form mode with Save form, templates, and intro copy.",
        "Build form. The activity stays in view so you can Save form without leaving the tab."
      ),
      shot(
        "05b-form-studio-composition.png",
        "Form Studio composition with the block palette and form structure canvas.",
        "Composition canvas. Add fields from the palette, then return to Save form."
      ),
      {
        type: "steps",
        items: [
          "Open the activity → Form.",
          "Stay on Build form.",
          "Add fields from the palette. Use sections and columns to group questions.",
          "Use domain blocks when you want activity-aware content.",
          "Apply a starting template if you want one. Recipes (conditional questions) need Core+.",
          "Select Save. Unpublished template changes are blocked while the activity is published.",
        ],
      },
      {
        type: "note",
        text: "Saved versus unsaved: a dirty form stays in this activity until you Save. Preview uses the current draft, including unsaved changes, and does not write a public registration.",
      },
      { type: "next", href: "#form-studio-design", label: "Design and Preview" },
    ],
  },
  {
    id: "form-studio-design",
    title: "Form Studio — Design and Preview",
    group: "form-studio",
    blocks: [
      {
        type: "p",
        text: "The Design tab sets the public registration look. Back on Form, Preview shows the guest experience at desktop and narrower widths.",
      },
      shot(
        "06-activity-design.png",
        "Activity Design tab with public registration theme controls.",
        "Design. Theme choices apply to the public form, not the workspace chrome."
      ),
      {
        type: "steps",
        items: [
          "Open Design. Choose the public experience and theme. Save if prompted.",
          "Return to Form and select Preview.",
          "Walk the form. Submit in Preview to see the success state.",
          "Confirm nothing new appears on Registrations or Clients — Preview is a simulation.",
        ],
      },
      shot(
        "07-form-studio-preview.png",
        "Form Studio Preview with Preview mode copy and the public registration fields.",
        "Preview simulates submission. It never creates a public registration."
      ),
      { type: "next", href: "#publish-and-share", label: "Publish and share" },
    ],
  },
  {
    id: "publish-and-share",
    title: "Publish, QR, and links",
    group: "publishing",
    blocks: [
      {
        type: "p",
        text: "Publish from Overview when the form is ready. Share kit holds the public link and QR code.",
      },
      {
        type: "steps",
        items: [
          "Open Overview. Fix any publish-gate messages if they appear.",
          "Select Publish.",
          "Open Share kit. Copy the public link or download the QR code.",
          "Share the link or print the QR. Guests open /register/{slug} — they do not sign in.",
        ],
      },
      shot(
        "08-share-kit.png",
        "Share kit tab with the public registration link and QR code.",
        "Share kit. Copy the link or download the QR after you publish."
      ),
      {
        type: "p",
        text: "Expected outcome: the activity is published and the public door accepts real signups.",
      },
      { type: "next", href: "#what-guests-see", label: "What guests see" },
    ],
  },
  {
    id: "what-guests-see",
    title: "Public registration",
    group: "publishing",
    blocks: [
      {
        type: "p",
        text: "Guests open the public form on a phone or desktop. The form is responsive. After a real submit they see a confirmation and a registration number.",
      },
      shot(
        "09-public-registration-desktop.png",
        "Desktop public registration form for a published activity.",
        "Public registration on desktop. Guests do not sign in."
      ),
      shot(
        "10-public-registration-mobile.png",
        "Mobile public registration form at a narrow viewport.",
        "Same public form at 390px. Fields stack; nothing should scroll sideways.",
        390,
        844
      ),
      {
        type: "note",
        text: "Capacity and close-at, when set on the activity, stop further public submits. That is a real write path — unlike Form Preview.",
      },
      { type: "next", href: "#clients", label: "Clients" },
    ],
  },
  {
    id: "clients",
    title: "Clients",
    group: "people",
    blocks: [
      {
        type: "p",
        text: "Clients is one list of people who registered. Repeat signups from the same person merge into one profile. Open Clients from the left nav.",
      },
      shot(
        "11-clients-list.png",
        "Clients directory with search and status filters.",
        "Clients. Open a row to see the profile and timeline."
      ),
      {
        type: "steps",
        items: [
          "Open Clients.",
          "Search or filter to find someone.",
          "Open the profile to see history, status, and follow-up context.",
        ],
      },
      shot(
        "12-client-profile.png",
        "Client profile with timeline and status.",
        "Client profile. Status and notes stay on this person across activities."
      ),
      { type: "next", href: "#follow-up", label: "Follow-up" },
    ],
  },
  {
    id: "follow-up",
    title: "Follow-up",
    group: "people",
    blocks: [
      {
        type: "p",
        text: "Follow-up is its own room at /follow-up. It is not a Clients filter and not an Activities tab. Categories are Due now, At risk, Opportunity, and Healthy.",
      },
      shot(
        "13-follow-up.png",
        "Follow-up room with Due now, At risk, Opportunity, and Healthy categories.",
        "Follow-up. Start on Due now unless you choose another category."
      ),
      {
        type: "steps",
        items: [
          "Open Follow-up.",
          "Choose Due now, At risk, Opportunity, or Healthy.",
          "Open a person and record the outreach you actually sent.",
        ],
      },
      {
        type: "note",
        text: "Availability: every plan. WhatsApp and Viber logging open from the client, not as a separate product install.",
      },
      { type: "next", href: "#website", label: "Website Studio" },
    ],
  },
  {
    id: "website",
    title: "Website Studio",
    group: "website",
    blocks: [
      {
        type: "p",
        text: "Website Studio is at /dashboard/website (nav label Website). Core and Pro can draft, preview, publish, and revert. Basic operators see a Core lock. Basic still gets a public stub page with the org name and activity links — not the full studio.",
      },
      shot(
        "14-website-studio.png",
        "Website Studio Split view with homepage sections on the left and a phone preview on the right.",
        "Website Studio. Sections plus live preview — no onboarding tour."
      ),
      {
        type: "steps",
        items: [
          "Open Website. If you see a Core lock, an admin must upgrade.",
          "Stay on Build. Use Design, Sections, and Templates to edit.",
          "Switch to Preview — or Split on desktop — before you publish.",
          "Select Publish when ready. Revert live site if a published version should go back.",
        ],
      },
      {
        type: "note",
        text: "Studio extras such as richer blocks appear on Pro. Custom domain settings are not a tenant self-serve control on Core or Pro.",
      },
      { type: "next", href: "#campaigns", label: "Email campaigns" },
    ],
  },
  {
    id: "campaigns",
    title: "Email campaigns",
    group: "campaigns",
    blocks: [
      {
        type: "p",
        text: "Campaigns is Pro-only. Basic and Core see the nav item locked to Pro. Recipients come from people who consented to email — do not treat the full client list as a send list.",
      },
      shot(
        "15-campaigns.png",
        "Compose campaign with consented recipients, Subject, Message editor, and Preview.",
        "Compose campaign. Choose a consented community, write the message, then Preview."
      ),
      {
        type: "steps",
        items: [
          "Open Campaigns. Select New campaign.",
          "Choose a consented segment (activity, community, or status).",
          "Write the Subject and Message. Use Preview.",
          "Send only after the recipient count matches people who opted in.",
        ],
      },
      {
        type: "note",
        text: "Isolated or unverified workspaces may show Email delivery needs attention above the composer. That is a server delivery checklist, not a missing Campaigns feature. Do not put API keys in the Document.",
      },
      { type: "next", href: "#reports", label: "Analytics" },
    ],
  },
  {
    id: "reports",
    title: "Analytics",
    group: "insights",
    blocks: [
      {
        type: "p",
        text: "Analytics is the canonical room at /analytics. /reports still opens the same Analytics experience. Every plan can open it. Basic includes the weekly registration report and CSV export. Monthly queryable reports unlock on Core and Pro.",
      },
      shot(
        "16-analytics.png",
        "Analytics room with registration figures and export actions.",
        "Analytics. Use /analytics. /reports is a compatibility address only."
      ),
      {
        type: "steps",
        items: [
          "Open Analytics.",
          "Set the date or activity filters you need.",
          "Export CSV when you want a spreadsheet. That does not email anyone.",
        ],
      },
      { type: "next", href: "#cohestra-ai", label: "Cohestra AI" },
    ],
  },
  {
    id: "cohestra-ai",
    title: "Cohestra AI",
    group: "insights",
    blocks: [
      {
        type: "p",
        text: "Cohestra AI is at /ai. Older addresses /intelligence and /needs-attention still open this room. It is a workspace brief with recommended actions — not a free-form chatbot and not an automation that messages people for you.",
      },
      shot(
        "17-cohestra-ai.png",
        "Cohestra AI brief with recommended actions for the workspace.",
        "Cohestra AI. Read the brief and act in Follow-up or Clients yourself."
      ),
      {
        type: "note",
        text: "Availability: every plan. Compatibility paths must not be documented as separate products.",
      },
      { type: "next", href: "#settings-team-billing", label: "Settings, Team, and Billing" },
    ],
  },
  {
    id: "settings-team-billing",
    title: "Settings, Team, and Billing",
    group: "account",
    blocks: [
      {
        type: "p",
        text: "Open Settings from the workspace footer or initials menu. Profile, organization, notifications, and appearance are for signed-in users. Team is admin-only and locked on Basic. Billing is visible to Basic admins and to the billing owner on paid plans.",
      },
      shot(
        "18-settings.png",
        "Workspace Settings page with account and organization options.",
        "Settings. Team and Billing appear only when your role and plan allow."
      ),
      {
        type: "table",
        headers: ["Area", "Who sees it", "Notes"],
        rows: [
          ["Settings", "Admin and member", "/settings"],
          ["Team", "Admin on Core+", "Invite admin or member seats up to the plan cap"],
          ["Billing", "Basic admin, or billing owner on paid plans", "Members never see Billing"],
          ["Help / support", "Signed-in workspace users", "Use in-app Help from Settings"],
        ],
      },
      { type: "next", href: "#plans", label: "Plans" },
    ],
  },
  {
    id: "plans",
    title: "Plans",
    group: "account",
    blocks: [
      {
        type: "p",
        text: "Current published caps. Always check Settings → plan if your workspace was customized.",
      },
      {
        type: "table",
        headers: ["", "Basic", "Core", "Pro"],
        rows: [
          ["Price", "Free", "$14.99 / mo or $152.92 / year", "$29.99 / mo or $305.93 / year"],
          ["Trial", "None", "30 days", "30 days"],
          ["Seats", "1", "3", "10"],
          ["Communities", "1", "3", "10"],
          ["Published activities", "4", "12", "50"],
          ["Registrations / month", "250", "500", "5,000"],
          ["Website Studio", "Stub page only", "Yes (Essentials)", "Yes (Studio)"],
          ["Team invites", "Locked", "Yes", "Yes"],
          ["Email campaigns", "Locked", "Locked", "Yes"],
          ["Analytics / Follow-up / Cohestra AI", "Yes", "Yes", "Yes"],
        ],
      },
      {
        type: "note",
        text: "Enterprise exists as a billed plan. Custom domain self-serve is not enabled for Core or Pro.",
      },
    ],
  },
  {
    id: "if-something-goes-wrong",
    title: "If something goes wrong",
    group: "help",
    blocks: [
      {
        type: "table",
        headers: ["Symptom", "What to try"],
        rows: [
          ["Cannot open Website", "Basic is locked to Core. Ask an admin to upgrade."],
          ["Cannot open Campaigns", "Needs Pro. The nav item stays visible but locked."],
          ["Preview submit created no client", "Correct. Preview never writes a public registration."],
          ["Guest cannot register", "Confirm Publish, capacity, and close-at on Overview."],
          ["Forgot password", "Use Forgot password on Sign in. Do not email guests a login."],
          ["Old /reports bookmark", "It still opens Analytics at /analytics."],
        ],
      },
      { type: "next", href: "#words-we-use", label: "Glossary" },
    ],
  },
  {
    id: "words-we-use",
    title: "Glossary",
    group: "help",
    blocks: [
      {
        type: "table",
        headers: ["Word", "Meaning in Cohestra"],
        rows: [
          ["Activity", "One session people can register for"],
          ["Form Studio", "Build form + Preview on the Form tab, plus the Design tab"],
          ["Share kit", "Public link and QR after publish"],
          ["Clients", "Deduped people list"],
          ["Follow-up", "Due now / At risk / Opportunity / Healthy room"],
          ["Website Studio", "Public homepage editor at /dashboard/website"],
          ["Analytics", "Canonical reports room at /analytics"],
          ["Cohestra AI", "Brief and recommended actions at /ai — not a chatbot"],
        ],
      },
    ],
  },
];

export const PRODUCT_DOCS_SECTION_IDS = PRODUCT_DOCS_SECTIONS.map((section) => section.id);

export const PRODUCT_DOCS_LEGACY_ANCHORS = [
  "what-is-cohestra",
  "two-kinds-of-people",
  "first-ten-minutes",
  "sign-up-and-sign-in",
  "the-left-menu",
  "dashboard",
  "communities-and-categories",
  "create-an-activity",
  "build-the-form",
  "publish-and-share",
  "what-guests-see",
  "clients",
  "website",
  "campaigns",
  "reports",
  "settings-team-billing",
  "plans",
  "if-something-goes-wrong",
  "words-we-use",
] as const;
