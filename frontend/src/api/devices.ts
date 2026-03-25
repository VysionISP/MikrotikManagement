import api from './axios';
import type { Device, DeviceMetric, SystemResources, InterfaceInfo } from '../types';

export const devicesApi = {
  list: (siteId: number) =>
    api.get<Device[]>(`/sites/${siteId}/devices`).then((r) => r.data),

  get: (id: number) => api.get<Device>(`/devices/${id}`).then((r) => r.data),

  create: (siteId: number, data: {
    name: string;
    ipAddress: string;
    apiPort?: number;
    username: string;
    password: string;
  }) =>
    api.post<Device>(`/sites/${siteId}/devices`, data).then((r) => r.data),

  update: (id: number, data: Partial<{
    name: string;
    ipAddress: string;
    apiPort: number;
    username: string;
    password: string;
  }>) =>
    api.put<Device>(`/devices/${id}`, data).then((r) => r.data),

  delete: (id: number) => api.delete(`/devices/${id}`),

  testConnection: (id: number) =>
    api
      .post<{ success: boolean; info: SystemResources }>(`/devices/${id}/test`)
      .then((r) => r.data),

  getStats: (id: number) =>
    api
      .get<{ resources: SystemResources; interfaces: InterfaceInfo[] }>(`/devices/${id}/stats`)
      .then((r) => r.data),

  getMetrics: (id: number, limit = 60) =>
    api.get<DeviceMetric[]>(`/devices/${id}/metrics?limit=${limit}`).then((r) => r.data),
};
