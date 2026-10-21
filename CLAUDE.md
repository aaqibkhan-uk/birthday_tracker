# CLAUDE.md: Birthday Card App (v0)

This file is the project's north star. Read it fully before starting any task. It describes what we are building, the agreed decisions, and the plan. It is a guide, not a contract: if something here turns out to be wrong or impractical, say so, propose a change, and update this file once agreed.

---

## 1. Project overview

A mobile app that helps the user remember friends' birthdays and send them a personalised printed card.

The core loop:

1. The user saves friends with their birthday, optional address and a reminder preference.
2. The app sends a local push notification before each birthday.
3. The user designs a card: describes the artwork, an AI model generates options, they pick one, add front text and an inside message.
4. The user previews the card in an interactive "open the card" view.
5. The user goes through a **mocked** checkout (destination, delivery date, demo payment, confirmation).

**Context:** this is a one-week hobby build for a blog post, not a commercial product. Optimise for a working, demoable, well-structured v0, not for scale. Budget for third-party services is £0 (free tiers only).

---

## 2. Working agreement for the agent

- **Read this file first** at the start of every session.
- **Work in small, verifiable steps.** Prefer finishing one vertical slice end to end over scaffolding many half-built screens.
- **Plan before large changes.** For anything touching several files or the data model, outline the plan first.
- **Ask, don't guess,** when a requirement is ambiguous or a decision is not covered here. Small, reversible implementation choices can be made without asking; note them in the decision log (section 12).
- **Do not expand scope.** Anything in "Out of scope" (section 5) stays out unless the user explicitly asks.
- **Keep the app runnable.** After each step, the app should start in Expo Go without errors.
- **Test the pure logic.** Date and scheduling logic must have unit tests (see section 8).
- **Never commit secrets.** API keys live only in Vercel environment variables or a local `.env` that is git-ignored.
- **Update this file** when a decision changes: the progress tracker (section 11) and decision log (section 12) in particular.
- **Commit at sensible checkpoints** with clear messages.

---

## 3. Functional requirements (v0)

IDs are stable; reference them in commits and code comments where helpful.

### 1. Friends

- **FR-1.1** The user can add a friend with: name (required), birthday day and month (required), birth year (optional), postal address (optional: line 1, line 2, city, postcode), and a reminder offset. Reminder options: on the day (0), 1 day before (1), 1 week before (7), 2 weeks before (14). Default: 1 week before.
- **FR-1.2** The user can edit and delete a friend.
- **FR-1.3** The user can view a list of saved friends with their birthdays, sortable alphabetically or by next upcoming birthday.
- **FR-1.4** All data is stored on the device. No accounts or login in v0.
- **FR-1.5** Birthday input is validated: impossible dates (e.g. 31 Feb, 31 Apr) are rejected. 29 Feb is allowed.

### 2. Upcoming birthdays

- **FR-2.1** The user can view upcoming birthdays, sorted soonest first, showing days remaining.
- **FR-2.2** Today's birthdays are highlighted. Birthdays recur yearly. A 29 Feb birthday is treated as 28 Feb in non-leap years.
- **FR-2.3** If a birth year is known, show the age they are turning (nice-to-have).

### 3. Notifications

- **FR-3.1** The app requests notification permission on first launch. If denied, a persistent, dismissible banner explains reminders will not work and links to system settings.
- **FR-3.2** For each friend, the app schedules one local notification at 09:00 local time on the reminder date (birthday minus reminder offset).
- **FR-3.3.1** Notifications are local notifications scheduled with the OS, so they fire when the app is closed or force-quit. No server is involved.
- **FR-3.3.2** On every app launch, and whenever a friend is added, edited or deleted, the app cancels all of its scheduled notifications and schedules exactly one per friend: that friend's next upcoming reminder only.
- **FR-3.3.3** The next reminder is the earliest occurrence of (birthday − offset) at 09:00 local time that is still in the future. If this year's has passed, use next year's.
- **FR-3.3.4** For 29 Feb birthdays in non-leap years, the birthday is treated as 28 Feb and the offset is counted from that date.
- **FR-3.3.5** Deleting a friend cancels their notification.
- **FR-3.3.6** At most one notification per friend. iOS allows 64 pending local notifications per app; if there are more than 64 friends, schedule the 64 soonest.
- **FR-3.4** Tapping a notification opens that friend's screen with a "Create card" prompt (deep link via Expo Router, friend id in the notification data).
- **FR-3.5** If a friend is added or edited when the reminder for their upcoming birthday has already passed (or the birthday is today), no notification is scheduled for that birthday. The app shows the "Create card" prompt immediately, with the delivery warning from FR-6.2 if there is not enough time. The next notification is for the following year.

