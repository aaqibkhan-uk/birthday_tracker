// App-wide constants (CLAUDE.md §10). Domain rules with their own constants live in src/domain/.

/** The Upcoming tab shows birthdays within this many days (0 = today). */
export const UPCOMING_WINDOW_DAYS = 30;

/** Backend base URL, from mobile/.env (see .env.example). Empty if not configured. */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

/** FR-4.6: generation rounds per card. One round = one request returning 3 images. */
export const GENERATION_ROUNDS_PER_CARD = 3;
/**
 * FR-4.4: designs requested per round. EXPO_PUBLIC_DESIGNS_PER_ROUND (1-3) can lower it while
 * testing against the real backend, to spend fewer provider credits.
 */
export const DESIGNS_PER_ROUND = parseDesignsPerRound(process.env.EXPO_PUBLIC_DESIGNS_PER_ROUND);

function parseDesignsPerRound(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 3 ? value : 3;
}
/** FR-4.4: the app gives up on a generation request after this long. */
export const GENERATION_TIMEOUT_MS = 60_000;

/** FR-4.2, FR-4.3, FR-4.8 character limits. */
export const ART_PROMPT_MAX_LENGTH = 300;
export const FRONT_TEXT_MAX_LENGTH = 40;
export const INSIDE_MESSAGE_MAX_LENGTH = 500;
