# WealthEasy

> A fictional Canadian fintech platform built to demonstrate an AI-powered life event detection system.
> Built in 3 days as part of a Wealthsimple AI Builder application. Not affiliated with Wealthsimple.

---

## What this is

WealthEasy is the demo shell for the **Life Event Detection & Proactive Planning Engine** — an AI system that monitors client accounts for life event signals, generates personalized financial briefs, routes them through human advisor review, and delivers them to clients.

The platform exists because the AI system can't be demoed in isolation. It needs surfaces to read from and write to. WealthEasy is those surfaces — built to look and feel close enough to the real Wealthsimple product that an evaluator immediately understands how this would work inside it.

---

## The system it wraps

| Stage | What happens |
|-------|-------------|
| 🔍 **Detect** | Monitors transaction patterns for signals — new baby purchases, large deposits, payroll increases, debt payoffs. Assigns a confidence score to each. |
| 📝 **Generate** | Calls the Claude API with the client's verified financial profile. Outputs a plain-language brief with three ranked actions specific to their situation. |
| 👤 **Review** | Every brief sits in an advisor queue before it touches a client. Advisor reads, edits if needed, approves or rejects. The AI never sends anything directly. |
| 📬 **Deliver** | Approved brief lands in the client's notification inbox. Client can mark each action as done, saved, or dismissed. |

> **The human checkpoint is non-negotiable.** Canadian securities regulations require that personalized investment guidance to retail clients be reviewed by a licensed human before delivery. The system is designed around this constraint, not despite it.

---

## Stack
```
Next.js 14 (App Router)   TypeScript   Tailwind CSS   Supabase   Claude API
```

No shadcn. No Radix. No MUI. Every component built from scratch.

---

## What's inside
```
/app
  /client              → Client-facing shell (phone-frame UI, 390px)
    /page.tsx          → Dashboard — portfolio total, accounts, notifications
    /notifications     → Notification inbox, read/unread state
    /briefs/[id]       → Brief detail — event context, ranked actions, CTAs
    /life-event        → Self-report a life event
    /accounts          → Accounts overview + TFSA, RRSP, FHSA, RESP, Cash pages
    /tax               → Tax filing surface

  /advisor             → Internal advisor tool (desktop, full-width)
    /queue             → Review queue — all pending briefs
    /brief/[id]        → Brief review — edit inline, approve / reject / flag
    /high-consequence  → High-stakes events requiring human classification before AI runs
    /audit             → Compliance audit log — immutable, filterable, exportable

  /dev                 → Demo controls (internal only)
    /page.tsx          → Signal trigger — fire mock account signals for any client
    /clients           → View all 25 seeded mock clients
    /transactions      → View and manually add transactions

/lib
  api.ts               → Fetch wrapper — all backend calls go through here
  types.ts             → TypeScript interfaces matching DB schema exactly
  design-system.ts     → Design tokens — colors, radii, shadows
  supabase/            → Browser and server Supabase clients
```

---

## Running locally
```bash
npm install
```

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_API_URL=http://localhost:3000
```
```bash
npm run dev
```

| Surface | URL |
|---------|-----|
| Client shell | `localhost:3000/client` |
| Advisor portal | `localhost:3000/advisor/queue` |
| Demo controls | `localhost:3000/dev` |

---

## Demo mode

Every client screen has a **Demo Mode** toggle in the top-right corner.

When active — phone frame (iPhone bezel, 390px), disclaimer banner, dev panel link in footer.
When inactive — full-width, no frame.

**Demo Mode is on by default.**

---

## Seeded data

| Data | Details |
|------|---------|
| 👥 25 mock clients | Realistic names, ages, provinces, income brackets. ~40% Ontario, ~25% BC, ~20% Quebec — mirrors Wealthsimple's real user base. TFSA room cross-referenced against actual CRA cumulative limits by age. |
| 💳 Transaction clusters | Pre-seeded signals for 6 clients: baby retail, payroll increase, large deposit, debt payoff, home purchase pattern, estate transfer. |
| 📋 Canadian tax rules | 2025 values — TFSA limit, RRSP deadline, RESP CESG, CCB amounts, FHSA limits, First-time Home Buyers' Tax Credit, Quebec QPIP vs federal EI. |

---

## The human/AI boundary

**The AI handles:**
- Transaction monitoring and signal detection
- Confidence scoring on detected events
- Pulling the client's verified financial profile
- Generating the full written brief with ranked recommendations
- Maintaining the advisor review queue

**The AI never:**
- Sends anything to a client without human approval
- Processes high-consequence events (large deposits, spouse death, divorce) before a human classifies them
- Calculates numbers — it receives a verified data object and reasons from it

**The audit log** captures every system, advisor, and client action — immutably, with structured metadata per action type. The `was_edited` boolean on brief approvals lets compliance identify whether advisors are reviewing or rubber-stamping, without storing full diffs.

---

## API contract

12 routes. Locked before either side wrote code. Neither side modifies the contract without telling the other.

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/events` | Life event intake |
| `GET` | `/api/briefs` | Advisor review queue |
| `GET` | `/api/briefs/:id` | Single brief with client profile |
| `POST` | `/api/briefs/:id/approve` | Approve brief |
| `POST` | `/api/briefs/:id/reject` | Reject brief |
| `POST` | `/api/briefs/:id/flag` | Flag for compliance |
| `GET` | `/api/events/high-consequence` | High-consequence event queue |
| `POST` | `/api/events/:id/classify` | Classify high-consequence event |
| `GET` | `/api/audit` | Audit log query |
| `GET` | `/api/notifications` | Client notifications |
| `GET` | `/api/client/briefs/:id` | Client brief view |
| `POST` | `/api/client/briefs/:id/actions` | Client action on brief item |

---

## Built by

**Antoine** — frontend, database schema, all client and advisor surfaces, dev panel, Demo Mode, Supabase setup

**Mohamad** — backend API routes, AI pipeline, event classification engine, brief generation, audit log, seed data scripts

3 days. Wealthsimple AI Builder application. February 2026.
