import { Request, Response, NextFunction } from 'express';
import * as projectService from '../services/project.service';

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await projectService.createProject(req.user!.orgId, req.body.name, req.body.description);
    res.status(201).json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projects = await projectService.getProjects(req.user!.orgId);
    res.json({ success: true, data: projects });
  } catch (err) { next(err); }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await projectService.getProjectById(req.params.id, req.user!.orgId);
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await projectService.updateProject(req.params.id, req.user!.orgId, req.body);
    res.json({ success: true, data: project });
  } catch (err) { next(err); }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await projectService.deleteProject(req.params.id, req.user!.orgId);
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) { next(err); }
}

export async function getProjectStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await projectService.getProjectStats(req.params.id, req.user!.orgId);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}
