import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "./tokenStorage";

const configuredUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export const API_URL = configuredUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function messageFromResponse(data: unknown, status: number): string {
  if (typeof data === "object" && data !== null) {
    const record = data as Record<string, unknown>;
    const detail = record.detail;
    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail !== null) {
      const detailRecord = detail as Record<string, unknown>;
      if (typeof detailRecord.message === "string") return detailRecord.message;
    }
    if (typeof record.message === "string") return record.message;
  }

  if (status === 401) return "Tu sesión expiró. Inicia sesión nuevamente.";
  if (status === 403) return "No tienes permisos para realizar esta acción.";
  if (status === 404) return "No se encontró el recurso solicitado.";
  if (status >= 500) return "El servidor tuvo un problema. Inténtalo más tarde.";
  return `La solicitud falló (HTTP ${status}).`;
}

async function parseResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = (await parseResponse(response)) as {
          data?: { access_token?: string; refresh_token?: string };
        };

        if (!response.ok || !data?.data?.access_token || !data.data.refresh_token) {
          clearTokens();
          return null;
        }

        saveTokens({
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
        });
        return data.data.access_token;
      } catch {
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }

  return refreshInFlight;
}

export interface RequestOptions extends RequestInit {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, retryOnUnauthorized = true, ...requestOptions } = options;
  const headers = new Headers(requestOptions.headers);
  headers.set("Accept", "application/json");

  if (requestOptions.body && !(requestOptions.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = auth ? getAccessToken() : null;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else headers.delete("Authorization");

  let response = await fetch(`${API_URL}${path}`, { ...requestOptions, headers });

  if (response.status === 401 && auth && retryOnUnauthorized && getRefreshToken()) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      const retryHeaders = new Headers(requestOptions.headers);
      retryHeaders.set("Accept", "application/json");
      if (requestOptions.body && !(requestOptions.body instanceof FormData) && !retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
      response = await fetch(`${API_URL}${path}`, { ...requestOptions, headers: retryHeaders });
    }
  }

  const data = await parseResponse(response);
  if (!response.ok) throw new ApiError(messageFromResponse(data, response.status), response.status, data);
  return data as T;
}
