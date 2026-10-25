# Manual test checklist (real iPhone)

The nine checks from CLAUDE.md §11, written as steps. Unless a step says otherwise, use the free mock backend (`npm run dev:mock` in `backend/`, with `mobile/.env` pointing at port 3001).

The **Scheduled reminders (dev)** link at the bottom of the Upcoming tab lists what iOS has scheduled and can send a test notification in 10 seconds.

## 1. A notification arrives with the app force-quit

- [ ] Open **Scheduled reminders (dev)** and tap **Test tap: (name) in 10 s**.
- [ ] Within 10 seconds, swipe up from the bottom and swipe the app away (force-quit), then lock the phone. If you miss the window, try again; it's quick.
- [ ] The notification arrives. Tapping it opens the app on that friend's screen.

## 2. A friend added after their reminder date gets a prompt, not a notification

- [ ] Add a friend whose birthday is in 3 days, with the reminder set to **1 week before** (so the reminder date has passed).
- [ ] Their screen immediately shows the "birthday is in 3 days" prompt with **Create card**. Because a card ordered now would arrive after the birthday, the late-delivery warning shows too.
- [ ] In **Scheduled reminders (dev)**, their reminder is for **next year**.

## 3. A 29 February birthday in a non-leap year

- [ ] Add a friend born on 29 February (no year).
- [ ] Their screen shows the next birthday as **Sunday 28 February** (that's 2027, which is not a leap year). The list still shows the birthday as entered, "29 February".

## 4. Changing the reminder offset replaces the old notification

- [ ] Note a friend's reminder date in **Scheduled reminders (dev)**.
- [ ] Edit the friend and change **Remind me** (e.g. 1 week → 2 weeks before), then save.
- [ ] The dev screen shows exactly one reminder for them, on the new date at 09:00.

## 5. Time zone change, then reopen

- [ ] iPhone **Settings → General → Date & Time**: turn off **Set Automatically** and pick a different time zone (e.g. New York).
- [ ] Reopen the app, then open **Scheduled reminders (dev)**: the reminders are at **09:00 local time** in the new zone.
- [ ] Turn **Set Automatically** back on afterwards.

## 6. Reminders survive a phone restart

- [ ] Note a few pending reminders in **Scheduled reminders (dev)**.
- [ ] Restart the iPhone without opening the app first.
- [ ] Open the app: the same reminders are still listed. (They are OS notifications, so iOS keeps them across restarts.)

## 7. Full card flow, then delete the friend

- [ ] Open a friend, tap **Create card**, describe a picture, create designs, pick one, and add front text and an inside message.
- [ ] Tap **Preview card**: the card opens by tap and by swipe. Approve it, choose an address, and **Pay (demo)**.
- [ ] The confirmation shows, with no back arrow. **See the confirmation email** works. **Done** goes to the Orders tab, where the order is listed.
- [ ] Delete that friend. The order is still in the Orders tab and opens with its picture, message and address.

## 8. A rejected description doesn't use up a round

- [ ] Note the "rounds left" count, then describe the picture as `Batman birthday cake` and create designs. With the mock server, start it with `MOCK_STATUS=422 npm run dev:mock` instead; the real backend blocks this prompt for free.
- [ ] A friendly "can't be used" message appears, with "This didn't use up one of your rounds".
- [ ] The rounds-left count hasn't changed.

## 9. Mock and real backend both work

- [ ] **Mock:** designs are coloured gradients and arrive almost instantly.
- [ ] **Real (uses Cloudflare credits, so do it once):** set `mobile/.env` to `EXPO_PUBLIC_API_URL=https://birthday-tracker-backend.vercel.app` plus `EXPO_PUBLIC_DESIGNS_PER_ROUND=1`, restart with `npx expo start --clear`, and create one design. A real painting arrives within about 30 seconds.
- [ ] Switch `mobile/.env` back to the mock afterwards.
