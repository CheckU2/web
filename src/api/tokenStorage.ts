import type { AuthTokens } from "../types/api";

const ACCESS_TOKEN_KEY = "checku_access_token";
const REFRESH_TOKEN_KEY = "checku_refresh_token";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(tokens: Pick<AuthTokens, "access_token" | "refresh_token">): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  window.dispatchEvent(new CustomEvent("checku:auth-changed", { detail: { token: tokens.access_token } }));
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.dispatchEvent(new CustomEvent("checku:auth-changed", { detail: { token: null } }));
}
