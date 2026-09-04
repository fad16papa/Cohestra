#!/usr/bin/env node
/**
 * Generates web/lib/marketing/marketing-demo-club.json for Story 33.6.
 * Deterministic DemoClub world: Harbourline Social Club, Asia/Singapore clock.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEMO_NOW = "2026-09-07T09:00:00+08:00";
const TZ = "Asia/Singapore";
const ORG = "Harbourline Social Club";
const HOST = "harbourline-social.cohestra.app";
const COMMUNITY = ORG;

const GOLDEN_UPCOMING = {
  id: "demo-golden-hour-run",
  name: "Golden Hour Run",
  startsAt: "2026-09-11T18:30:00+08:00",
  capacity: 42,
};
const GOLDEN_PRIOR = {
  id: "demo-golden-hour-run-prior",
  name: "Golden Hour Run",
  startsAt: "2026-09-04T18:30:00+08:00",
  capacity: 42,
};
const BOARD_GAMES = {
  id: "demo-board-game-night",
  name: "Board Game Night",
  startsAt: "2026-09-09T19:30:00+08:00",
  capacity: 24,
};
const PICKLEBALL = {
  id: "demo-sunday-pickleball",
  name: "Sunday Pickleball",
  startsAt: "2026-09-13T07:00:00+08:00",
  capacity: 36,
};

const ANCHORS = {
  maya: {
    id: "demo-maya",
    fullName: "Maya Santos",
    phone: "+65 8123 4501",
    email: "maya.santos@example.com",
    nationality: "Singapore",
    leadStatus: "new",
    referralSource: "Instagram",
    bucket: "dueNow", // first visit Fri Sep4 within 72h of Mon Sep7, no post follow-up yet... wait 72h from Fri 18:30 is Mon 18:30 — demoNow Mon 09:00 is within 72h. Good.
  },
  daniel: {
    id: "demo-daniel",
    fullName: "Daniel Koh",
    phone: "+65 8123 4502",
    email: "daniel.koh@example.com",
    nationality: "Singapore",
    leadStatus: "active",
    referralSource: "Website",
    bucket: "atRisk",
  },
  priya: {
    id: "demo-priya",
    fullName: "Priya Nair",
    phone: "+65 8123 4503",
    email: "priya.nair@example.com",
    nationality: "Singapore",
    leadStatus: "contacted",
    referralSource: "Referral from Sarah Tan",
    bucket: "opportunity",
  },
  marcus: {
    id: "demo-marcus",
    fullName: "Marcus Ong",
    phone: null,
    email: "marcus.ong@example.com",
    nationality: "Singapore",
    leadStatus: "new",
    referralSource: "Website",
    bucket: "healthy", // incomplete contact must NOT inflate 17
  },
  sarah: {
    id: "demo-sarah",
    fullName: "Sarah Tan",
    phone: "+65 8123 4504",
    email: "sarah.tan@example.com",
    nationality: "Singapore",
    leadStatus: "active",
    referralSource: "Member",
    bucket: "healthy",
  },
};

/** Ambient first names / last names for SG-flavored roster */
const FIRST = [
  "Aisha", "Ben", "Chloe", "Dev", "Emily", "Farid", "Grace", "Hassan", "Ivy", "Jason",
  "Kelly", "Liam", "Mei", "Noah", "Olivia", "Peter", "Quinn", "Rachel", "Sam", "Tara",
  "Umar", "Vera", "Wei", "Xena", "Yuki", "Zara", "Adam", "Beth", "Carl", "Diana",
];
const LAST = [
  "Lim", "Ng", "Tan", "Wong", "Lee", "Chan", "Goh", "Teo", "Ong", "Chua",
  "Koh", "Low", "Yeo", "Sim", "Foo", "Ho", "Pang", "Quek", "Raj", "Singh",
];

function iso(d) {
  return d;
}

