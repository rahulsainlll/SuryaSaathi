import type { CaseFilters, ConsoleData } from "./types.js";

export interface ApiAdapterOptions {
  /** The HTTP API's base URL (Console stack output NEXTPUBLICCONSOLEAPIURL). */
  baseUrl: string;
  /** A Cognito access or ID token for a user in the admin group. */
  getToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The console's data from services/console-api behind API Gateway and Cognito. */
export function createApiAdapter(options: ApiAdapterOptions): ConsoleData {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const base = options.baseUrl.replace(/\/+$/, "");

  async function get<T>(
    path: string,
    params: Record<string, string | undefined> = {},
  ): Promise<T | null> {
    const query = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
    ).toString();
    const token = await options.getToken();
    const response = await doFetch(`${base}${path}${query ? `?${query}` : ""}`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new ApiError(response.status, `${path}: HTTP ${response.status}`);
    return (await response.json()) as T;
  }
  const must = async <T>(value: Promise<T | null>, path: string): Promise<T> => {
    const v = await value;
    if (v === null) throw new ApiError(404, `${path}: not found`);
    return v;
  };
  const enc = encodeURIComponent;

  return {
    kind: "api",
    overview: () => must(get("/overview"), "/overview"),
    vendors: () => must(get("/vendors"), "/vendors"),
    vendor: (id) => get(`/vendors/${enc(id)}`),
    cases: (f: CaseFilters = {}) =>
      must(
        get("/cases", { status: f.status, cause: f.cause, vendorId: f.vendorId, zone: f.zone }),
        "/cases",
      ),
    case: (id) => get(`/cases/${enc(id)}`),
    systems: (q) => must(get("/systems", { q }), "/systems"),
    system: (id) => get(`/systems/${enc(id)}`),
    breakdown: () => must(get("/breakdown"), "/breakdown"),
    search: () => must(get("/search"), "/search"),
  };
}
