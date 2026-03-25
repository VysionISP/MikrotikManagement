import api from './axios';
import type { AuthResponse, User } from '../types';

export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { username, password }).then((r) => r.data),

  register: (username: string, email: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { username, email, password }).then((r) => r.data),

  profile: () => api.get<User>('/auth/profile').then((r) => r.data),
};
