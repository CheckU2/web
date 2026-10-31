import { apiRequest } from "./http";
import type { ApiEnvelope, ListResponse } from "../types/api";

export interface ResourceRecord extends Record<string, unknown> {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  code?: string;
  status?: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
}

export function listResource<T extends ResourceRecord = ResourceRecord>(
  resource: string,
  page = 1,
  limit = 20,
): Promise<ListResponse<T>> {
  return apiRequest<ListResponse<T>>(`/api/v1/${resource}?page=${page}&limit=${limit}`);
}

export function createResource<T extends ResourceRecord = ResourceRecord>(
  resource: string,
  payload: Record<string, unknown>,
): Promise<ApiEnvelope<T>> {
  return apiRequest<ApiEnvelope<T>>(`/api/v1/${resource}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateResource<T extends ResourceRecord = ResourceRecord>(
  resource: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<ApiEnvelope<T>> {
  return apiRequest<ApiEnvelope<T>>(`/api/v1/${resource}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteResource(resource: string, id: string): Promise<unknown> {
  return apiRequest(`/api/v1/${resource}/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function getDashboardMetrics(): Promise<ApiEnvelope<Record<string, number>>> {
  return apiRequest<ApiEnvelope<Record<string, number>>>("/api/v1/reports/dashboard");
}
