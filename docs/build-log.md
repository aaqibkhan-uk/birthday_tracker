# Build log

Running notes for the blog post. Newest entries at the bottom.

## 2026-10-20: Day 1, Milestone 0 (setup and spikes)

- Reviewed CLAUDE.md with the agent before writing code. Fixed a bug in the spec's next-reminder rule: with an offset that crosses a year boundary (e.g. 3 Jan birthday, 14-day offset, checked on 25 Dec), "try this year, then next year" can still return a past date. The rule now advances year by year until the reminder is in the future.
- Pinned down the delivery-estimate rule (order day not counted, weekend orders start Monday).
- Primary test device: iPhone.
- Repo initialised with `.gitignore`, README stub and this log.
- Scaffolded the Expo app on the latest SDK (58), then hit the first real-world snag: the App Store's Expo Go (57.0.9) only supports SDK 57, and there was no update to install. Downgraded the project to SDK 57; lesson: check the Expo Go version on the phone before picking an SDK.
- Notification spike: a throwaway screen schedules a local notification 2 minutes ahead. Force-quit the app, locked the iPhone, and it arrived on time. Tapping it reopened the app on the right screen, which is an early check of notification deep links.
- Backend: a Vercel function `POST /api/generate` in mock mode returns three generated gradient PNGs, so the card UI can be built without spending anything. Logic lives outside `api/` so it is tested with plain `Request` objects (no Vercel login needed for tests). Verified locally with `vercel dev` and curl.

## 2026-10-24: Milestone 0 continued (image providers)

- The plan assumed Pollinations as a free image API. It now requires an API key, and its free "Pollen" is a one-off grant rather than a daily refill. Researched alternatives (Gemini, Vercel AI Gateway, Hugging Face, AI Horde, fal, Replicate, Together, Leonardo); write-up in `docs/image-providers.md`.
- Switched the plan to Cloudflare Workers AI as primary: it is the only option found whose free allowance renews daily (10,000 Neurons/day). Pollinations stays as a fallback.
- Built provider-switching infrastructure: an ordered `IMAGE_PROVIDERS` chain, a registry so a new provider is one file, per-provider timeouts, response checks and shared contract tests.
- Cloudflare spike (FLUX.2 Klein 4B, 768×1072): three watercolour foxes, genuinely good, exactly the requested portrait size, no watermark. Two snags:
  - Faint pseudo-lettering crept onto the book covers.
  - The tree canopy filled the top third, where the front text should go.
- Speed: 21–26 s per image (about 26.5 s for a round of three, in parallel). That is right at the 25 s per-provider timeout, so this is an open question for Milestone 4.
- Ground rule agreed: no real provider calls without explicit approval, to protect the free allowance.

## 2026-10-25: Day 2, Milestone 1 (data and friends)

- SQLite schema from the ERD as migration 1, versioned with `PRAGMA user_version`; each migration runs in a transaction with its version bump, so a failed migration leaves the database untouched. Foreign keys are switched on per connection.
- Five repositories (friends, cards, designs, orders, profile). They talk to a tiny `Db` interface rather than expo-sqlite directly, so Jest runs them against a real in-memory SQLite (`better-sqlite3`). That caught the details that matter: deleting a friend removes their drafts but keeps ordered cards with no friend attached, one order per card, ordered cards are read-only.
- Date logic as pure functions with 86 tests, run in the Europe/London timezone so they cover the clocks changing. The year-boundary example from the spec (3 Jan birthday, 2-week reminder, checked on 25 Dec) needs two year jumps, and passes.
- Delivery estimate written now too, since it is pure and small.
- Screens: Upcoming (next 30 days, today highlighted, age turning), Friends (A–Z or next birthday), Orders (empty state for now), friend detail, and one add/edit form. Months are tap-to-pick chips rather than a date picker, which removes a whole class of invalid input; the day is still validated (no 31 April, 29 Feb only in leap years if a year is given).

## 2026-10-25: Milestone 2 (notifications)

- `buildSchedule` is a pure function: one next reminder per friend, soonest first, capped at iOS's 64 pending notifications. A thin `notificationsService` cancels everything and schedules that list; it is the only file that imports `expo-notifications`.
- Rescheduling happens on launch, after every friend add/edit/delete, and whenever the app comes back to the foreground. The last one is cheap, and it fixes the timezone case for free: a reminder scheduled as an absolute moment is re-anchored to 09:00 local the next time the app opens.
- Calls are queued, because "cancel all, then schedule all" run twice at once can leave duplicates.
- Permission is asked once on first launch; if it's off, a dismissible banner explains reminders won't work and links to Settings.
- The "Create card" prompt isn't stored anywhere: the friend screen shows it from the moment the reminder was due until the birthday. The same rule covers a tapped notification and a friend added too late for this year's reminder, and it warns when a printed card couldn't arrive in time.
- Replaced the Milestone 0 spike with a dev-only screen listing what the OS has scheduled, plus a "test tap in 10 seconds" button for checking deep links without waiting for 9am.

## 2026-10-25: Milestone 3 (card creation with mock images)

- Three screens: describe the picture (with optional style chips), choose a design, add your words. Every keystroke is saved straight to SQLite, so leaving halfway, or the app being killed, loses nothing; "Resume card" opens wherever you got to.
- Generation goes through a small client that turns every failure into a plain message: timeout (60 s), no connection, rejected description, daily limit, provider error. The rule that only successful rounds count against the 3-round cap is enforced in one place, which only increments the counter once the images are on disk and in the database. Tests cover the failure cases.
- The front text is drawn by the app over the image, never generated into it, so it is always crisp and spelled right.
- A small iOS gotcha: the app's Documents folder path can change between installs, so absolute `file://` paths saved in the database go stale. Images are stored by path relative to the documents folder instead.
- Added a tiny local mock server (`npm run dev:mock`) that can pretend to be slow or broken on demand, the easiest way to see the loading, timeout and error screens on a real phone without spending any credits.

## 2026-10-25: Expo SDK 58 upgrade (forced by Expo Go)

- Expo Go on the iPhone auto-updated to SDK 58 overnight and refused to open the SDK 57 project. On Day 1 it was the other way round, which is why we had downgraded. Lesson: Expo Go only ever runs one SDK, so the project has to follow it.
- `npx expo install --fix` got stuck halfway on an npm peer-dependency conflict; setting every package to its SDK 58 version and reinstalling from scratch fixed it.
- The type checker found one small break. Reading the changelogs found a more important one it missed: `File.write()` became asynchronous, so saved images weren't awaited. Worth reading the "breaking changes" sections rather than trusting a green build.

## 2026-10-25: Milestone 4 (real image generation, code)

- Resolved the timeout question from the spike: a Cloudflare round takes about 26 s, so each provider now gets up to 40 s, but the whole request has a 55 s deadline. A fallback only gets whatever time is left, so the app (which gives up at 60 s) always gets an answer, even a "please try again".
- The prompt template now tackles both spike problems head on: the subject goes in the lower two thirds, the top third is plain background for the front text, and books, signs and labels are explicitly blank.
- Moderation is a whole-word blocklist (sexual content, violence, hate, real people, brands, characters). Whole words matter: "grape" and "Scunthorpe" must pass. A few obvious candidates were dropped because they would block perfectly good cards: "frozen lake", "an explosion of colour", "cross stitch".
- The daily budget lives in Upstash, one counter per UTC day (when Cloudflare's free allowance resets). It is counted before calling the provider, because a failed round may still have cost credits, and it fails closed: if the counter can't be checked, nothing is generated.
- Cloudflare and Pollinations providers are written and tested with `fetch` stubbed, so no credits were spent writing them.

