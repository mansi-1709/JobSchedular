import { Router } from 'express';
import * as workerController from '../controllers/worker.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Dashboard reads (require user JWT)
router.get('/', authenticate, workerController.getWorkers);
router.get('/:id', authenticate, workerController.getWorkerById);

// Worker-to-API internal calls (no user JWT)
router.post('/register', workerController.registerWorker);
router.post('/heartbeat', workerController.sendHeartbeat);
router.delete('/:id', workerController.deregisterWorker);

export default router;
