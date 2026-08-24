import { Request, Response, NextFunction } from 'express';
import * as jobService from '../services/job.service';

export async function createJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.createJob(req.user!.orgId, req.body);
    res.status(201).json({ success: true, data: job });
  } catch (err) { next(err); }
}

export async function createBatchJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await jobService.createBatchJobs(req.user!.orgId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function getJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await jobService.getJobs(req.user!.orgId, req.query as any);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function getJobById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.getJobById(req.params.id, req.user!.orgId);
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
}

export async function retryJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const job = await jobService.retryJob(req.params.id, req.user!.orgId);
    res.json({ success: true, data: job });
  } catch (err) { next(err); }
}

export async function deleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await jobService.deleteJob(req.params.id, req.user!.orgId);
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) { next(err); }
}

export async function getJobExecutions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const executions = await jobService.getJobExecutions(req.params.id, req.user!.orgId);
    res.json({ success: true, data: executions });
  } catch (err) { next(err); }
}

export async function getJobLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const logs = await jobService.getJobLogs(req.params.id, req.user!.orgId);
    res.json({ success: true, data: logs });
  } catch (err) { next(err); }
}

export async function getDeadLetterJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobs = await jobService.getDeadLetterJobs(req.user!.orgId);
    res.json({ success: true, data: jobs });
  } catch (err) { next(err); }
}

// Worker-facing endpoints (no JWT auth, uses worker token validation)
export async function workerClaimJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { queueId, workerId } = req.body;
    const result = await jobService.workerClaimJob(queueId, workerId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function workerCompleteJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = req.params.id || req.body.jobId;
    const { workerId, executionId } = req.body;
    await jobService.workerCompleteJob(jobId, workerId, executionId);
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function workerFailJob(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = req.params.id || req.body.jobId;
    const { workerId, executionId, errorMessage, error } = req.body;
    await jobService.workerFailJob(jobId, workerId, executionId, errorMessage || error || 'Execution failed');
    res.json({ success: true });
  } catch (err) { next(err); }
}

export async function workerAddLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const jobId = req.params.id || req.body.jobId;
    const { level, message, metadata, executionId } = req.body;
    const log = await jobService.workerAddLog(jobId, level, message, metadata, executionId);
    res.status(201).json({ success: true, data: log });
  } catch (err) { next(err); }
}
