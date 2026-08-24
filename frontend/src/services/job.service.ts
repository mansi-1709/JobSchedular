import api from './api';
import type { ApiResponse, Job, JobExecution, JobLog, PaginatedResponse, DeadLetterJob } from '../types/api.types';

export interface JobFilters {
  queueId?: string;
  status?: string;
  jobType?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const jobService = {
  getJobs: async (filters: JobFilters) => {
    const res = await api.get<ApiResponse<PaginatedResponse<Job>>>('/jobs', { params: filters });
    return res.data.data;
  },

  getJobById: async (id: string) => {
    const res = await api.get<ApiResponse<Job>>(`/jobs/${id}`);
    return res.data.data;
  },

  createJob: async (data: any) => {
    const res = await api.post<ApiResponse<Job>>('/jobs', data);
    return res.data.data;
  },

  createBatchJobs: async (jobs: any[]) => {
    const res = await api.post<ApiResponse<{ batchId: string; count: number; jobs: Job[] }>>('/jobs/batch', { jobs });
    return res.data.data;
  },

  retryJob: async (id: string) => {
    const res = await api.post<ApiResponse<Job>>(`/jobs/${id}/retry`);
    return res.data.data;
  },

  deleteJob: async (id: string) => {
    const res = await api.delete<ApiResponse<null>>(`/jobs/${id}`);
    return res.data.success;
  },

  getJobExecutions: async (id: string) => {
    const res = await api.get<ApiResponse<JobExecution[]>>(`/jobs/${id}/executions`);
    return res.data.data;
  },

  getJobLogs: async (id: string) => {
    const res = await api.get<ApiResponse<JobLog[]>>(`/jobs/${id}/logs`);
    return res.data.data;
  },

  getDeadLetterJobs: async () => {
    const res = await api.get<ApiResponse<DeadLetterJob[]>>('/jobs/dead-letter');
    return res.data.data;
  },
};
