import { apiRequest } from "./http";
import type { ApiEnvelope, AuthUser, LoginResponse, RegisterPayload } from "../types/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export function login(payload: LoginPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
    retryOnUnauthorized: false,
  });
}

export function register(payload: RegisterPayload): Promise<ApiEnvelope<AuthUser>> {
  return apiRequest<ApiEnvelope<AuthUser>>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    auth: false,
    retryOnUnauthorized: false,
  });
}

export function getCurrentUser(): Promise<ApiEnvelope<AuthUser>> {
  return apiRequest<ApiEnvelope<AuthUser>>("/api/v1/auth/me");
}

export function logout(refreshToken: string | null): Promise<ApiEnvelope<{ message: string }>> {
  return apiRequest<ApiEnvelope<{ message: string }>>("/api/v1/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
}

export function requestPasswordReset(email: string): Promise<ApiEnvelope<{ message: string }>> {
  return apiRequest<ApiEnvelope<{ message: string }>>("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    auth: false,
    retryOnUnauthorized: false,
  });
}

export function resetPassword(token: string, newPassword: string): Promise<ApiEnvelope<{ message: string }>> {
  return apiRequest<ApiEnvelope<{ message: string }>>("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
    auth: false,
    retryOnUnauthorized: false,
  });
}
