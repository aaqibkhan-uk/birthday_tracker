// TEMPORARY (Milestone 0 spike): one real Pollinations round (3 images in parallel) to note
// quality, speed, cost, watermark and limits before building the provider in Milestone 4.
//
// Run from backend/:  node --env-file-if-exists=.env scripts/spike-pollinations.ts ["optional prompt"]
// Needs POLLINATIONS_API_KEY (an sk_ secret key from https://enter.pollinations.ai/keys) in backend/.env.
// Images are written to backend/spike-output/ (git-ignored).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = 'https://gen.pollinations.ai';
// Default model; not paid_only, so free (Quest) Pollen can pay for it. Override with POLLINATIONS_MODEL.
const MODEL = process.env.POLLINATIONS_MODEL ?? 'tongyi-mai/z-image-turbo';
const WIDTH = 768; // 5:7 portrait, multiples of 16
const HEIGHT = 1072;
const TIMEOUT_MS = 60_000; // matches the app's FR-4.4 timeout

const key = process.env.POLLINATIONS_API_KEY;
if (!key) {
  console.error('POLLINATIONS_API_KEY is not set. Add it to backend/.env (see .env.example).');
  process.exit(1);
}

const subject = process.argv[2] ?? 'a fox reading a book under a tree';
const style = 'watercolour';
// Prompt template from CLAUDE.md §10.
const prompt =
  `Greeting card front illustration, portrait orientation. Subject: ${subject}. Style: ${style}. ` +
  'No text, letters or words anywhere in the image. Calm, uncluttered space in the upper third. ' +
  'Suitable for all ages.';

const authHeaders = { Authorization: `Bearer ${key}` };

async function balance(): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/account/balance`, { headers: authHeaders });
    return response.ok
      ? JSON.stringify(await response.json())
      : `unavailable (HTTP ${response.status})`;
  } catch (error) {
    return `unavailable (${(error as Error).message})`;
  }
}

async function generate(index: number) {
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const url = new URL(`${BASE_URL}/image/${encodeURIComponent(prompt)}`);
  url.searchParams.set('model', MODEL);
  url.searchParams.set('width', String(WIDTH));
  url.searchParams.set('height', String(HEIGHT));
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('safe', 'true');

  const started = performance.now();
  const response = await fetch(url, {
    headers: authHeaders,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const contentType = response.headers.get('content-type') ?? '?';

  if (!response.ok) {
    return {
      index,
      ok: false,
      seconds,
      status: response.status,
      detail: (await response.text()).slice(0, 300),
    };
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  const extension = contentType.includes('png')
    ? 'png'
    : contentType.includes('svg')
      ? 'svg'
      : 'jpg';
  const file = join('spike-output', `pollinations-${index + 1}.${extension}`);
  writeFileSync(file, bytes);

  // Headers worth noting for limits/cost; skip cookies.
  const headers = Object.fromEntries(
    [...response.headers].filter(([name]) => name !== 'set-cookie'),
  );
  return {
    index,
    ok: true,
    seconds,
    status: response.status,
    contentType,
    kb: Math.round(bytes.length / 1024),
    file,
    headers,
  };
}

mkdirSync('spike-output', { recursive: true });
console.log(`Model: ${MODEL}  Size: ${WIDTH}x${HEIGHT}`);
console.log(`Balance before: ${await balance()}`);

const started = performance.now();
const results = await Promise.allSettled([0, 1, 2].map(generate));
const total = ((performance.now() - started) / 1000).toFixed(1);

for (const result of results) {
  if (result.status === 'rejected') {
    console.log('Request failed:', (result.reason as Error).message);
    continue;
  }
  const { index, ok, seconds, status } = result.value;
  if (ok) {
    const { contentType, kb, file } = result.value;
    console.log(
      `Image ${index + 1}: HTTP ${status}, ${seconds}s, ${contentType}, ${kb} KB → ${file}`,
    );
  } else {
    console.log(`Image ${index + 1}: HTTP ${status}, ${seconds}s, ${result.value.detail}`);
  }
}
const first = results.find((r) => r.status === 'fulfilled' && r.value.ok);
if (first && first.status === 'fulfilled') {
  console.log('Response headers (image 1):', first.value.headers);
}
console.log(`Total wall time for the round: ${total}s`);
console.log(`Balance after: ${await balance()}`);
