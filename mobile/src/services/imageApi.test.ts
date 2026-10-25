import { generateImages, isRetryable } from './imageApi';

const png = { base64: 'iVBORw0KGgo=', mimeType: 'image/png' };
const options = (fetchImpl: typeof fetch, timeoutMs = 1000) => ({
  apiUrl: 'http://api.test',
  timeoutMs,
  count: 3,
  fetchImpl,
});

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('generateImages', () => {
  it('posts the trimmed prompt, style and count, and returns the images', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, { images: [png, png, png] }));
    const result = await generateImages('  a fox  ', 'watercolour', options(fetchImpl));

    expect(result).toEqual({ ok: true, images: [png, png, png] });
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://api.test/api/generate',
      expect.objectContaining({ method: 'POST' }),
    );
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      prompt: 'a fox',
      style: 'watercolour',
      count: 3,
    });
  });

  it('omits the style when none is chosen', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, { images: [png, png, png] }));
    await generateImages('a fox', null, options(fetchImpl));
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ prompt: 'a fox', count: 3 });
  });

  it.each([
    [422, 'rejected'],
    [429, 'daily_limit'],
    [400, 'invalid_request'],
    [502, 'provider'],
    [500, 'unexpected'],
  ])('maps HTTP %i to %s', async (status, failure) => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse(status, { error: { code: 'x', message: 'y' } }),
    );
    expect(await generateImages('a fox', null, options(fetchImpl))).toMatchObject({
      ok: false,
      failure,
    });
  });

  it('treats a malformed success body as unexpected', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, { images: [png] }));
    expect(await generateImages('a fox', null, options(fetchImpl))).toMatchObject({
      failure: 'unexpected',
    });
  });

  it('reports a network failure', async () => {
    const fetchImpl = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await generateImages('a fox', null, options(fetchImpl))).toMatchObject({
      failure: 'network',
    });
  });

  it('times out and aborts the request', async () => {
    let signal: AbortSignal | undefined;
    const fetchImpl = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal ?? undefined;
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    ) as unknown as typeof fetch;
    const result = await generateImages('a fox', null, options(fetchImpl, 20));
    expect(result).toMatchObject({ ok: false, failure: 'timeout' });
    expect(signal?.aborted).toBe(true);
  });

  it('fails fast when no API URL is configured', async () => {
    const fetchImpl = jest.fn();
    const result = await generateImages('a fox', null, { ...options(fetchImpl), apiUrl: '' });
    expect(result).toMatchObject({ failure: 'not_configured' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('isRetryable', () => {
  it('allows retry for transient failures only', () => {
    expect(isRetryable('timeout')).toBe(true);
    expect(isRetryable('provider')).toBe(true);
    expect(isRetryable('rejected')).toBe(false);
    expect(isRetryable('daily_limit')).toBe(false);
  });
});
