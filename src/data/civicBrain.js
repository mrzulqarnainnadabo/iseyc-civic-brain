export const COLORS = {
  gold: "#C9A84C",
  goldLight: "#E2C068",
  cream: "#F5F1E8",
  forest: "#1A3C1A",
  forestDark: "#0a150a",
  muted: "#6B7280",
};

export const SYSTEM_PROMPT = `You are ISEYC Civic Brain — the official Institutional AI Architect and Strategic Intelligence System for the Initiative for Sustainable Evolution for Youth and Community (ISEYC).

ISEYC is a youth-led, non-partisan, national movement headquartered in Abuja, FCT. Grassroots pilot: Kaduna State → Northwest → National. National President: Comr. Zulqarnain.

5 Departments: Education | Health & Wellbeing | Software & Technology | Graphic Design & Creativity | Business & Investment

7 Responsibility Pillars: Community Safety & Emergency | Health Awareness | Youth Development & Education | Economic Linkages | Sanitation & Environment | Community Data & Intelligence | Community Voice

4-tier delivery: Street Rep → Line Coordinator → Ward Coordinator → Central Leadership

Governance: Presidential Council | Board of Trustees | Advisory Council

Capabilities: Grassroots Intelligence & Mobilization | Leadership Accountability Tracker (non-partisan scorecards, monthly awards) | Departmental Support | National Scaling Strategy

Style: Institutional, visionary, professional, authoritative. Non-partisan. End major outputs with the slogan: "Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership."

Context: August 2026. About 13 months to 2027 elections. Kaduna South is active pilot zone. Contact: iseycglobal@gmail.com | +234 803 698 4766 | www.iseyc.com.ng`;

export const QUICK_ACTIONS = [
  { icon: "🗺️", label: "Kaduna Pilot Setup", prompt: "Generate a complete Kaduna South pilot ward setup plan for Phase 0 — ward selection criteria, Street Representative recruitment structure, and the baseline Community Needs Assessment framework." },
  { icon: "📊", label: "Accountability Scorecard", prompt: "Build the complete Leadership Accountability Scorecard framework for Kaduna — criteria, weightings, monthly tracking methodology, and the Senator/Rep/Governor of the Month award structure." },
  { icon: "🏛️", label: "7 Pillars Activation", prompt: "Give me a month-by-month activation plan for all 7 Responsibility Pillars across our Kaduna South pilot wards, with one documented, measurable activity per pillar per month." },
  { icon: "💰", label: "Funding Pipeline", prompt: "Identify the top 10 grant opportunities for ISEYC right now — EU, USAID, MacArthur, Ford, UNDP, OSIWA — with deadlines, fit assessment, and priority ranking." },
  { icon: "📡", label: "Media Strategy", prompt: "Build ISEYC's earned media strategy for July–December 2026 — NTA Kaduna, Daily Trust, Channels, Arise, social media — anchored to the Kaduna pilot and Accountability Tracker launches." },
  { icon: "🚀", label: "National Scaling Plan", prompt: "Develop the national scaling roadmap from Kaduna South to Northwest to National, with state-by-state sequencing, replication criteria, and milestone gates." },
  { icon: "📋", label: "Kaduna Civic Report", prompt: "Generate the full outline for the Kaduna Civic Report 2026 — the flagship evidence document for the Governor, NASS members, INEC, international partners, and donors." },
  { icon: "🏢", label: "Department Briefs", prompt: "Generate a strategic brief for each of ISEYC's 5 departments — Education, Health & Wellbeing, Software & Technology, Graphic Design & Creativity, and Business & Investment — with Kaduna roles and Q3–Q4 2026 priorities." },
];

export const PILLARS = [
  { name: "Community Safety & Emergency", desc: "Map safety infrastructure per street. Emergency response protocols per ward." },
  { name: "Health Awareness", desc: "Monthly screenings at markets and schools. Referral tracking and health data." },
  { name: "Youth Development & Education", desc: "Homework clubs, reading circles, skills workshops for young people." },
  { name: "Economic Linkages", desc: "Micro-trader database. Market linkages. Business registration support." },
  { name: "Sanitation & Environment", desc: "Monthly clean-ups. Environmental mapping. Waste tonnage data." },
  { name: "Community Data & Intelligence", desc: "Household surveys. Ward-level datasets. Real-time reports to Abuja HQ." },
  { name: "Community Voice", desc: "Monthly townhalls. Issue logs. Accountability demands and follow-up tracking." },
];

export const PHASES = [
  { label: "Phase 0 — Structural Setup", date: "Now – ongoing", active: true, desc: "Ward selection, Street Reps, baseline data" },
  { label: "Phase 1 — 7 Pillars Activation", date: "Jul – Sep 2026", active: false, desc: "One activity per pillar per ward per month" },
  { label: "Phase 2 — Accountability Tracker", date: "Aug – Oct 2026", active: false, desc: "Kaduna Senator/Rep/Governor scorecards live" },
  { label: "Phase 3 — Publish & Present", date: "Oct – Dec 2026", active: false, desc: "Kaduna Civic Report + 2027 Declaration" },
];

export const PRIORITIES = [
  { task: "Finalize 3–5 pilot wards in Kaduna South", due: "Priority" },
  { task: "Design Street Rep recruitment flyer", due: "Priority" },
  { task: "Build Community Needs Assessment questionnaire", due: "Priority" },
  { task: "Set up Ward Operations Dashboard", due: "Priority" },
  { task: "Draft Accountability Scorecard criteria", due: "Next" },
  { task: "Write to NTA Kaduna — media partnership", due: "Next" },
];

export const INITIAL_MESSAGE = `# ISEYC Civic Brain — Activated\n\n**Institutional AI Architect & Strategic Intelligence System**\n\nFully operational. Calibrated to ISEYC's mission and Nigeria's governance realities.\n\n- **Pilot zone:** Kaduna South — Phase 0 (structural setup)\n- **HQ:** Abuja, FCT\n- **Sequence:** Kaduna → Northwest → National\n- **Window:** ~13 months to 2027 elections — time to build is NOW\n\nUse the quick actions or ask me anything directly.\n\n---\n*Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership.*`;

export const TABS = [
  { id: "chat", label: "Strategic Chat" },
  { id: "dashboard", label: "Kaduna Dashboard" },
  { id: "pillars", label: "7 Pillars" },
];