**Known limitation:** if the user does not open the app for over a year, reminders stop after the last scheduled one fires. Accepted for v0.

### 4. Card creation

- **FR-4.1** The user can start a card from a friend's screen at any time. If a draft exists for that friend, the button reads "Resume card".
- **FR-4.2** The user enters a text description of the artwork (max 300 characters) and can optionally pick a style chip (e.g. watercolour, cartoon, minimalist, vintage, playful).
- **FR-4.3** The user optionally enters front text (max 40 characters). Front text is rendered by the app as a text overlay, never baked into the AI image.
- **FR-4.4** The app requests 3 design options per generation round via the backend. It shows a visible loading state, times out after 60 seconds, and offers retry. Failed generations do not count toward the cap.
- **FR-4.5** The user can select one design, regenerate, or edit the prompt and generate again.
- **FR-4.6** Generation is capped per card (default 3 rounds, configurable constant), with the remaining count shown. The backend also enforces a global daily limit to protect the free quota. One "round" = one request returning 3 images.
- **FR-4.7** Prompts are checked for inappropriate content before generation (backend blocklist plus provider filters). Rejected prompts show a clear, friendly message and do not count toward the cap. Blocked at minimum: sexual content, violence/gore, hate, real people's names, brands and copyrighted characters.
- **FR-4.8** The user writes the inside message (max 500 characters). It is laid out automatically on the inside of the card, wrapping and scaling so it never overflows.
- **FR-4.9** Image generation goes through our backend so no API key ships in the app.
- **FR-4.10** Cards auto-save as drafts as the user progresses. Leaving the flow does not lose work.
- **FR-4.11** The chosen design image is saved to the device file system and referenced by path. Unselected images may be discarded.

### 5. Preview

- **FR-5.1** An interactive card preview: tap or swipe to open the card (animated), showing the front (image + front text) and the inside (message).
- **FR-5.2** From the preview, the user can go back and edit the design, front text or message.
- **FR-5.3** An "Approve and continue" action moves to checkout and sets the card status to approved.

### 6. Checkout (all mocked)

- **FR-6.1** The user chooses a destination: the friend's saved address (if any) or their own address. Missing addresses must be entered here, with basic validation (required fields, UK postcode format). The user's own address can be saved to their profile for reuse.
- **FR-6.2** An estimated delivery date is shown (rule in section 8). If the card cannot arrive on or before the birthday, a clear warning is shown, but the user can still proceed.
- **FR-6.3** A mock payment screen shows the price (£3.99, constant) with a clear "Demo mode, no real payment" label and a single "Pay (demo)" button. **No card number fields at all.**
- **FR-6.4** The user enters (or confirms saved) email. An order confirmation screen summarises the card, destination and delivery date.
- **FR-6.5** A confirmation "email" is simulated: an in-app screen shows exactly what the email would contain. (Real email via Resend is a "Could".)
- **FR-6.6** Orders are saved locally and shown in an order history. Orders snapshot the recipient, address, image and text, so they survive later edits or deletion of the friend. Ordered cards are read-only.

### General

- **FR-7.1** Empty states for: no friends, no upcoming birthdays, no orders, each with a clear call to action.

---

## 4. Priorities (MoSCoW)

- **Must:** FR-1.x, FR-2.1, FR-2.2, FR-3.x, FR-4.1–4.5, FR-4.8, FR-4.9, FR-4.11, FR-5.1, FR-5.2, FR-6.1, FR-6.3, FR-6.4, FR-6.6
- **Should:** FR-4.6, FR-4.7, FR-4.10, FR-5.3, FR-6.2, FR-6.5, FR-7.1
- **Could:** FR-2.3, real confirmation email, preview animation polish beyond a basic flip/open

If time is short, cut from the bottom up.

---

## 5. Out of scope for v0

Do not build these unless explicitly asked:

- Friends submitting their own birthday/address via a shared link
- Friends contributing messages to a card
- Accounts, login, cloud sync, multi-device
- Contacts or calendar import
- Real payments, real printing or postage, print-resolution upscaling
- Multiple reminders per friend, custom reminder times
- Server-sent (remote) push notifications

---

## 6. Non-functional requirements

