import api from './axios';
import type { Organization, OrganizationMember, OrgRole } from '../types';

export const orgsApi = {
  list: () => api.get<Organization[]>('/organizations').then((r) => r.data),

  get: (id: number) => api.get<Organization>(`/organizations/${id}`).then((r) => r.data),

  create: (name: string, slug: string) =>
    api.post<Organization>('/organizations', { name, slug }).then((r) => r.data),

  update: (id: number, name: string) =>
    api.put<Organization>(`/organizations/${id}`, { name }).then((r) => r.data),

  delete: (id: number) => api.delete(`/organizations/${id}`),

  addMember: (orgId: number, userId: number, role: OrgRole) =>
    api
      .post<OrganizationMember>(`/organizations/${orgId}/members`, { userId, role })
      .then((r) => r.data),

  removeMember: (orgId: number, memberId: number) =>
    api.delete(`/organizations/${orgId}/members/${memberId}`),

  updateMemberRole: (orgId: number, memberId: number, role: OrgRole) =>
    api
      .put(`/organizations/${orgId}/members/${memberId}/role`, { role })
      .then((r) => r.data),
};
