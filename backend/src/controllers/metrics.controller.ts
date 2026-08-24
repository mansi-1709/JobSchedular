import { Request, Response, NextFunction } from 'express';
import { getGlobalMetrics } from '../services/metrics.service';

export async function getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const metrics = await getGlobalMetrics(req.user!.orgId);
    res.json({ success: true, data: metrics });
  } catch (err) { next(err); }
}