function relativeFrom(isoDate) {
  const now = Date.parse(DEMO_NOW);
  const t = Date.parse(isoDate);
  const days = Math.floor((now - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 40) return `${days} days ago`;
  return `${Math.floor(days / 7)} weeks ago`;
}

let regCounter = 100;

function makeReg(activityId, activityName, registeredAt) {
  regCounter += 1;
  return {
    registrationId: `demo-reg-${regCounter}`,
    registrationNumber: String(regCounter),
    activityId,
    activityName,
    registeredAt,
    answers: [],
  };
}

function clientRow(c, lastActivityName, lastRegistrationAt, extras = {}) {
  return {
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    consentGiven: true,
    nationality: c.nationality,
    leadStatus: c.leadStatus,
    lastRegistrationAt,
    lastActivityName,
    lastOutreachAt: extras.lastOutreachAt ?? null,
    lastOutreachKind: extras.lastOutreachKind ?? null,
    nextFollowUpAt: extras.nextFollowUpAt ?? null,
    relativeLabel: relativeFrom(lastRegistrationAt ?? DEMO_NOW),
  };
}

function detail(c, history, timeline, extras = {}) {
  return {
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    email: c.email,
    profession: extras.profession ?? null,
    nationality: c.nationality,
    residency: "Singapore",
    consentGiven: true,
    referralSource: c.referralSource,
    notes: extras.notes ?? null,
    leadStatus: c.leadStatus,
    isMergeSuspect: false,
    nextFollowUpAt: extras.nextFollowUpAt ?? null,
    createdAt: extras.createdAt ?? "2026-06-01T10:00:00+08:00",
    updatedAt: extras.updatedAt ?? DEMO_NOW,
    registrationHistory: history,
    timeline,
  };
}

// --- Build anchors ---
const clients = [];
const clientDetails = {};

// Maya — attended prior Golden Hour Fri Sep 4; within 72h of Mon 09:00; no post follow-up → dueNow
{
  const c = ANCHORS.maya;
  const hist = [
    makeReg(GOLDEN_PRIOR.id, GOLDEN_PRIOR.name, "2026-09-04T12:00:00+08:00"),
    makeReg(GOLDEN_UPCOMING.id, GOLDEN_UPCOMING.name, "2026-09-06T10:00:00+08:00"),
  ];
  const timeline = [
    {
      eventType: "registration_submitted",
      occurredAt: "2026-09-06T10:00:00+08:00",
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_UPCOMING.name,
      referralSource: "Instagram",
      previousLeadStatus: null,
      newLeadStatus: "new",
      registrationId: hist[1].registrationId,
      campaignSubject: null,
      note: "Instagram",
    },
    {
      eventType: "registration_submitted",
      occurredAt: "2026-09-04T12:00:00+08:00",
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_PRIOR.name,
      referralSource: "Instagram",
      previousLeadStatus: null,
      newLeadStatus: "new",
      registrationId: hist[0].registrationId,
      campaignSubject: null,
      note: "Checked in Fri 18:27",
    },
  ];
  clients.push(
    clientRow(c, GOLDEN_UPCOMING.name, "2026-09-06T10:00:00+08:00", {})
  );
  clientDetails[c.id] = detail(c, hist, timeline, {
    createdAt: "2026-09-04T12:00:00+08:00",
    notes: "First visit Fri Sep 4 · checked in 18:27 · Running",
    // firstAttendedAt encoded in timeline note + history; triage uses first history + no outreach
  });
}

// Daniel — at risk: last engagement ~31 days ago
{
  const c = ANCHORS.daniel;
  const last = "2026-08-07T19:00:00+08:00";
  const hist = [
    makeReg("demo-board-game-night-old", "Board Game Night", "2026-07-15T12:00:00+08:00"),
    makeReg("demo-pickle-old", "Sunday Pickleball", "2026-07-27T08:00:00+08:00"),
    makeReg("demo-golden-old", "Golden Hour Run", last),
  ];
  const timeline = [
    {
      eventType: "registration_submitted",
      occurredAt: last,
      label: "Registered Golden Hour Run",
      activityName: "Golden Hour Run",
      referralSource: "Website",
      previousLeadStatus: "active",
      newLeadStatus: "active",
      registrationId: hist[2].registrationId,
      campaignSubject: null,
      note: "Last seen 31 days ago",
    },
  ];
  clients.push(clientRow(c, "Golden Hour Run", last, {}));
  clientDetails[c.id] = detail(c, hist, timeline, {
    createdAt: "2026-03-01T10:00:00+08:00",
    notes: "3 activities · At risk · no contact 28+ days",
  });
}

// Priya — opportunity: attended twice, referral, not member
{
  const c = ANCHORS.priya;
  const hist = [
    makeReg(PICKLEBALL.id, PICKLEBALL.name, "2026-08-30T08:00:00+08:00"),
    makeReg(GOLDEN_PRIOR.id, GOLDEN_PRIOR.name, "2026-09-04T11:00:00+08:00"),
  ];
  const timeline = [
    {
      eventType: "registration_submitted",
      occurredAt: "2026-09-04T11:00:00+08:00",
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_PRIOR.name,
      referralSource: "Referral from Sarah Tan",
      previousLeadStatus: "contacted",
      newLeadStatus: "contacted",
      registrationId: hist[1].registrationId,
      campaignSubject: null,
      note: "Attended · not yet member",
    },
  ];
  clients.push(clientRow(c, GOLDEN_PRIOR.name, "2026-09-04T11:00:00+08:00", {}));
  clientDetails[c.id] = detail(c, hist, timeline, {
    createdAt: "2026-08-20T10:00:00+08:00",
    notes: "Referral · attended twice · Opportunity",
    profession: null,
  });
}

// Marcus — healthy for triage; no-show; missing phone
{
  const c = ANCHORS.marcus;
  const hist = [makeReg(GOLDEN_PRIOR.id, GOLDEN_PRIOR.name, "2026-09-03T16:00:00+08:00")];
  const timeline = [
    {
      eventType: "registration_submitted",
      occurredAt: "2026-09-03T16:00:00+08:00",
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_PRIOR.name,
      referralSource: "Website",
      previousLeadStatus: null,
      newLeadStatus: "new",
      registrationId: hist[0].registrationId,
      campaignSubject: null,
      note: "No-show · phone missing · email bounced",
    },
  ];
  clients.push(clientRow(c, GOLDEN_PRIOR.name, "2026-09-03T16:00:00+08:00", {}));
  clientDetails[c.id] = detail(c, hist, timeline, {
    createdAt: "2026-09-03T16:00:00+08:00",
    notes: "Profile incomplete · no-show",
  });
}

// Sarah — healthy member / referral engine
{
  const c = ANCHORS.sarah;
  const hist = [
    makeReg("demo-pickle-aug", "Sunday Pickleball", "2026-08-16T07:00:00+08:00"),
    makeReg(GOLDEN_PRIOR.id, GOLDEN_PRIOR.name, "2026-09-04T10:00:00+08:00"),
    makeReg(BOARD_GAMES.id, BOARD_GAMES.name, "2026-09-05T12:00:00+08:00"),
    makeReg(GOLDEN_UPCOMING.id, GOLDEN_UPCOMING.name, "2026-09-06T09:00:00+08:00"),
  ];
  const timeline = [
    {
      eventType: "registration_submitted",
      occurredAt: "2026-09-06T09:00:00+08:00",
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_UPCOMING.name,
      referralSource: "Member",
      previousLeadStatus: "active",
      newLeadStatus: "active",
      registrationId: hist[3].registrationId,
      campaignSubject: null,
      note: "Loyal member · refers friends",
    },
  ];
  clients.push(
    clientRow(c, GOLDEN_UPCOMING.name, "2026-09-06T09:00:00+08:00", {
      lastOutreachAt: "2026-09-05T11:00:00+08:00",
      lastOutreachKind: "whatsapp",
    })
  );
  clientDetails[c.id] = detail(c, hist, timeline, {
    createdAt: "2025-11-01T10:00:00+08:00",
    notes: "Member · referral engine",
    profession: "Member",
  });
}

// Ambient builders for triage buckets
function ambientPerson(index, bucket, overrides = {}) {
  const first = FIRST[index % FIRST.length];
  const last = LAST[index % LAST.length];
  const id = `demo-ambient-${String(index).padStart(2, "0")}`;
  const fullName = `${first} ${last}`;
  const phone = `+65 9${String(1000000 + index).slice(0, 7)}`;
  const email = `${first.toLowerCase()}.${last.toLowerCase()}${index}@example.com`;
  const base = {
    id,
    fullName,
    phone,
    email,
    nationality: "Singapore",
    leadStatus: overrides.leadStatus ?? "active",
    referralSource: overrides.referralSource ?? "Website",
    bucket,
  };
  return { ...base, ...overrides, id, fullName, phone, email };
}

/** dueNow: 5 more (Maya is 1) → total 6. Use nextFollowUpAt <= demoNow */
const dueNowPeople = [];
for (let i = 0; i < 5; i++) {
  const p = ambientPerson(i, "dueNow", { leadStatus: i % 2 === 0 ? "new" : "contacted" });
  dueNowPeople.push(p);
  const due = i < 3 ? "2026-09-06T18:00:00+08:00" : "2026-09-07T08:00:00+08:00";
  const hist = [makeReg(GOLDEN_PRIOR.id, GOLDEN_PRIOR.name, "2026-09-04T14:00:00+08:00")];
  if (i < 2) {
    hist.push(makeReg(GOLDEN_UPCOMING.id, GOLDEN_UPCOMING.name, "2026-09-06T15:00:00+08:00"));
  }
  clients.push(
    clientRow(p, hist[hist.length - 1].activityName, hist[hist.length - 1].registeredAt, {
      nextFollowUpAt: due,
    })
  );
  clientDetails[p.id] = detail(p, hist, [
    {
      eventType: "next_follow_up_changed",
      occurredAt: "2026-09-05T10:00:00+08:00",
      label: "Follow-up scheduled",
      activityName: null,
      referralSource: null,
      previousLeadStatus: null,
      newLeadStatus: null,
      registrationId: null,
      campaignSubject: null,
      note: `Due ${due.slice(0, 10)}`,
    },
  ], { nextFollowUpAt: due, notes: "Due now" });
}

/** atRisk: 6 more (Daniel is 1) → total 7 */
for (let i = 0; i < 6; i++) {
  const p = ambientPerson(10 + i, "atRisk", { leadStatus: "active", referralSource: "Website" });
  const lastDays = 25 + i;
  const last = new Date(Date.parse(DEMO_NOW) - lastDays * 86400000);
  const lastIso = last.toISOString().replace("Z", "+00:00");
  // Use +08 style
  const lastSg = `2026-08-${String(7 + i).padStart(2, "0")}T19:00:00+08:00`;
  const hist = [
    makeReg("demo-old-run-" + i, "Golden Hour Run", lastSg),
    makeReg("demo-old-play-" + i, "Sunday Pickleball", `2026-07-${String(10 + i).padStart(2, "0")}T07:00:00+08:00`),
  ];
  clients.push(clientRow(p, "Golden Hour Run", lastSg, {}));
  clientDetails[p.id] = detail(p, hist, [
    {
      eventType: "registration_submitted",
      occurredAt: lastSg,
      label: "Registered Golden Hour Run",
      activityName: "Golden Hour Run",
      referralSource: "Website",
      previousLeadStatus: "active",
      newLeadStatus: "active",
      registrationId: hist[0].registrationId,
      campaignSubject: null,
      note: "Quiet · at risk",
    },
  ], { createdAt: "2026-02-01T10:00:00+08:00", notes: "At risk" });
}

/** opportunity: 3 more (Priya is 1) → total 4 */
for (let i = 0; i < 3; i++) {
  const p = ambientPerson(20 + i, "opportunity", {
    leadStatus: "contacted",
    referralSource: "Referral from Sarah Tan",
  });
  const hist = [
    makeReg(PICKLEBALL.id, PICKLEBALL.name, `2026-08-${String(20 + i).padStart(2, "0")}T07:00:00+08:00`),
    makeReg(GOLDEN_PRIOR.id, GOLDEN_PRIOR.name, "2026-09-04T13:00:00+08:00"),
  ];
  clients.push(clientRow(p, GOLDEN_PRIOR.name, "2026-09-04T13:00:00+08:00", {}));
  clientDetails[p.id] = detail(p, hist, [
    {
      eventType: "registration_submitted",
      occurredAt: "2026-09-04T13:00:00+08:00",
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_PRIOR.name,
      referralSource: p.referralSource,
      previousLeadStatus: "contacted",
      newLeadStatus: "contacted",
      registrationId: hist[1].registrationId,
      campaignSubject: null,
      note: "Repeat non-member · opportunity",
    },
  ], { notes: "Opportunity · not member" });
}

/** Healthy ambient to reach ~30 visible + fill Golden Hour 34 regs */
const healthyStart = 30;
for (let i = 0; i < 18; i++) {
  const p = ambientPerson(healthyStart + i, "healthy", {
    leadStatus: i % 4 === 0 ? "new" : "active",
    referralSource: i % 3 === 0 ? "Instagram" : "Website",
  });
  const registeredAt = `2026-09-0${5 + (i % 2)}T${10 + (i % 8)}:00:00+08:00`;
  const hist = [makeReg(GOLDEN_UPCOMING.id, GOLDEN_UPCOMING.name, registeredAt)];
  if (i % 2 === 0) {
    hist.unshift(makeReg(BOARD_GAMES.id, BOARD_GAMES.name, "2026-09-05T11:00:00+08:00"));
  }
  clients.push(clientRow(p, GOLDEN_UPCOMING.name, registeredAt, {}));
  clientDetails[p.id] = detail(p, hist, [
    {
      eventType: "registration_submitted",
      occurredAt: registeredAt,
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_UPCOMING.name,
      referralSource: p.referralSource,
      previousLeadStatus: null,
      newLeadStatus: p.leadStatus,
      registrationId: hist[hist.length - 1].registrationId,
      campaignSubject: null,
      note: null,
    },
  ], {});
}

// Ensure Golden Hour upcoming has exactly 34 active registrations across clientDetails
function countRegs(activityId) {
  let n = 0;
  for (const d of Object.values(clientDetails)) {
    for (const r of d.registrationHistory) {
      if (r.activityId === activityId) n += 1;
    }
  }
  return n;
}

let ghCount = countRegs(GOLDEN_UPCOMING.id);
let pad = 0;
while (ghCount < 34) {
  const p = ambientPerson(80 + pad, "healthy", { leadStatus: "new", referralSource: "Instagram" });
  // avoid dup ids if ambient already used
  if (clientDetails[p.id]) {
    p.id = `demo-pad-${pad}`;
    p.fullName = `Pad Member ${pad}`;
    p.email = `pad.member${pad}@example.com`;
  }
  const registeredAt = `2026-09-06T${String(8 + (pad % 10)).padStart(2, "0")}:30:00+08:00`;
  const hist = [makeReg(GOLDEN_UPCOMING.id, GOLDEN_UPCOMING.name, registeredAt)];
  clients.push(clientRow(p, GOLDEN_UPCOMING.name, registeredAt, {}));
  clientDetails[p.id] = detail(p, hist, [
    {
      eventType: "registration_submitted",
      occurredAt: registeredAt,
      label: "Registered Golden Hour Run",
      activityName: GOLDEN_UPCOMING.name,
      referralSource: "Instagram",
      previousLeadStatus: null,
      newLeadStatus: "new",
      registrationId: hist[0].registrationId,
      campaignSubject: null,
      note: null,
    },
  ], {});
  ghCount += 1;
  pad += 1;
}

if (ghCount > 34) {
  console.error("Golden Hour regs exceeded 34:", ghCount);
  process.exit(1);
}

const goldenHourRegs = countRegs(GOLDEN_UPCOMING.id);
console.log("clients", clients.length, "goldenHourRegs", goldenHourRegs);

const club = {
  orgName: ORG,
  publicHost: HOST,
  operatorGreeting: "Alex",
  selectedClientId: ANCHORS.maya.id,
  followUpClientId: ANCHORS.maya.id,
  availableRooms: ["clients", "outreach", "dashboard", "campaigns", "reports", "website"],
  reportsProofClientIds: [ANCHORS.maya.id, ANCHORS.sarah.id],
  clientListTotalCount: 248,
  clock: {
    timeZoneId: TZ,
    demoNow: DEMO_NOW,
  },
  activities: [
    {
      id: GOLDEN_PRIOR.id,
      name: GOLDEN_PRIOR.name,
      startsAt: GOLDEN_PRIOR.startsAt,
      capacity: 42,
      status: "published",
      completed: true,
    },
    {
      id: BOARD_GAMES.id,
      name: BOARD_GAMES.name,
      startsAt: BOARD_GAMES.startsAt,
      capacity: 24,
      status: "published",
      completed: false,
    },
    {
      id: GOLDEN_UPCOMING.id,
      name: GOLDEN_UPCOMING.name,
      startsAt: GOLDEN_UPCOMING.startsAt,
      capacity: 42,
      status: "published",
      completed: false,
    },
    {
      id: PICKLEBALL.id,
      name: PICKLEBALL.name,
      startsAt: PICKLEBALL.startsAt,
      capacity: 36,
      status: "published",
      completed: false,
    },
  ],
  whatsappQuote: {
    clientId: ANCHORS.maya.id,
    body: "Hi Maya — great to see you at Golden Hour Friday. See you on the next run?",
    loggedAt: "2026-09-06T19:00:00+08:00",
  },
  clients,
  clientDetails,
  dashboard: {
    totalLeads: 248,
    newLeadsInPeriod: 18,
    periodDays: 7,
    activeActivitiesCount: 3,
    followUpCoveragePercent: 79,
    activityPerformance: [
      {
        activityId: GOLDEN_UPCOMING.id,
        activityName: GOLDEN_UPCOMING.name,
        communityLabel: COMMUNITY,
        category: "Run",
        status: "published",
        registrationCount: 34,
      },
      {
        activityId: BOARD_GAMES.id,
        activityName: BOARD_GAMES.name,
        communityLabel: COMMUNITY,
        category: "Social",
        status: "published",
        registrationCount: countRegs(BOARD_GAMES.id) || 12,
      },
      {
        activityId: PICKLEBALL.id,
        activityName: PICKLEBALL.name,
        communityLabel: COMMUNITY,
        category: "Racket",
        status: "published",
        registrationCount: Math.max(countRegs(PICKLEBALL.id), 8),
      },
    ],
    computedAt: DEMO_NOW,
    registrationsInPeriod: 48,
    registrationsInPreviousPeriod: 36,
    trendDays: 7,
    registrationsTrend: [
      { date: "2026-09-01", registrations: 5, newClients: 2 },
      { date: "2026-09-02", registrations: 4, newClients: 1 },
      { date: "2026-09-03", registrations: 6, newClients: 2 },
      { date: "2026-09-04", registrations: 12, newClients: 4 },
      { date: "2026-09-05", registrations: 7, newClients: 3 },
      { date: "2026-09-06", registrations: 9, newClients: 4 },
      { date: "2026-09-07", registrations: 5, newClients: 2 },
    ],
    leadStatusBreakdown: {
      newCount: 44,
      contactedCount: 31,
      activeCount: 158,
      inactiveCount: 15,
    },
  },
  dashboardQueueIds: [ANCHORS.maya.id, ANCHORS.daniel.id, ANCHORS.priya.id],
  campaigns: [
    {
      id: "demo-campaign-golden",
      subject: "Golden Hour Run this Friday",
      sentAt: "2026-09-05T16:00:00+08:00",
      sentCount: 86,
      failedCount: 2,
      skippedCount: 1,
      status: "sent",
    },
    {
      id: "demo-campaign-board",
      subject: "Board Game Night Wednesday",
      sentAt: "2026-09-06T12:00:00+08:00",
      sentCount: 40,
      failedCount: 0,
      skippedCount: 0,
      status: "sent",
    },
  ],
  reportFilters: {
    preset: "weekly",
    from: "2026-09-01",
    to: "2026-09-07",
    activityId: "",
    community: "",
    leadStatus: "",
    referralSource: "",
  },
  reports: {
    period: {
      preset: "weekly",
      startAt: "2026-09-01T00:00:00+08:00",
      endAt: "2026-09-07T23:59:59+08:00",
      computedAt: DEMO_NOW,
    },
    activitiesHosted: 3,
    registrations: 48,
    newLeads: 18,
    followUpStatus: {
      newCount: 44,
      contactedCount: 31,
      activeCount: 158,
      inactiveCount: 15,
      coveragePercent: 79,
    },
    activityRanking: [
      {
        activityId: GOLDEN_UPCOMING.id,
        activityName: GOLDEN_UPCOMING.name,
        communityLabel: COMMUNITY,
        registrationCount: 34,
      },
      {
        activityId: BOARD_GAMES.id,
        activityName: BOARD_GAMES.name,
        communityLabel: COMMUNITY,
        registrationCount: Math.max(countRegs(BOARD_GAMES.id), 12),
      },
      {
        activityId: PICKLEBALL.id,
        activityName: PICKLEBALL.name,
        communityLabel: COMMUNITY,
        registrationCount: Math.max(countRegs(PICKLEBALL.id), 8),
      },
    ],
    leadGrowth: {
      newLeadsInPeriod: 18,
      totalLeadsAtEnd: 248,
      totalLeadsBeforePeriod: 230,
    },
    communityRanking: [{ communityLabel: COMMUNITY, registrationCount: 48 }],
    repeatParticipants: 14,
    inactiveClients: 15,
    campaignResults: {
      available: true,
      campaignsSent: 2,
      campaignsFailed: 0,
    },
    priorPeriod: {
      startAt: "2026-08-25T00:00:00+08:00",
      endAt: "2026-08-31T23:59:59+08:00",
      registrations: 36,
      newLeads: 11,
      activitiesHosted: 3,
      followUpCoveragePercent: 72,
    },
    dailyTrend: [
      { date: "2026-09-01", registrations: 5, newClients: 2 },
      { date: "2026-09-02", registrations: 4, newClients: 1 },
      { date: "2026-09-03", registrations: 6, newClients: 2 },
      { date: "2026-09-04", registrations: 12, newClients: 4 },
      { date: "2026-09-05", registrations: 7, newClients: 3 },
      { date: "2026-09-06", registrations: 9, newClients: 4 },
      { date: "2026-09-07", registrations: 5, newClients: 2 },
    ],
  },
  website: {
    publishedAt: "2026-08-15T12:00:00+08:00",
    upcomingActivities: [
      {
        slug: "golden-hour-run",
        name: "Golden Hour Run",
        schedule: "Friday · 6:30 PM · 34 going · 8 spots left",
        location: "East Coast Park",
        communityLabel: COMMUNITY,
        heroImageUrl: null,
        accentColor: null,
      },
      {
        slug: "board-game-night",
        name: "Board Game Night",
        schedule: "Wednesday · 7:30 PM",
        location: "Harbourline Clubhouse",
        communityLabel: COMMUNITY,
        heroImageUrl: null,
        accentColor: null,
      },
      {
        slug: "sunday-pickleball",
        name: "Sunday Pickleball",
        schedule: "Sunday · 7:00 AM",
        location: "Kallang Courts",
        communityLabel: COMMUNITY,
        heroImageUrl: null,
        accentColor: null,
      },
    ],
    published: {
      schemaVersion: 1,
      siteName: ORG,
      accentColor: null,
      logoAssetId: null,
      presetId: null,
      sections: [
        {
          id: "demo-hero",
          type: "hero",
          enabled: true,
          order: 0,
          props: {
            eyebrow: ORG,
            headline: "A place to move, play and meet good people",
            description:
              "Golden Hour Run is filling up — 34 going · 8 spots left. Same house as Board Game Night and Sunday Pickleball.",
            variant: "default",
          },
        },
        {
          id: "demo-highlights",
          type: "highlights",
          enabled: true,
          order: 1,
          props: {
            variant: "default",
            items: [
              {
                title: "Golden Hour Run",
                description: "Friday evenings · 34 going · 8 spots left",
                icon: "calendar",
              },
              {
                title: "Board Game Night",
                description: "Wednesday tables at the clubhouse",
                icon: "users",
              },
              {
                title: "Sunday Pickleball",
                description: "Morning courts · beginners welcome",
                icon: "qr-code",
              },
            ],
          },
        },
        {
          id: "demo-upcoming",
          type: "upcomingactivities",
          enabled: true,
          order: 2,
          props: {
            title: "This week",
            limit: 6,
            emptyMessage: "New events coming soon.",
            variant: "default",
          },
        },
        {
          id: "demo-testimonials",
          type: "testimonials",
          enabled: true,
          order: 3,
          props: {
            title: "Our community",
            variant: "default",
            items: [
              {
                _key: "t-sarah",
                quote: "I keep bringing friends to Golden Hour — they actually stay on the list.",
                name: "Sarah Tan",
                role: "Member",
                avatarAssetId: "",
              },
            ],
          },
        },
      ],
    },
  },
};

const out = join(dirname(fileURLToPath(import.meta.url)), "../lib/marketing/marketing-demo-club.json");
writeFileSync(out, JSON.stringify(club, null, 2) + "\n");
console.log("Wrote", out, "clients", clients.length);
