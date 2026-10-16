# DiscipleShip International

A multi-tenant platform for local churches. A church registers, builds a digital
survey, shares an anonymous link with its congregation, and gets the free-text
answers clustered into themes by AI and charted for leadership — then turns those
themes into a teaching series, the artwork to promote it, and the visit
scheduling to welcome who it brings in.

Built on Next.js 15 (App Router), Firebase Auth + Firestore + Storage, NextAuth,
and OpenAI. Deploys to Firebase App Hosting.

## Modules

| Module | Included | Cost |
| --- | --- | --- |
| **Survey Analytics** — surveys, anonymous responses, AI themes, charts | Yes | 1 credit / response analyzed |
| **Sermon Builder** — outlines and multi-week series from survey themes | Add-on | 25 credits / sermon |
| **Image Studio** — series art, slide backgrounds, social graphics | Add-on | 40 credits / image |
| **Tours & Visits** — guest booking pages and mission trip itineraries | Add-on | Free |

Entitlements live on the church document and are resolved by `lib/modules.ts`.
A platform admin toggles them per church from `/admin/churches/{id}`. Every
metered route calls `requireModuleAccess()`, so a module physically cannot ship
without its paywall.

---

## How it works

**Church signs up** → `/signup` creates a Firebase Auth user, a `churches`
document, and an owner profile, and seeds the church with welcome credits.

**Church builds a survey** → `/dashboard/surveys/new`. Each question is short
text, paragraph, single choice, checkboxes, or a rating scale. Two flags matter:

- **AI themes** — free-text answers to this question get clustered into themes.
- **Compare groups by this** — a choice/scale question becomes a *segment*, so
  themes can be broken down by it (e.g. by age group).
- **Theme group** — questions sharing a group name are clustered into *one*
  taxonomy. Use it for repeated prompts like "Top Stressor 1/2/3" so you get one
  set of stressor themes instead of three unrelated sets.

**Congregation responds** → publishing yields `/s/{token}`, a public link that
needs no account. Nothing identifying is stored — the response document holds
only answers and a timestamp.

**AI analysis** → `POST /api/surveys/{id}/analyze` runs through the job runner
(see below), then for each theme group:

1. **Discovery** — sends a sample of the answers and asks for a taxonomy of
   roughly `√n` themes, capped at 12.
2. **Assignment** — batches of 40 answers are assigned to a theme id with a
   confidence score, 4 batches in flight at a time.
3. **Tallies** — choice questions are counted directly, and themes are
   cross-tabbed against every segment question.
4. **Narrative** — a short set of findings for leadership.

Charts render at `/dashboard/surveys/{id}/analytics`.

**Sermon Builder** → pick a theme from an analysis and generate one outline, or
plan a whole series: the model designs the arc from the ranked themes, then
writes each week grounded in the verbatim answers behind its closest theme.
Outlines are fully editable and export to Word.

**Tours & Visits** → publish a bookable visit time at `/v/{token}`; capacity is
enforced inside a Firestore transaction so two people can't take the last seat.
Mission trips are multi-stop itineraries with dates, hosts, and per-leg status.

**Importing existing data** → `/dashboard/surveys/import` takes a Google Forms
or Excel export, guesses how to treat each column (skipping Timestamp/Email,
detecting categorical columns, grouping repeated prompts), and loads the rows as
responses so historical data can be analyzed too.

---

## The job runner

Every unit of metered AI work goes through `runJob()` in `lib/jobs.ts`, which
claims the job id, reserves credits in a transaction, executes the body while
streaming progress into the job document, and either records the result or
**refunds and records the failure**.

The browser generates the job id and sends it with the request, so it can poll
`/api/jobs/{id}` for live progress while the (possibly minutes-long) POST is
still in flight. There is no fire-and-forget work that a scaled-down instance
could silently drop. `reapStaleJobs()` runs opportunistically and refunds any
run whose instance died mid-flight, so credits are never permanently stranded.

Adding a module means writing its engine and calling `runJob()`. Auth,
entitlement, billing, refunds, progress, and audit are already handled.

---

## Setup

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Three things are required before the app will run:

1. **A Firebase service account.** Firebase Console → Project settings →
   Service accounts → *Generate new private key*. Paste the JSON as a single
   line into `FIREBASE_SERVICE_ACCOUNT`. All church, survey and response data is
   read and written server-side through the Admin SDK; without this key every
   authenticated route fails with a setup message.
2. **`NEXTAUTH_SECRET`** — `openssl rand -base64 32`.
3. **A valid `OPENAI_API_KEY`** — used only when an analysis is run.

