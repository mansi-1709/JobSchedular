import api from './api';
import type { ApiResponse, Project } from '../types/api.types';

export const projectService = {
  getProjects: async () => {
    const res = await api.get<ApiResponse<Project[]>>('/projects');
    return res.data.data;
  },

  getProjectById: async (id: string) => {
    const res = await api.get<ApiResponse<Project>>(`/projects/${id}`);
    return res.data.data;
  },

  createProject: async (name: string, description?: string) => {
    const res = await api.post<ApiResponse<Project>>('/projects', { name, description });
    return res.data.data;
  },

  deleteProject: async (id: string) => {
    const res = await api.delete<ApiResponse<null>>(`/projects/${id}`);
    return res.data.success;
  },
};
