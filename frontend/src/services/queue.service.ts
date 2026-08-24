import api from './api';
import type { ApiResponse, Queue } from '../types/api.types';

export const queueService = {
  getQueues: async (projectId?: string) => {
    const params = projectId ? { projectId } : {};
    const res = await api.get<ApiResponse<Queue[]>>('/queues', { params });
    return res.data.data;
  },

  getQueueById: async (id: string) => {
    const res = await api.get<ApiResponse<Queue>>(`/queues/${id}`);
    return res.data.data;
  },

  createQueue: async (data: Partial<Queue>) => {
    const res = await api.post<ApiResponse<Queue>>('/queues', data);
    return res.data.data;
  },

  updateQueue: async (id: string, data: Partial<Queue>) => {
    const res = await api.put<ApiResponse<Queue>>(`/queues/${id}`, data);
    return res.data.data;
  },

  deleteQueue: async (id: string) => {
    const res = await api.delete<ApiResponse<null>>(`/queues/${id}`);
    return res.data.success;
  },

  pauseQueue: async (id: string) => {
    const res = await api.post<ApiResponse<Queue>>(`/queues/${id}/pause`);
    return res.data.data;
  },

  resumeQueue: async (id: string) => {
    const res = await api.post<ApiResponse<Queue>>(`/queues/${id}/resume`);
    return res.data.data;
  },
};
