# ISEYC Civic Brain

**Institutional AI Architect & Strategic Intelligence System**

The official AI agent for the Initiative for Sustainable Evolution for Youth and Community (ISEYC).

> *"Empowering Youth, Shaping Communities — Every Street. Every Voice. Accountable Leadership."*

## About ISEYC

ISEYC is a youth-led, non-partisan national movement with a grassroots pilot in Kaduna State and a national scaling strategy.

## Agent Features

- **Strategic Chat** — AI-powered institutional strategy and planning assistant.
- **Kaduna Dashboard** — Operational view of the national scaling sequence, roadmap phases, and priority actions.
- **7 Pillars Panel** — Activate and plan each of ISEYC's 7 Responsibility Pillars with one tap.
- **Quick Actions** — Prebuilt prompts for pilot setup, accountability, funding, media, scaling, and other strategic workflows.

## Architecture

The application is intentionally split into small, focused modules:

```text
iseyc-civic-brain/
├── api/
│   ├── chat.js              # /api/chat serverless entry point
│   └── providers.js         # Shared AI provider adapters/fallback helpers
├── src/
│   ├── components/
│   │   ├── ChatView.jsx
│   │   ├── DashboardView.jsx
│   │   ├── Logo.jsx
│   │   ├── Markdown.jsx
│   │   └── PillarsView.jsx
│   ├── data/
│   │   └── civicBrain.js    # Institutional configuration and content
│   ├── services/
│   │   └── chatApi.js       # Client-side /api/chat orchestration
│   ├── App.jsx              # Application shell and state coordinator
│   └── main.jsx             # React entry point
├── index.html
├── package.json
└── README.md
```

### Data flow

```text
User interaction
      ↓
App.jsx (state coordinator)
      ↓
ChatView / DashboardView / PillarsView
      ↓
chatApi.js
      ↓
/api/chat
      ↓
AI provider adapter
      ↓
Groq → Anthropic → xAI fallback
      ↓
Assistant response → UI
```

The refactor keeps the existing `/api/chat` contract and provider fallback sequence while separating presentation, configuration, client networking, and provider logic.

## Tech Stack

- React 18 + JSX
- Vite
- Serverless API functions
- OpenAI-compatible provider interface for Groq and xAI
- Anthropic API adapter
- Vercel deployment

## Getting Started

```bash
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

Configure the required AI provider API keys in the deployment environment. Secrets must remain server-side and should never be committed to the repository.

## 7 Responsibility Pillars

1. Community Safety & Emergency
2. Health Awareness
3. Youth Development & Education
4. Economic Linkages
5. Sanitation & Environment
6. Community Data & Intelligence
7. Community Voice

## 5 Departments

Education · Health & Wellbeing · Software & Technology · Graphic Design & Creativity · Business & Investment

## Scaling Sequence

```text
Kaduna South Pilot (3–5 Wards)
        ↓
Kaduna State (All 3 Senatorial Zones)
        ↓
Northwest Zone (7 States)
        ↓
North Central + FCT Corridor
        ↓
National — All 36 States + FCT
```

## Development Principles

- Preserve existing user-facing functionality when refactoring.
- Keep institutional content/configuration separate from rendering logic.
- Keep network and provider concerns outside React components.
- Prefer small, testable modules over large monolithic components.
- Keep credentials and provider secrets out of client-side code.

## Contact

- Email: iseycglobal@gmail.com
- Phone: +234 803 698 4766
- Website: www.iseyc.com.ng

---

*Every Street. Every Voice. Accountable Leadership.*