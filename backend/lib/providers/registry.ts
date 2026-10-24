// The one place that knows which providers exist. To add a provider:
//   1. write lib/providers/<name>.ts exporting a ProviderFactory (see parallel.ts for the usual shape),
//   2. add its name to ProviderName in types.ts and its factory below,
//   3. document its env vars in .env.example and run the shared contract tests against it.
// Switching providers is then config only: IMAGE_PROVIDERS=cloudflare,pollinations
import { mockProvider } from './mock.js';
import type { ProviderFactory, ProviderName } from './types.js';

export const PROVIDER_NAMES: readonly ProviderName[] = ['mock', 'cloudflare', 'pollinations'];

// `undefined` = known name, not implemented yet (Cloudflare and Pollinations arrive in Milestone 4).
export const PROVIDER_FACTORIES: Readonly<Record<ProviderName, ProviderFactory | undefined>> = {
  mock: () => mockProvider,
  cloudflare: undefined,
  pollinations: undefined,
};
