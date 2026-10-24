// TEMPORARY (Milestone 0 spike): one real Cloudflare Workers AI round (3 images in parallel) to note
// quality, speed and size before building the provider in Milestone 4. Uses the free daily
// allocation (10,000 Neurons/day, resets 00:00 UTC); expect roughly 100-500 Neurons per round.
//
// Run from backend/:  node --env-file-if-exists=.env scripts/spike-cloudflare.ts ["optional prompt"]
// Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Workers AI permission) in backend/.env.
// Optional CLOUDFLARE_IMAGE_MODEL: @cf/black-forest-labs/flux-2-klein-4b (default, portrait sizes)
// or @cf/black-forest-labs/flux-1-schnell (cheaper, 1024x1024 square only).
// Images are written to backend/spike-output/ (git-ignored).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MODEL = process.env.CLOUDFLARE_IMAGE_MODEL ?? '@cf/black-forest-labs/flux-2-klein-4b';
const WIDTH = 768; // 5:7 portrait
const HEIGHT = 1072;
const TIMEOUT_MS = 60_000;

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN must be set in backend/.env.');
  process.exit(1);
}

const subject = process.argv[2] ?? 'a fox reading a book under a tree';
const style = 'watercolour';
// Prompt template from CLAUDE.md §10.
const prompt =
  `Greeting card front illustration, portrait orientation. Subject: ${subject}. Style: ${style}. ` +
  'No text, letters or words anywhere in the image. Calm, uncluttered space in the upper third. ' +
  'Suitable for all ages.';

const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;
const isFlux2 = MODEL.includes('flux-2');

function requestBody(seed: number): { body: FormData | string; headers: Record<string, string> } {
  if (isFlux2) {
    // FLUX.2 models take multipart form data, even for a prompt-only request.
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', String(WIDTH));
    form.append('height', String(HEIGHT));
    form.append('seed', String(seed));
    return { body: form, headers: {} };
  }
  // flux-1-schnell: JSON, no size options (square output).
  return {
    body: JSON.stringify({ prompt, steps: 4, seed }),
    headers: { 'Content-Type': 'application/json' },
  };
}

async function generate(index: number) {
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const { body, headers } = requestBody(seed);
  const started = performance.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const text = await response.text();
  if (!response.ok) {
    return {
      index,
      ok: false as const,
      seconds,
      status: response.status,
      detail: text.slice(0, 300),
    };
  }
  const json = JSON.parse(text) as { result?: { image?: string } };
  const image = json.result?.image;
  if (!image) {
    return {
      index,
      ok: false as const,
      seconds,
      status: response.status,
      detail: text.slice(0, 300),
    };
  }
  const bytes = Buffer.from(image, 'base64');
  const isPng = bytes[0] === 0x89;
  const file = join('spike-output', `cloudflare-${index + 1}.${isPng ? 'png' : 'jpg'}`);
  writeFileSync(file, bytes);
  return {
    index,
    ok: true as const,
    seconds,
    status: response.status,
    kb: Math.round(bytes.length / 1024),
    file,
  };
}

mkdirSync('spike-output', { recursive: true });
console.log(
  `Model: ${MODEL}  Requested size: ${isFlux2 ? `${WIDTH}x${HEIGHT}` : '1024x1024 (fixed)'}`,
);

const started = performance.now();
const results = await Promise.allSettled([0, 1, 2].map(generate));
const total = ((performance.now() - started) / 1000).toFixed(1);

for (const result of results) {
  if (result.status === 'rejected') {
    console.log('Request failed:', (result.reason as Error).message);
  } else if (result.value.ok) {
    const { index, seconds, status, kb, file } = result.value;
    console.log(`Image ${index + 1}: HTTP ${status}, ${seconds}s, ${kb} KB → ${file}`);
  } else {
    const { index, seconds, status, detail } = result.value;
    console.log(`Image ${index + 1}: HTTP ${status}, ${seconds}s, ${detail}`);
  }
}
console.log(`Total wall time for the round: ${total}s`);
console.log('Neuron usage: Cloudflare dashboard → AI → Workers AI (updates within a few minutes).');
