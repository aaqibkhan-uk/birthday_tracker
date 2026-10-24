# Image provider research (October 2026)

Goal: generate 3 portrait (≈5:7) greeting-card illustrations per round from a server-side API, at **£0**, with a key that lives only on the Vercel backend. Free tiers change often; re-check before Milestone 4 and whenever a provider misbehaves.

## Recommendation

| Role | Provider | Model | Why |
|---|---|---|---|
| Primary | **Cloudflare Workers AI** | `@cf/black-forest-labs/flux-2-klein-4b` | Only free allowance found that **renews daily** (10,000 Neurons/day, resets 00:00 UTC, no card). Native portrait sizes (256–1920 px). Fast distilled FLUX.2 model (fixed 4 steps). 720 requests/min. |
| Fallback | **Pollinations** | `tongyi-mai/z-image-turbo` | Cheap (0.004 Pollen/image) and payable with free Quest Pollen, but that Pollen is a **one-off grant**, so it suits a fallback, not a primary. |
| Development | **mock** | n/a | Instant gradient placeholders, zero cost, offline. |

Switching is configuration only: `IMAGE_PROVIDERS=cloudflare,pollinations` (see `backend/.env.example`). Cheaper Cloudflare alternative: `CLOUDFLARE_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell` (square 1024×1024 only, so the app would crop to 5:7).

### Rough free capacity (estimates, confirm with the spike)

- **Cloudflare flux-2-klein-4b:** about 26 Neurons per 512×512 output tile, so a 768×1072 image costs roughly 80–160 Neurons. That is 250–470 per round, or **about 20–40 rounds/day**.
- **Cloudflare flux-1-schnell:** about 4.8 Neurons per tile plus 9.6 per step, roughly 58 Neurons per 1024² image, or **about 55 rounds/day**.
- **Pollinations:** 0.012 Pollen per round. The 0.25 Pollen grant for creating a key covers **about 20 rounds in total**, and connecting their CLI adds 1 Pollen (about 80 more).

Hence `DAILY_GENERATION_LIMIT=20` as the backend's global cap.

## Rejected (for this project)

| Provider | Reason |
|---|---|
| Google Gemini API (Nano Banana, Imagen) | No free tier for image models; paid from about $0.034/image. |
| Vercel AI Gateway | $5/month credit, but the free tier is limited to a small model subset with no image models. |
| Hugging Face Inference Providers | Free accounts get no monthly credits (PRO gets $2). |
| AI Horde | Free and volunteer-run, but a long queue (≈410 requests for 13 image workers when checked), lowest priority for anonymous users, prompts visible to volunteer workers, and many NSFW-oriented models. Would regularly miss the 60 s timeout. |
| fal.ai, Replicate, Together AI | One-off signup credits at best (amounts unclear); Together's free FLUX endpoint was a 2024 promotion. |
| Leonardo (direct) | Free plan is app-only; the API is paid. (Leonardo models on Cloudflare cost about 2,000+ Neurons/image, far too expensive for the free allocation.) |

## Notes for implementation (Milestone 4)

- **Cloudflare REST:** `POST https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/run/{MODEL}` with `Authorization: Bearer {TOKEN}`.
  - FLUX.2 models require **multipart form data** (`prompt`, `width`, `height`, `seed`).
  - flux-1-schnell takes JSON (`prompt`, `steps` ≤ 8) and has no size option.
  - The response is `{ result: { image: <base64> }, success, errors }`.
  - When the daily allocation runs out, requests fail with an error, so fall back to the next provider.
- **Pollinations:** `GET https://gen.pollinations.ai/image/{prompt}?model=&width=&height=&seed=&safe=true` with `Authorization: Bearer sk_...`. The response is raw image bytes. Anonymous requests return 401.
- **Watermarks:** none documented on either; verify in the spike output.
- **Licensing:** Black Forest Labs' terms apply to FLUX output on Cloudflare; fine for a non-commercial blog demo, but check before any commercial use.

## Sources

- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/), [limits](https://developers.cloudflare.com/workers-ai/platform/limits/), [flux-1-schnell](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/), [FLUX.2 klein 4B launch](https://developers.cloudflare.com/changelog/2026-01-15-flux-2-klein-4b-workers-ai/)
- [Pollinations API docs](https://github.com/pollinations/pollinations/blob/main/APIDOCS.md), [live image model list](https://gen.pollinations.ai/image/models), [quest catalog](https://gen.pollinations.ai/quests/catalog), [free refill ended](https://agentdeals.dev/vendor/pollinations-ai)
- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Vercel AI Gateway pricing](https://vercel.com/docs/ai-gateway/pricing), [rate limits / free tier](https://vercel.com/docs/ai-gateway/rate-limits)
- [Hugging Face Inference Providers pricing](https://huggingface.co/docs/inference-providers/pricing)
- [AI Horde live status](https://aihorde.net/api/v2/status/performance)
- [Together AI FLUX free promotion (2024)](https://together.ai/blog/flux-api-is-now-available-on-together-ai-new-pro-free-access-to-flux-schnell)
