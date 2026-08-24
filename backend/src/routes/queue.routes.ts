import { Router } from 'express';
import * as queueController from '../controllers/queue.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createQueueSchema, updateQueueSchema } from '../validators/queue.validator';

const router = Router();

// Public worker-internal endpoint — no JWT required
router.get('/worker/active', queueController.getQueues);

router.use(authenticate);

router.post('/', validate(createQueueSchema), queueController.createQueue);
router.get('/', queueController.getQueues);
router.get('/:id', queueController.getQueueById);
router.put('/:id', validate(updateQueueSchema), queueController.updateQueue);
router.delete('/:id', queueController.deleteQueue);
router.post('/:id/pause', queueController.pauseQueue);
router.post('/:id/resume', queueController.resumeQueue);
router.get('/:id/stats', queueController.getQueueStats);

export default router;
