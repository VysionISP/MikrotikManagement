import api from './axios';
import type { Site } from '../types';

export const sitesApi = {
  list: (orgId: number) =>
    api.get<Site[]>(`/organizations/${orgId}/sites`).then((r) => r.data),

  get: (id: number) => api.get<Site>(`/sites/${id}`).then((r) => r.data),

  create: (orgId: number, name: string, description?: string) =>
    api.post<Site>(`/organizations/${orgId}/sites`, { name, description }).then((r) => r.data),

  update: (id: number, data: { name?: string; description?: string }) =>
    api.put<Site>(`/sites/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/sites/${id}`),
};
