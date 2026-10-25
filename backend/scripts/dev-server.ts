// Local mock backend for app development (Milestone 3), no Vercel login needed.
// Serves the same handleGenerate as api/generate.ts, always in mock mode, so it can never spend
// provider credits. Listens on all interfaces so a phone on the same Wi-Fi can reach it.
//
// Run from backend/:  npm run dev:mock   (or: MOCK_DELAY_MS=65000 npm run dev:mock)
// Optional env: PORT (default 3001; `vercel dev` uses 3000), MOCK_DELAY_MS (simulate a slow provider, e.g. 5000 or 65000
// to trigger the app's 60 s timeout), MOCK_STATUS (force an error response: 422, 429 or 502).
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { errorResponse, type ErrorCode } from '../lib/errors.js';
import { handleGenerate } from '../lib/handleGenerate.js';

process.env.IMAGE_PROVIDERS = 'mock';

const PORT = Number(process.env.PORT ?? 3001);
const DELAY_MS = Number(process.env.MOCK_DELAY_MS ?? 0);
const FORCED_STATUS = Number(process.env.MOCK_STATUS ?? 0);

const FORCED_ERRORS: Record<number, [ErrorCode, string] | undefined> = {
  422: ['prompt_rejected', 'That description cannot be used. Please try something different.'],
  429: ['daily_limit_reached', 'The daily design limit has been reached.'],
  502: ['provider_error', 'The image service failed.'],
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const server = createServer(async (req, res) => {
  const started = Date.now();
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    let response: Response;
    if (url.pathname !== '/api/generate') {
      response = errorResponse(404, 'invalid_request', 'Only /api/generate exists.');
    } else {
      if (DELAY_MS > 0) await sleep(DELAY_MS);
      const forced = FORCED_ERRORS[FORCED_STATUS];
      response = forced
        ? errorResponse(FORCED_STATUS, forced[0], forced[1])
        : await handleGenerate(
            new Request(url, {
              method: req.method,
              headers: req.headers as Record<string, string>,
              body:
                req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
            }),
          );
    }

    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
    console.log(`${req.method} ${url.pathname} → ${response.status} (${Date.now() - started} ms)`);
  } catch (error) {
    console.error('dev server error', error);
    res.writeHead(500).end();
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const lanAddresses = Object.values(networkInterfaces())
    .flat()
    .filter((info) => info && info.family === 'IPv4' && !info.internal)
    .map((info) => `http://${info!.address}:${PORT}`);
  console.log(`Mock backend listening on port ${PORT} (IMAGE_PROVIDERS=mock).`);
  console.log(`Set EXPO_PUBLIC_API_URL in mobile/.env to one of: ${lanAddresses.join(', ')}`);
});
