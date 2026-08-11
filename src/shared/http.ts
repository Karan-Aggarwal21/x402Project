// OWNER: CORE. The single enforcement point for the API response envelope (CLAUDE.md section 1).
// Never construct a Response by hand anywhere else.
import { ERROR_CODES, type ErrorCode } from "@/shared/errors";

export interface ApiSuccess<T> {
  status: true;
  statusCode: number;
  message?: string;
  data: T;
}

export interface ApiError {
  status: false;
  statusCode: number;
  message: string;
  error: { code: string; details?: Record<string, unknown> };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export function ok<T>(data: T, statusCode = 200, message?: string): Response {
  const body: ApiSuccess<T> = { status: true, statusCode, data };
  if (message) body.message = message;
  return Response.json(body, { status: statusCode });
}

export function fail(code: ErrorCode, details?: Record<string, unknown>, message?: string): Response {
  const spec = ERROR_CODES[code];
  const body: ApiError = {
    status: false,
    statusCode: spec.http,
    message: message ?? spec.message,
    error: details ? { code, details } : { code },
  };
  return Response.json(body, { status: spec.http });
}

// Every stub returns this until its owner implements the endpoint.
export function notImplemented(what: string): Response {
  return fail("NOT_IMPLEMENTED", { endpoint: what });
}
