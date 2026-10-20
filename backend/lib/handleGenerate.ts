// POST /api/generate (CLAUDE.md §10). Kept separate from api/ so it can be tested without Vercel.
// Moderation, prompt template and the daily limit are added in Milestone 4.
import { errorResponse } from './errors.js';
import { getProviderChain, type ImageProvider } from './providers/index.js';
import { validateGenerateRequest } from './validation.js';

// Generous for a 300-character prompt; rejects oversized bodies before parsing.
const MAX_BODY_BYTES = 10_000;

export async function handleGenerate(
  request: Request,
  getProviders: () => ImageProvider[] = getProviderChain,
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse(405, 'method_not_allowed', 'Use POST.', { Allow: 'POST' });
  }

  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    return errorResponse(400, 'invalid_request', 'Request body is too large.');
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return errorResponse(400, 'invalid_request', 'Request body must be valid JSON.');
  }

  const validation = validateGenerateRequest(body);
  if (!validation.ok) {
    return errorResponse(400, 'invalid_request', validation.message);
  }

  let providers: ImageProvider[];
  try {
    providers = getProviders();
  } catch (error) {
    console.error('Provider configuration error:', (error as Error).message);
    return errorResponse(500, 'internal_error', 'Image generation is not configured.');
  }

  for (const provider of providers) {
    try {
      const images = await provider.generate(validation.value);
      return Response.json({ images, provider: provider.name });
    } catch (error) {
      // Never log the prompt (CLAUDE.md §10): provider name and error message only.
      console.error(`Provider "${provider.name}" failed:`, (error as Error).message);
    }
  }

  return errorResponse(502, 'provider_error', 'Image generation failed. Please try again.');
}
