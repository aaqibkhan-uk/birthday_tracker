// Vercel Function: POST /api/generate. Logic lives in lib/handleGenerate.ts.
import { handleGenerate } from '../lib/handleGenerate.js';

export default {
  fetch(request: Request): Promise<Response> {
    return handleGenerate(request);
  },
};
