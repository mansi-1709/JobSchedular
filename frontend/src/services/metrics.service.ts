import api from './api';
import type { ApiResponse, Metrics } from '../types/api.types';

export const metricsService = {
  getMetrics: async () => {
    const res = await api.get<ApiResponse<Metrics>>('/metrics');
    return res.data.data;
  },
};
