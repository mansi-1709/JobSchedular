import { Request, Response, NextFunction } from 'express';
import * as workerService from '../services/worker.service';

export async function registerWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { hostname, pid, metadata } = req.body;
    const worker = await workerService.registerWorker(hostname, pid, metadata);
    res.status(201).json({ success: true, data: worker });
  } catch (err) { next(err); }
}

export async function sendHeartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { workerId, status, currentJobIds, jobsProcessed } = req.body;
    const worker = await workerService.sendHeartbeat(workerId, status, currentJobIds ?? [], jobsProcessed ?? 0);
    res.json({ success: true, data: worker });
  } catch (err) { next(err); }
}

export async function deregisterWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const worker = await workerService.deregisterWorker(req.params.id);
    res.json({ success: true, data: worker });
  } catch (err) { next(err); }
}

export async function getWorkers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workers = await workerService.getWorkers();
    res.json({ success: true, data: workers });
  } catch (err) { next(err); }
}

export async function getWorkerById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const worker = await workerService.getWorkerById(req.params.id);
    res.json({ success: true, data: worker });
  } catch (err) { next(err); }
}
