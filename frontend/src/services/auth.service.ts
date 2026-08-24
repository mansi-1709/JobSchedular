import api from './api';
import type { ApiResponse, User } from '../types/api.types';

export const authService = {
  login: async (email: string, password: string) => {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', {
      email,
      password,
    });
    return res.data.data;
  },

  register: async (name: string, email: string, password: string, organizationName?: string) => {
    const res = await api.post<ApiResponse<{ token: string; user: User }>>('/auth/register', {
      name,
      email,
      password,
      organizationName,
    });
    return res.data.data;
  },
};