Deploy the security rules and indexes:

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
```

The rules deny all direct browser access on purpose — every read and write goes
through the server, where the tenant guards live.

### Deploying to Firebase App Hosting

`apphosting.yaml` is configured for this app: a 900s request timeout (a sermon
series writes N outlines in one request) and secrets pulled from Secret Manager.
On App Hosting the Admin SDK uses Application Default Credentials, so no service
account key is needed — only `FIREBASE_PROJECT_ID`. Create each referenced
secret with `npx firebase-tools apphosting:secrets:set <name>`.

### Making yourself a platform admin

Set `SUPER_ADMIN_EMAILS` to a comma-separated list of emails. Those accounts get
the `super_admin` role on sign-in and can reach `/admin` — every church, their
survey and response counts, and credit grants. This is env-based on purpose, so
the first admin exists before any user document does.

---

## Credits

Building surveys and collecting responses is free. Running an analysis costs
`CREDITS_PER_RESPONSE` (default 1) per response in the survey, minimum 1.

Balances live on the church document and every change writes a row to
`churches/{id}/creditTransactions`. Spending happens inside a Firestore
transaction, so two concurrent analyses cannot overdraw a balance.

### Buying credits

Owners buy credit packs with a card through Stripe Checkout. Packs are defined
once in `lib/payments.ts` and read by the pricing page, the billing page, and
the Checkout line item, so a displayed price can never differ from what is
charged.

| Pack | Credits | Price |
| --- | --- | --- |
| Starter | 1,000 | $19 |
| Church | 5,000 | $79 |
| Network | 20,000 | $249 |

**Credits are granted only by the webhook** at `/api/billing/webhook`, never by
the browser returning from Stripe. Three properties make that safe:

1. The payload signature is verified against `STRIPE_WEBHOOK_SECRET`.
2. The credit amount is re-derived from `packId` against `CREDIT_PACKS` — never
   read from an amount the browser could have influenced.
3. Every processed event id is written with Firestore's `create()`, which fails
   if the document exists. Stripe delivers at least once; this makes a
   redelivery a no-op. If a handler throws, the claim is released so Stripe's
   retry can succeed.

Refunds are logged but **not** applied automatically — clawing back credits a
church has already spent would drive the balance negative, so an admin adjusts
it from `/admin`.

Without `STRIPE_SECRET_KEY` the buy buttons are disabled and an admin tops
churches up from `/admin`; everything else works unchanged. Locally, forward
webhooks with `npx stripe listen --forward-to localhost:3000/api/billing/webhook`.

---

## Data model

```
churches/{churchId}          name, credits, status, ownerUid, modules{}, branding
  creditTransactions/{txId}  delta, balanceAfter, reason, actorUid
users/{uid}                  email, churchId, role (owner | leader | super_admin)
invites/{inviteId}           churchId, email, role, token, expiresAt
surveys/{surveyId}           churchId, questions[], status, publicSlug
  responses/{responseId}     answers{questionId: value}, submittedAt
  analyses/{analysisId}      themes[], assignments[], breakdowns, insights
jobs/{jobId}                 churchId, moduleId, status, progress, credits
sermonSeries/{seriesId}      title, premise, weeks, sourceSurveyId
sermons/{sermonId}           churchId, seriesId, points[], scripture[], application[]
images/{imageId}             churchId, purpose, url, storagePath
tours/{tourId}               churchId, kind, stops[]
visitSlots/{slotId}          churchId, startsAt, capacity, booked, publicSlug
visitBookings/{bookingId}    slotId, name, email, partySize
purchases/{purchaseId}       churchId, packId, credits, stripeSessionId
stripeEvents/{eventId}       processed-webhook markers (idempotency)
auditEvents/{eventId}        churchId, actorUid, action, target
rateLimits/{bucket}          fixed-window counters (TTL-purged)
```

Tenant isolation is enforced in `lib/session.ts`. `requireSurveyAccess()` returns
404 rather than 403 when a survey belongs to another church, so ids from other
tenants can't be confirmed by probing.

---

## Key files

| Path | What it does |
| --- | --- |
| `lib/analysis.ts` | Theme discovery, assignment, tallies, insights |
| `lib/db.ts` | All Firestore access, including the credit transaction |
| `lib/session.ts` | Auth guards and tenant isolation |
| `lib/validate.ts` | Question and answer validation |
| `app/s/[slug]/` | Public anonymous survey form |
| `app/dashboard/surveys/[id]/analytics/` | The charts |
| `lib/modules.ts` | Module registry, per-action credit pricing, entitlements |
| `lib/payments.ts` | Credit packs and Stripe Checkout sessions |
| `lib/jobs.ts` | Job runner: credits, progress, refunds, reaping |
| `lib/sermons.ts` | Sermon and series generation |
| `lib/images.ts` | Image generation and sizing per purpose |
| `app/components/useJob.ts` | Client-side job start + progress polling |
| `app/admin/` | Platform-wide church admin and module toggles |

---

## Roles

**Super admin** (via `SUPER_ADMIN_EMAILS`) sees every church, toggles modules,
and grants credits. **Owner** manages settings, team, and billing. **Leader**
can build surveys, run analyses, and use every enabled module.

Team invitations are sent by email when `RESEND_API_KEY` is set; otherwise the
owner gets a copyable link in the UI, so onboarding still works without mail.
