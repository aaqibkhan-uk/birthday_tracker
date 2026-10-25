# Birthday Card App

A hobby mobile app (Expo / React Native) that reminds you of friends' birthdays and lets you design a personalised card with AI-generated artwork, preview it, and go through a mocked checkout.

Built in a week for a blog post. See [CLAUDE.md](CLAUDE.md) for requirements, decisions and the development plan, and [docs/build-log.md](docs/build-log.md) for running notes.

## What it does

- **Friends and reminders:** save birthdays (and optionally an address). The app schedules one local notification per friend at 09:00 on the reminder day. No server and no account are involved; everything is stored on the phone.
- **Card design:** describe a picture, pick a style, and choose from AI-generated designs. Add front text and an inside message.
- **Preview:** a card that opens like a real one (tap or swipe).
- **Checkout (demo only):** pick an address, see the estimated delivery, "pay" £3.99 in demo mode, and see the confirmation email on screen. Nothing is charged, printed or sent.

## Repository layout

- `mobile/`: Expo app (TypeScript, Expo Router, SQLite)
- `backend/`: Vercel project exposing `POST /api/generate` (moderation, daily limit, image providers)
- `docs/`: ERD, build log, image provider research, [manual test checklist](docs/manual-test-checklist.md)

`mobile/` and `backend/` are separate npm projects; run commands inside each folder.

## Requirements

- Node.js 24 (LTS) and npm
- The **Expo Go** app on your phone (it must support the project's Expo SDK, currently 58)
- Phone and computer on the same Wi-Fi network

## Run the app with the free mock backend

The mock backend returns placeholder images instantly and never calls an image provider, so it costs nothing.

1. **Start the mock backend:**

   ```sh
   cd backend
   npm install
   npm run dev:mock
   ```

   It prints the address to use, e.g. `http://192.168.0.83:3001`.

2. **Point the app at it.** Create `mobile/.env` (it is git-ignored) with that address:

   ```sh
   EXPO_PUBLIC_API_URL=http://192.168.0.83:3001
   ```

   Don't put a comment on the same line as a value; `.env` files don't support that.

3. **Start the app:**

   ```sh
   cd mobile
   npm install
   npx expo start --clear
   ```

   Scan the QR code with the phone's camera (iPhone) or with Expo Go (Android).

`npm run dev:mock` can also fake problems, to test the loading and error screens: `MOCK_DELAY_MS=65000` (slower than the app's 60 s timeout) or `MOCK_STATUS=422|429|502`.

## Real image generation

The deployed backend uses Cloudflare Workers AI (free daily allowance) with an optional Pollinations fallback, a keyword blocklist and a global daily limit stored in Upstash Redis. Provider research is in [docs/image-providers.md](docs/image-providers.md) and every environment variable is documented in [backend/.env.example](backend/.env.example).

To use it from the app, set `EXPO_PUBLIC_API_URL` in `mobile/.env` to the deployed URL. Add `EXPO_PUBLIC_DESIGNS_PER_ROUND=1` while testing, so each round uses a third of the credits.

### Deploying your own backend

1. Create a Vercel project with its **Root Directory** set to `backend`, and link it from the repo root (`npx vercel link`).
2. In the Vercel dashboard, under **Storage**, add **Upstash for Redis** (free plan) and connect it to Production.
3. Set the production environment variables: `IMAGE_PROVIDERS=cloudflare`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` and `DAILY_GENERATION_LIMIT=20`.
4. Deploy from the **repo root**: `npx vercel --prod`.

Without Upstash, real providers refuse to run (the backend fails closed), so a misconfigured deploy can't run up a bill.

## Tests and checks

```sh
cd mobile && npm test && npm run lint && npm run typecheck
cd backend && npm test && npm run lint && npm run typecheck
```

Tests never call a real image provider; `fetch` is stubbed. Things that only a real phone can check (notifications after a force-quit, time zones, restarts) are covered by the [manual test checklist](docs/manual-test-checklist.md).
