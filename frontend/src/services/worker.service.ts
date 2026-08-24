import api from './api';
import type { ApiResponse, Worker } from '../types/api.types';

export const workerService = {
  getWorkers: async () => {
    const res = await api.get<ApiResponse<Worker[]>>('/workers');
    return res.data.data;
  },

  getWorkerById: async (id: string) => {
    const res = await api.get<ApiResponse<Worker>>(`/workers/${id}`);
    return res.data.data;
  },
};