- **Offline:** everything works offline except image generation (and real email, if added).
- **Privacy:** friends' names, birthdays and addresses never leave the device. The backend receives only the artwork prompt and style, and stores nothing about the user.
- **Cost:** £0. Free tiers only. Backend enforces a daily request budget and basic rate limiting.
- **Platform:** iOS and Android via Expo; developed and tested on the user's own phone in Expo Go. Primary test device: iPhone (Expo Go).
- **Accessibility basics:** readable font sizes, sufficient contrast, accessible labels on buttons.
- **Code quality:** TypeScript strict mode, ESLint + Prettier, no `any` without a comment explaining why.

---

## 7. Tech stack

### Mobile app (`/mobile`)

| Concern              | Choice                                                                |
| -------------------- | --------------------------------------------------------------------- |
| Framework            | Expo (React Native), TypeScript, latest stable SDK                    |
| Navigation           | Expo Router (file-based; handles notification deep links)             |
| Local database       | `expo-sqlite`, accessed only through a repository layer               |
| Notifications        | `expo-notifications` (local notifications only; supported in Expo Go) |
| Image storage        | `expo-file-system` (app document directory)                           |
| Animation / gestures | `react-native-reanimated`, `react-native-gesture-handler`             |
| Dates                | `date-fns`                                                            |
| Forms                | React state; `react-hook-form` only if forms get complex              |
| State management     | None. SQLite is the source of truth; use repository functions + hooks |
| UI library           | None. Plain `StyleSheet` with a small shared theme file               |
| Tests                | Jest (`jest-expo` preset)                                             |

### Backend (`/backend`)

| Concern                | Choice                                                                                         |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| Hosting                | Vercel Hobby (free), plain project with an `api/` folder, Node.js runtime (not Edge)           |
| Endpoint               | `POST /api/generate`                                                                           |
| Image provider         | Pollinations (primary), Cloudflare Workers AI via REST (fallback), behind a provider interface |
| Daily cap / rate limit | Upstash Redis (via Vercel Marketplace)                                                         |
| Moderation             | Keyword blocklist + provider built-in filters                                                  |
| Mock mode              | `IMAGE_PROVIDER=mock` returns 3 placeholder images instantly, for UI development at zero cost  |

Note: free-tier details (rate limits, watermarks, model names) change often. Verify against current provider docs when implementing, and keep the provider choice swappable.

### Tooling

Node.js LTS, npm, Git + GitHub, Vercel CLI (`vercel dev` for local backend), VS Code.

---

## 8. Key domain logic (implement as pure, unit-tested functions)

Put these in `mobile/src/domain/` with no React or Expo imports, so they are trivially testable.

### Next birthday

`getNextBirthday(day, month, now): Date`

- The next date with that day/month on or after today (local time, date only).
- 29 Feb in a non-leap year → 28 Feb.

### Next reminder

`getNextReminder(day, month, offsetDays, now): Date`

- For the birthday occurrence in the current year: reminder = (birthday − offsetDays) at 09:00 local.
- If that moment is ≤ now, move to the next year's birthday and repeat until the reminder is in the future (at most a couple of iterations).
- Must handle offsets that cross month and year boundaries (e.g. birthday 3 Jan, offset 14 → 20 Dec of the previous year). Example: on 25 Dec 2026, birthday 3 Jan, offset 14 → 20 Dec 2025 (past) → 20 Dec 2026 (past) → **20 Dec 2027**.

### Days remaining

`getDaysUntilBirthday(day, month, now): number` (0 = today).

### Delivery estimate

- Assumption: production 2 working days + postage 3 working days = 5 working days (Mon–Fri; ignore bank holidays in v0).
- The order day itself is not counted; counting starts at the next working day (so a Saturday or Sunday order counts from Monday). Example: order Mon → delivery the following Mon; order Sat → delivery the following Fri.
- "Can arrive" means estimated delivery date ≤ birthday date (date only).
- `getEstimatedDelivery(orderDate): Date`
- `canArriveByBirthday(orderDate, birthday): boolean` drives the FR-6.2 warning.

### Scheduling

`buildSchedule(friends, now): ScheduledReminder[]`

- One entry per friend (their next reminder), sorted soonest first, capped at 64.
- A thin service (`notificationsService`) then cancels all OS notifications and schedules this list. The service is the only code that touches `expo-notifications`.

### Required test cases (minimum)

