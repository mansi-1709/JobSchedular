import { Router } from 'express';
import * as jobController from '../controllers/job.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createJobSchema, createBatchJobsSchema } from '../validators/job.validator';

const router = Router();

// User-facing routes (require JWT)
router.get('/', authenticate, jobController.getJobs);
router.post('/', authenticate, validate(createJobSchema), jobController.createJob);
router.post('/batch', authenticate, validate(createBatchJobsSchema), jobController.createBatchJobs);
router.get('/dead-letter', authenticate, jobController.getDeadLetterJobs);
router.get('/:id', authenticate, jobController.getJobById);
router.delete('/:id', authenticate, jobController.deleteJob);
router.post('/:id/retry', authenticate, jobController.retryJob);
router.get('/:id/executions', authenticate, jobController.getJobExecutions);
router.get('/:id/logs', authenticate, jobController.getJobLogs);

// Worker-facing internal routes (no user JWT — workers use API key / internal trust)
router.post('/worker/claim', jobController.workerClaimJob);
router.post('/worker/complete', jobController.workerCompleteJob);
router.post('/worker/fail', jobController.workerFailJob);
router.post('/worker/:id/complete', jobController.workerCompleteJob);
router.post('/worker/:id/fail', jobController.workerFailJob);
router.post('/worker/:id/log', jobController.workerAddLog);

export default router;
