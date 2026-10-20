// Error responses follow the API contract in CLAUDE.md §10: { "error": { "code", "message" } }.
export type ErrorCode =
  | 'invalid_request'
  | 'method_not_allowed'
  | 'prompt_rejected'
  | 'daily_limit_reached'
  | 'provider_error'
  | 'internal_error';

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  headers?: Record<string, string>,
): Response {
  return Response.json({ error: { code, message } }, { status, headers });
}