- Normal birthday, reminder later this year.
- Reminder already passed this year → next year.
- Birthday today (offset 0, before and after 09:00).
- Offset crossing a year boundary.
- 29 Feb in leap and non-leap years.
- More than 64 friends → only 64 soonest scheduled.
- Delivery across a weekend; delivery too late for birthday.

---

## 9. Data model (ERD)

The canonical diagram is `docs/erd.drawio` (crow's foot notation). The schema below is the source of truth for code.

### Relationships

- `friends` (0..1) ── (0..\*) `cards`: `cards.friend_id` is nullable, `ON DELETE SET NULL`. When deleting a friend, the app first deletes that friend's **draft/approved** cards (and their designs and image files); ordered cards remain with `friend_id = NULL`.
- `cards` (1) ── (0..\*) `card_designs`: `ON DELETE CASCADE`.
- `cards` (1) ── (0..1) `orders`: `orders.card_id` is `UNIQUE`.
- `user_profile` is a standalone single-row table.

### Schema (SQLite)

```sql
CREATE TABLE friends (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  name                  TEXT NOT NULL,
  birth_day             INTEGER NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
  birth_month           INTEGER NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
  birth_year            INTEGER,
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT,
  postcode              TEXT,
  reminder_offset_days  INTEGER NOT NULL DEFAULT 7 CHECK (reminder_offset_days IN (0, 1, 7, 14)),
  created_at            TEXT NOT NULL,   -- ISO 8601
  updated_at            TEXT NOT NULL
);

CREATE TABLE cards (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  friend_id         INTEGER REFERENCES friends(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'ordered')),
  art_prompt        TEXT,
  style             TEXT,
  front_text        TEXT,
  inside_message    TEXT,
  generations_used  INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE card_designs (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id           INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  generation_round  INTEGER NOT NULL,
  prompt_used       TEXT NOT NULL,
  image_path        TEXT NOT NULL,       -- local file URI
  is_selected       INTEGER NOT NULL DEFAULT 0 CHECK (is_selected IN (0, 1)),
  created_at        TEXT NOT NULL
);

CREATE TABLE orders (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id                  INTEGER NOT NULL UNIQUE REFERENCES cards(id),
  destination_type         TEXT NOT NULL CHECK (destination_type IN ('friend', 'self')),
  recipient_name           TEXT NOT NULL,  -- snapshot
  address_line1            TEXT NOT NULL,  -- snapshot
  address_line2            TEXT,
  city                     TEXT NOT NULL,
  postcode                 TEXT NOT NULL,
  image_path               TEXT NOT NULL,  -- snapshot (copy of selected design file)
  front_text               TEXT,
  inside_message           TEXT NOT NULL,
  confirmation_email       TEXT NOT NULL,
  price_pence              INTEGER NOT NULL,
  estimated_delivery_date  TEXT NOT NULL,  -- ISO date
  status                   TEXT NOT NULL DEFAULT 'confirmed',
  created_at               TEXT NOT NULL
);

CREATE TABLE user_profile (
  id                      INTEGER PRIMARY KEY CHECK (id = 1),
  name                    TEXT,
  email                   TEXT,
  address_line1           TEXT,
  address_line2           TEXT,
  city                    TEXT,
  postcode                TEXT,
  notifications_prompted  INTEGER NOT NULL DEFAULT 0
);
```

### Database rules

- Enable foreign keys on every connection: `PRAGMA foreign_keys = ON;`.
- Use simple versioned migrations (e.g. `PRAGMA user_version`) in `mobile/src/db/migrations.ts`.
- Screens never run SQL directly. Use repositories: `friendsRepo`, `cardsRepo`, `designsRepo`, `ordersRepo`, `profileRepo`.
- Notifications and next-reminder dates are **not stored**; they are derived from `friends`.
- On order, copy the selected image to a stable path so the order's snapshot cannot be broken by later cleanup.

---

## 10. Architecture

### Repository layout

```
/
├── CLAUDE.md
├── README.md
├── docs/
│   ├── erd.drawio
│   └── build-log.md          # running notes for the blog post
├── mobile/                   # Expo app
│   └── src/
│       ├── app/              # Expo Router screens (only routes/layouts here)
│       │   ├── (tabs)/
│       │   │   ├── index.tsx     # Upcoming
│       │   │   ├── friends.tsx   # Friends list
│       │   │   └── orders.tsx    # Order history
│       │   ├── friend/[id].tsx   # Friend detail (Create/Resume card)
│       │   ├── friend/new.tsx    # Add / edit friend
│       │   ├── card/[cardId]/    # describe, designs, message, preview
│       │   └── checkout/[cardId]/ # destination, payment, confirmation, email-preview
│       ├── domain/           # pure logic + tests (dates, schedule, delivery)
│       ├── db/               # connection, migrations, repositories
│       ├── services/         # notifications, image API client, file storage
│       ├── components/       # shared UI (CardPreview, Banner, EmptyState…)
│       ├── hooks/
│       ├── theme.ts
│       └── config.ts         # constants: caps, char limits, price, API URL
└── backend/                  # Vercel project
    ├── api/generate.ts
    └── lib/
        ├── handleGenerate.ts # request handling, testable without Vercel
        ├── validation.ts     # request validation, allowed styles
        ├── errors.ts
        ├── png.ts            # tiny PNG encoder for mock placeholders
        ├── providers/        # mock.ts, pollinations.ts, cloudflare.ts, index.ts, types.ts
        ├── moderation.ts
        ├── promptTemplate.ts
        └── rateLimit.ts      # Upstash daily counter
```

Treat this as a starting point; adjust if Expo Router conventions require it, and record the change.

### Backend API contract

`POST /api/generate`

Request:

```json
{
  "prompt": "a fox reading a book under a tree",
  "style": "watercolour",
  "count": 3
}
```

Success `200`:

```json
{
  "images": [{ "base64": "...", "mimeType": "image/jpeg" }],
  "provider": "pollinations"
}
```

Errors (JSON `{ "error": { "code": "...", "message": "..." } }`):

- `400 invalid_request`: missing/too-long prompt
- `422 prompt_rejected`: failed moderation (client: does not count toward cap)
- `429 daily_limit_reached`: global budget exhausted
- `502 provider_error`: all providers failed (client: retry; does not count toward cap)
- `405 method_not_allowed`: not a POST
- `500 internal_error`: server misconfigured (e.g. unknown `IMAGE_PROVIDER`)

Request rules: `prompt` trimmed, 1–300 chars; `style` optional, must be one of `watercolour | cartoon | minimalist | vintage | playful`; `count` optional integer 1–3 (default 3). Mock mode returns `image/png`.

Backend rules:

- Validate input, moderate, wrap the prompt in the template, call providers in order (primary → fallback), return images.
- Prompt template (adjust as needed): _"Greeting card front illustration, portrait orientation. Subject: {prompt}. Style: {style}. No text, letters or words anywhere in the image. Calm, uncluttered space in the upper third. Suitable for all ages."_
- Portrait aspect ratio approx. 5:7 (e.g. 768×1072 or nearest supported).
- Generate the 3 images in parallel.
- Log nothing that identifies a user. Never log full prompts in production.
- Environment variables: `IMAGE_PROVIDER` (`mock` | `pollinations` | `cloudflare`), provider keys, `UPSTASH_*`, `DAILY_GENERATION_LIMIT`. Document them in `backend/.env.example`.

### App config

The app reads the backend URL from an Expo public env var (e.g. `EXPO_PUBLIC_API_URL`). For local development on a phone, the backend URL must be reachable from the device (use the deployed Vercel URL or the machine's LAN IP).

---

## 11. Development plan and progress

High-level plan for the week. Each milestone ends with something runnable. Update the checkboxes as work completes.

### Milestone 0: Setup and spikes (Day 1)

- [ ] Repo structure, git init, `.gitignore`, README stub, `docs/build-log.md`
- [ ] Expo app scaffolded (TypeScript, Expo Router, ESLint, Prettier, Jest)
- [ ] Spike: schedule a local notification 2 minutes ahead; confirm it fires with the app force-quit on a real phone
- [ ] Backend scaffolded on Vercel with `/api/generate` in mock mode
- [ ] Spike: call the real image provider from a script; note quality, speed, watermark, limits

### Milestone 1: Data and friends (Day 2)

- [ ] SQLite connection, migrations, repositories
- [ ] Domain date functions + unit tests (section 8)
- [ ] Add/edit/delete friend with validation
- [ ] Friends list (sort toggle) and Upcoming list with days remaining, today highlighted
- [ ] Empty states

### Milestone 2: Notifications (Day 3)

- [ ] Permission request + denied banner
- [ ] `buildSchedule` + tests; notifications service (cancel all, schedule all)
- [ ] Reschedule on launch and on friend changes
- [ ] Notification tap → friend screen; late-addition prompt (FR-3.5)

### Milestone 3: Card creation with mock images (Day 4)

- [ ] Card flow screens: describe → designs → message
- [ ] Draft auto-save, Resume card
- [ ] Save selected image to file system
- [ ] Generation cap display, loading/timeout/retry states

### Milestone 4: Real generation (Day 5)

- [ ] Pollinations provider, Cloudflare fallback
- [ ] Moderation blocklist, prompt template
- [ ] Upstash daily limit
- [ ] Deployed to Vercel; app pointed at deployed URL

### Milestone 5: Preview and checkout (Day 6)

- [ ] Interactive card preview (open/flip animation)
- [ ] Destination + address entry, delivery estimate + warning
- [ ] Mock payment, confirmation, simulated email screen
- [ ] Order history (read-only snapshots)

### Milestone 6: Test and polish (Day 7)

- [ ] Run the manual test checklist (below) on a real device
- [ ] Fix bugs, polish key screens
- [ ] Screenshots / screen recording for the blog post
- [ ] README with setup instructions

### Manual test checklist

1. Notification fires with the app force-quit.
2. Friend added after their reminder date → no notification, "Create card" prompt shown.
3. 29 Feb friend → correct next date in a non-leap year.
4. Editing a reminder offset replaces the old notification.
5. Timezone change + reopen → notification at 09:00 in the new zone.
6. Phone restart → scheduled reminders still fire.
7. Full card flow → order appears in history; deleting the friend keeps the order.
8. Rejected prompt does not consume a generation.
9. Backend in mock mode and real mode both work.

---

## 12. Decision log

Record notable decisions here (date, decision, reason). Keep entries short.

| Date       | Decision                                                                                             | Reason                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-20 | On-device storage, no accounts                                                                       | Faster to build, simpler privacy, local notifications need no server                                                                                                                   |
| 2026-10-20 | Reschedule all notifications on every launch (one per friend)                                        | Simple, self-correcting; respects iOS 64 pending limit                                                                                                                                 |
| 2026-10-20 | 29 Feb → 28 Feb in non-leap years                                                                    | Consistency across FR-2.2 and FR-3.3.4                                                                                                                                                 |
| 2026-10-20 | Front text overlaid by app, not generated                                                            | Image models render text poorly                                                                                                                                                        |
| 2026-10-20 | Vercel + Upstash for backend                                                                         | User preference; free tier fits                                                                                                                                                        |
| 2026-10-20 | Pollinations primary, Cloudflare fallback, mock mode                                                 | £0 budget; swappable providers                                                                                                                                                         |
| 2026-10-20 | Checkout, payment and email are mocked                                                               | Blog demo; no real money or personal data handling                                                                                                                                     |
| 2026-10-20 | `getNextReminder` advances year by year until the reminder is in the future                          | "This year, else next year" can still return a past date when the offset crosses a year boundary                                                                                       |
| 2026-10-20 | Delivery: order day not counted; weekend orders count from Monday; can arrive if delivery ≤ birthday | Removes ambiguity in the delivery estimate                                                                                                                                             |
| 2026-10-20 | Primary test device: iPhone                                                                          | User's phone; iOS keeps local notifications after force-quit                                                                                                                           |
| 2026-10-20 | Expo SDK 57 (not 58); routes live in `mobile/src/app/`                                               | App Store Expo Go is 57.0.9 and supports SDK 57 only; SDK 58 Expo Go not yet available. Upgrade when it is. Routes follow current Expo Router template convention (section 10 updated) |
| 2026-10-20 | `mobile/` and `backend/` are independent npm projects (no workspaces)                                | Avoids Metro monorepo configuration                                                                                                                                                    |
| 2026-10-20 | ESLint `no-explicit-any` set to error                                                                | Enforces §6; justified uses need an eslint-disable comment with a reason                                                                                                               |
| 2026-10-20 | Backend uses the web-standard `fetch` handler; logic in `lib/handleGenerate.ts`; tests with Vitest   | Vercel's recommended signature; testable with plain `Request` objects, no Vercel login needed                                                                                          |
| 2026-10-20 | `style` restricted to a fixed allowlist; unset `IMAGE_PROVIDER` defaults to `mock`                   | Stops arbitrary text entering the prompt via `style`; a misconfigured deploy costs nothing                                                                                             |
| 2026-10-20 | Mock images are generated PNG gradients (768×1072), no external calls                                | React Native can't render SVG out of the box; zero cost, works offline                                                                                                                 |
