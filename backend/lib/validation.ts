// Request validation for POST /api/generate (CLAUDE.md §10, FR-4.2, FR-4.4).

export const MAX_PROMPT_LENGTH = 300;
export const MAX_IMAGE_COUNT = 3;
export const DEFAULT_IMAGE_COUNT = 3;

// Keep in sync with the style chips in the mobile app (FR-4.2).
// Only known styles are accepted so arbitrary text cannot reach the prompt template via `style`.
export const STYLES = ['watercolour', 'cartoon', 'minimalist', 'vintage', 'playful'] as const;
export type Style = (typeof STYLES)[number];

export interface GenerateRequest {
  prompt: string;
  style?: Style;
  count: number;
}

export type ValidationResult =
  { ok: true; value: GenerateRequest } | { ok: false; message: string };

function isStyle(value: string): value is Style {
  return (STYLES as readonly string[]).includes(value);
}

export function validateGenerateRequest(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }
  const { prompt, style, count } = body as Record<string, unknown>;

  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    return { ok: false, message: 'A prompt is required.' };
  }
  const trimmedPrompt = prompt.trim();
  if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, message: `Prompt must be at most ${MAX_PROMPT_LENGTH} characters.` };
  }

  let validStyle: Style | undefined;
  if (style !== undefined && style !== null && style !== '') {
    if (typeof style !== 'string' || !isStyle(style)) {
      return { ok: false, message: `Style must be one of: ${STYLES.join(', ')}.` };
    }
    validStyle = style;
  }

  let validCount = DEFAULT_IMAGE_COUNT;
  if (count !== undefined) {
    if (
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_IMAGE_COUNT
    ) {
      return { ok: false, message: `Count must be a whole number from 1 to ${MAX_IMAGE_COUNT}.` };
    }
    validCount = count;
  }

  return { ok: true, value: { prompt: trimmedPrompt, style: validStyle, count: validCount } };
}
