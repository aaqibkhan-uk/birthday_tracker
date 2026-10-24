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
