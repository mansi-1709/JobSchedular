import { Request, Response, NextFunction } from 'express';
import * as queueService from '../services/queue.service';

export async function createQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queue = await queueService.createQueue(req.user!.orgId, req.body);
    res.status(201).json({ success: true, data: queue });
  } catch (err) { next(err); }
}

export async function getQueues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queues = await queueService.getQueues(req.user?.orgId, req.query.projectId as string);
    res.json({ success: true, data: queues });
  } catch (err) { next(err); }
}

export async function getQueueById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queue = await queueService.getQueueById(req.params.id, req.user!.orgId);
    res.json({ success: true, data: queue });
  } catch (err) { next(err); }
}

export async function updateQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queue = await queueService.updateQueue(req.params.id, req.user!.orgId, req.body);
    res.json({ success: true, data: queue });
  } catch (err) { next(err); }
}

export async function deleteQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await queueService.deleteQueue(req.params.id, req.user!.orgId);
    res.json({ success: true, message: 'Queue deleted' });
  } catch (err) { next(err); }
}

export async function pauseQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queue = await queueService.pauseQueue(req.params.id, req.user!.orgId);
    res.json({ success: true, data: queue });
  } catch (err) { next(err); }
}

export async function resumeQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const queue = await queueService.resumeQueue(req.params.id, req.user!.orgId);
    res.json({ success: true, data: queue });
  } catch (err) { next(err); }
}

export async function getQueueStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await queueService.getQueueStatistics(req.params.id, req.user!.orgId);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}
