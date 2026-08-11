/**
 * OWNER: UI
 * WHAT: The ONLY way this division reaches the server. Typed fetch + error normalisation.
 * RULE: no direct fetch() calls in components.
 */

export async function apiGet<T>(_path: string): Promise<T> {
  throw new Error("NOT_IMPLEMENTED: apiGet");
}

export async function apiPost<T>(_path: string, _body?: unknown): Promise<T> {
  throw new Error("NOT_IMPLEMENTED: apiPost");
}

