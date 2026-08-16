export type DocsBlock =
  | { type: "p"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type DocsSection = {
  id: string;
  title: string;
  group: "start" | "events" | "grow" | "account";
  blocks: DocsBlock[];
};

export const PRODUCT_DOCS_GROUPS: Array<{
  id: DocsSection["group"];
  label: string;
}> = [
  { id: "start", label: "Start here" },
  { id: "events", label: "Run events" },
  { id: "grow", label: "Keep and grow" },
  { id: "account", label: "Account and plans" },
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
    href: "/docs#clients",
    title: "Your people list",
    detail: "Find someone, change their status, say hello.",
  },
  {
    href: "/docs#plans",
    title: "Plans in plain words",
    detail: "What Basic, Core, and Pro include.",
  },
] as const;

export const PRODUCT_DOCS_TITLE = "How to use Cohestra";
export const PRODUCT_DOCS_EYEBROW = "Document";
export const PRODUCT_DOCS_INTRO =
  "This page teaches you how to use Cohestra, one small step at a time. We use short sentences and plain words. If you can follow a recipe, you can follow this guide.";

export const PRODUCT_DOCS_SECTIONS: DocsSection[] = [
  {
    id: "what-is-cohestra",
    title: "1. What is Cohestra?",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "Cohestra is a tool for people who run clubs, classes, workshops, and community events. You use it to tell people about an event, let them sign up, keep their names in one list, and follow up later.",
      },
      {
        type: "p",
        text: "Think of it like a school sign-up sheet, a phone book, and a website — all in one place.",
      },
      {
        type: "list",
        items: [
          "You create an activity (that is one event or class).",
          "You share a link or a QR code.",
          "People fill in a form on their phone.",
          "Their name lands in your client list.",
          "You can message them, email them, and see reports.",
        ],
      },
      {
        type: "note",
        text: "Cohestra is built by Creativorare. The product name you see in the app is Cohestra.",
      },
    ],
  },
  {
    id: "two-kinds-of-people",
    title: "2. Two kinds of people",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "There are only two kinds of people in Cohestra. Do not mix them up.",
      },
      {
        type: "table",
        headers: ["Who", "What they do", "Do they need an account?"],
        rows: [
          [
            "You (the operator)",
            "Create events, publish links, talk to leads, run the website",
            "Yes. You sign in.",
          ],
          [
            "Guests (your people)",
            "Open a link or scan a QR code and fill in a form",
            "No. They never sign in.",
          ],
        ],
      },
      {
        type: "note",
        text: "This Document is for you — the operator. Guests only need the link or QR code you give them.",
      },
    ],
  },
  {
    id: "first-ten-minutes",
    title: "3. Your first ten minutes",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "If you are new, do these steps in this order. Do not skip ahead.",
      },
      {
        type: "steps",
        items: [
          "Create your account on the Sign up page.",
          "Check your email. Enter the 6-digit code.",
          "Look at the Dashboard. It is your home screen.",
          "Open Activities → Communities. Add the name of your club or group.",
          "Open Activities → Categories. Add a type, like Social or Class.",
          "Select New activity. Fill in the name, date, and place. Save the draft.",
          "Open the Form tab. Add the questions you want people to answer. Save the form.",
          "Open Overview. Select Publish.",
          "Open QR & Link. Copy the link or download the QR code.",
          "Share it. Watch new names appear on Registrations and Clients.",
        ],
      },
    ],
  },
  {
    id: "sign-up-and-sign-in",
    title: "4. Sign up and sign in",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "Start on the Cohestra website. Select Sign in if you already have an account. Select Start free if you do not.",
      },
      {
        type: "p",
        text: "When you sign up, you choose a plan. Basic is free. Core and Pro have a trial. You will need an email and a password.",
      },
      {
        type: "steps",
        items: [
          "Enter your name, email, and password.",
          "Agree to the terms.",
          "Select Create account.",
          "Open your email. Copy the 6-digit code.",
          "Paste the code on the verify screen.",
          "You land on the Dashboard.",
        ],
      },
      {
        type: "p",
        text: "Forgot your password? On the sign-in page, select Forgot password. We send a code to your email. Enter the code and pick a new password.",
      },
      {
        type: "p",
        text: "To sign out, open the circle with your initials in the top right. Select Sign out.",
      },
    ],
  },
  {
    id: "the-left-menu",
    title: "5. The left menu",
    group: "start",
    blocks: [
      {
        type: "p",
        text: "After you sign in, look at the left side of the screen. That is your map. On a phone, tap the menu icon first.",
      },
      {
        type: "table",
        headers: ["Menu item", "What it is for"],
        rows: [
          ["Dashboard", "Today’s home. See new people and what needs a reply."],
          ["Website", "Build the public homepage for your club (Core and Pro)."],
          ["Activities", "All your events. Also Communities and Categories."],
          ["Clients", "One list of every person who ever signed up."],
          ["Campaigns", "Email a group of people who said yes to email (Pro)."],
          ["Reports", "Numbers for a week or a month. Export a spreadsheet."],
        ],
      },
      {
        type: "p",
        text: "Settings, Team, and Billing live under your initials in the top right — not in the left menu.",
      },
    ],
  },
  {
    id: "dashboard",
    title: "6. Dashboard",
    group: "events",
    blocks: [
      {
        type: "p",
        text: "The Dashboard is the first page you see after sign in. It answers: what happened, and who still needs a hello?",
      },
      {
        type: "list",
        items: [
          "Chips at the top jump you to new leads, people waiting for a reply, or live activities.",
          "Needs follow-up shows people still marked New.",
          "Tiles show counts. Click a tile to open the matching list.",
          "Activity performance ranks events by how many people signed up.",
        ],
      },
      {
        type: "note",
        text: "If you have no activities yet, the Dashboard tells you to create one. That is normal. Start there.",
      },
    ],
  },
  {
    id: "communities-and-categories",
    title: "7. Communities and categories",
    group: "events",
    blocks: [
      {
        type: "p",
        text: "A community is the name of the group. Example: Friday Night Magic, Tennis Club, Kids Art.",
      },
      {
        type: "p",
        text: "A category is the type of event. Example: Social, Class, Workshop.",
      },
      {
        type: "p",
        text: "Make these first. Then every new activity can pick them from a list.",
      },
      {
        type: "steps",
        items: [
          "Open Activities → Communities.",
          "Type a name. Select Add community.",
          "Open Activities → Categories.",
          "Type a name. Select Add category.",
        ],
      },
      {
        type: "note",
        text: "You cannot delete a community or category while an activity still uses it. Rename it, or move the activity first.",
      },
    ],
  },
  {
    id: "create-an-activity",
    title: "8. Create an activity",
    group: "events",
    blocks: [
      {
        type: "p",
        text: "An activity is one event. One night. One class. One sign-up drive. Each activity has its own form, its own link, and its own list of people.",
      },
      {
        type: "steps",
        items: [
          "Select New activity (top right on the Activities page).",
          "Type the name people will see.",
          "Pick a community and a category.",
          "Set the date and time.",
          "Set the country and the place (a room, an address, or “online”).",
          "You can set a max number of people if you want a cap.",
          "Select Save draft activity.",
        ],
      },
      {
        type: "p",
        text: "A draft is private. Guests cannot see it yet. That is good. You still need a form.",
      },
    ],
  },
  {
    id: "build-the-form",
    title: "9. Build the sign-up form",
    group: "events",
    blocks: [
      {
        type: "p",
        text: "Open the activity. Select the Form tab. This is the sheet guests fill in.",
      },
      {
        type: "p",
        text: "You can start from a ready-made template, or add fields one by one.",
      },
      {
        type: "list",
        items: [
          "Text — a name or a short answer.",
          "Phone — a phone number with a country code.",
          "Email — an email address.",
          "Select — a list they pick from.",
          "Checkbox — yes or no.",
          "Consent — they must agree before they can submit.",
          "Referral source — how they heard about you.",
        ],
      },
      {
        type: "steps",
        items: [
          "Add the fields you need.",
          "Mark the important ones as Required.",
          "Drag fields to change the order.",
          "Look at the live preview on the right.",
          "Select Save form. Always save before you publish.",
        ],
      },
      {
        type: "note",
        text: "To publish, the saved form must have at least one field, and at least one required phone or email. Unsaved changes do not count.",
      },
    ],
  },
  {
    id: "publish-and-share",
    title: "10. Publish and share",
    group: "events",
    blocks: [
      {
        type: "p",
        text: "Publishing turns the draft into a live sign-up page.",
      },
      {
        type: "steps",
        items: [
          "Save the form first.",
          "Open the Overview tab.",
          "You can add a photo and a color for the public page. Save branding if you do.",
          "Select Publish activity.",
          "Open the QR & Link tab.",
          "Copy the public link, or download the QR picture.",
          "Put the QR on a poster, a chat, or a table tent.",
        ],
      },
      {
        type: "table",
        headers: ["Status", "What it means"],
        rows: [
          ["Draft", "Only you can see it. No public sign-ups."],
          ["Published", "The link and QR work. People can register."],
          ["Archived", "Closed for good. Old data stays. You cannot publish it again."],
        ],
      },
      {
        type: "p",
        text: "Unpublish stops new sign-ups but keeps the people you already have. You can edit the form and publish again.",
      },
    ],
  },
  {
    id: "what-guests-see",
    title: "11. What guests see",
    group: "events",
    blocks: [
      {
        type: "p",
        text: "Guests never open Cohestra the way you do. They only open your link or scan your QR.",
      },
      {
        type: "steps",
        items: [
          "They see the activity name, time, place, and your photo if you added one.",
          "They fill in the form.",
          "They submit.",
          "They see “You’re registered!” and a Registration ID.",
          "They can copy that ID for the door.",
          "If you asked for email, they may get a confirmation email.",
        ],
      },
      {
        type: "p",
        text: "One person can sign up once per activity. A second try with the same phone or email is blocked.",
      },
      {
        type: "p",
        text: "If the activity is a draft, unpublished, or archived, guests see that sign-up is closed.",
      },
    ],
  },
  {
    id: "clients",
    title: "12. Clients — your people list",
    group: "grow",
    blocks: [
      {
        type: "p",
        text: "Clients is one list of every person who signed up, across every activity. If the same person comes to two events, you still see one client.",
      },
      {
        type: "p",
        text: "Each client has a lead status. This is how you remember who you talked to.",
      },
      {
        type: "table",
        headers: ["Status", "Use it when"],
        rows: [
          ["New", "You have not said hello yet."],
          ["Contacted", "You sent a first message."],
          ["Active", "They keep coming or they replied."],
          ["Inactive", "They stopped coming, for now."],
        ],
      },
      {
        type: "steps",
        items: [
          "Open Clients.",
          "Search by name.",
          "Filter by status or community.",
          "Open a person to see their profile.",
          "Change lead status from the dropdown.",
          "Use WhatsApp or Viber if you have their phone. Cohestra can log that you opened the chat.",
          "Read the timeline. It shows sign-ups, status changes, and messages you logged.",
        ],
      },
      {
        type: "note",
        text: "You can fix a name or phone on the master profile. The original form answers stay as they were on the day they signed up.",
      },
    ],
  },
  {
    id: "website",
    title: "13. Your public website",
    group: "grow",
    blocks: [
      {
        type: "p",
        text: "On Core and Pro, Website lets you build a homepage for your club. Guests can find your upcoming activities there.",
      },
      {
        type: "steps",
        items: [
          "Open Website in the left menu.",
          "Give the site a name.",
          "Upload your own logo if you have one. If you do not, the header shows your site name.",
          "Pick a color.",
          "Add or edit sections (hero, activities, about, and more on Pro).",
          "Use Live preview to see phone and desktop.",
          "When it looks right, publish.",
        ],
      },
      {
        type: "note",
        text: "The Cohestra logo is for the Cohestra product only. Your public site uses your logo — or no logo — never the Cohestra mark as a stand-in.",
      },
    ],
  },
  {
    id: "campaigns",
    title: "14. Email campaigns",
    group: "grow",
    blocks: [
      {
        type: "p",
        text: "Campaigns (Pro) let you email people who already said yes to email on a form. You cannot email people who did not give consent.",
      },
      {
        type: "steps",
        items: [
          "Check Settings → Email delivery first. The checklist must be ready.",
          "Open Campaigns → New campaign.",
          "Pick a community.",
          "Look at who is ready (has email and consent) and who will be skipped.",
          "Write a subject and a message.",
          "Preview it. Send a test to yourself.",
          "Select Send campaign. Confirm the count.",
          "Open the campaign later to see who got it and who failed.",
        ],
      },
    ],
  },
  {
    id: "reports",
    title: "15. Reports",
    group: "grow",
    blocks: [
      {
        type: "p",
        text: "Reports answers “how did we do?” Pick a week, a month, or your own dates.",
      },
      {
        type: "list",
        items: [
          "How many people signed up.",
          "How many new people you met.",
          "Which activities did best.",
          "Which communities did best.",
          "How many people are still New.",
        ],
      },
      {
        type: "steps",
        items: [
          "Open Reports.",
          "Pick the date range.",
          "Add filters if you want one activity or one community.",
          "Read the charts and lists.",
          "Select Export CSV if you want a spreadsheet.",
        ],
      },
    ],
  },
  {
    id: "settings-team-billing",
    title: "16. Settings, team, and billing",
    group: "account",
    blocks: [
      {
        type: "p",
        text: "Open your initials (top right) to reach Settings.",
      },
      {
        type: "list",
        items: [
          "Appearance — light, dark, or match the device.",
          "Password — change it any time.",
          "Email delivery — the checklist for sending mail.",
          "Team — invite other operators if your plan has seats (Core and Pro).",
          "Billing — see your plan, invoices, and change or cancel.",
        ],
      },
      {
        type: "p",
        text: "Only a workspace owner or admin should change billing. Members can use the product but should not touch the card.",
      },
    ],
  },
  {
    id: "plans",
    title: "17. Plans in plain words",
    group: "account",
    blocks: [
      {
        type: "table",
        headers: ["Plan", "Good for", "Big limits to remember"],
        rows: [
          [
            "Basic (free)",
            "Trying Cohestra with one person",
            "1 seat, 1 community, 4 published activities, 250 sign-ups a month",
          ],
          [
            "Core",
            "A club that needs a homepage and a small team",
            "3 seats, 3 communities, 12 published activities, 500 sign-ups a month, website builder",
          ],
          [
            "Pro",
            "A team that emails people and wants a richer site",
            "10 seats, 10 communities, 50 published activities, 5,000 sign-ups a month, campaigns, Studio website",
          ],
          [
            "Enterprise",
            "Bigger groups who need a custom talk",
            "Ask us. Book a demo from the Pricing page.",
          ],
        ],
      },
      {
        type: "p",
        text: "If you hit a limit, Cohestra will tell you. You can archive an old activity, wait for the next month, or change plan in Billing.",
      },
    ],
  },
  {
    id: "if-something-goes-wrong",
    title: "18. If something goes wrong",
    group: "account",
    blocks: [
      {
        type: "table",
        headers: ["What you see", "What to try"],
        rows: [
          [
            "I cannot publish",
            "Save the form. Make sure there is a required phone or email. Check you are not at your activity limit.",
          ],
          [
            "The QR does nothing",
            "The activity must be Published. Copy the link and open it on your own phone first.",
          ],
          [
            "A guest says they already signed up",
            "One person can register once per activity. Check Clients and the Registrations tab.",
          ],
          [
            "I cannot send email",
            "Open Settings → Email delivery. Finish every item that says action required.",
          ],
          [
            "I forgot my password",
            "Use Forgot password on the sign-in page. Check spam for the code.",
          ],
          [
            "The website still shows the old page",
            "You must Publish the website draft. Saving a draft does not change the live site.",
          ],
        ],
      },
    ],
  },
  {
    id: "words-we-use",
    title: "19. Words we use",
    group: "account",
    blocks: [
      {
        type: "table",
        headers: ["Word", "Plain meaning"],
        rows: [
          ["Activity", "One event or class with its own form and link."],
          ["Registration", "One person signing up for one activity."],
          ["Client", "The person in your list. They can have many registrations."],
          ["Community", "The group name, like a club."],
          ["Category", "The type, like Social or Workshop."],
          ["Lead status", "New, Contacted, Active, or Inactive."],
          ["Campaign", "One email you send to a group."],
          ["Consent", "They said yes to being contacted."],
          ["Registration ID", "The code they show at the door."],
          ["Draft", "Not public yet."],
          ["Published", "Live. People can sign up."],
          ["Archived", "Closed. History stays."],
          ["Workspace", "Your club’s private Cohestra home."],
        ],
      },
    ],
  },
];
