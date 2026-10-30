export type UserRole =
  | "student"
  | "teacher"
  | "tutor"
  | "career_admin"
  | "admin"
  | "super_admin"
  | string;

export interface AuthUser {
  id?: string;
  _id?: string;
  full_name?: string;
  email: string;
  role: UserRole;
  is_active?: boolean;
  career_id?: string;
  avatar?: string | null;
  bio?: string;
  banner_color?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse extends ApiEnvelope<AuthTokens & { user: AuthUser }> {}
export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface UserRecord extends Record<string, unknown> {
  id?: string;
  _id?: string;
  full_name?: string;
  email?: string;
  role?: string;
  is_active?: boolean;
}

export interface ListResponse<T> extends ApiEnvelope<T[]> {
  meta?: { page: number; limit: number; total: number };
}
