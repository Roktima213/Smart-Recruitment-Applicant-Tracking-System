import { Router } from 'express';
import {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  createJobSchema,
  updateJobSchema,
  updateJobStatusSchema,
} from '../controllers/jobController';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Public & Candidate Read Access
router.get('/', listJobs);
router.get('/:id', getJobById);

// Staff-Only Protected Mutation Routes (ADMIN and HR)
router.post(
  '/',
  authenticateFirebase,
  requireRole(['ADMIN', 'HR']),
  validateRequest({ body: createJobSchema }),
  createJob
);

router.put(
  '/:id',
  authenticateFirebase,
  requireRole(['ADMIN', 'HR']),
  validateRequest({ body: updateJobSchema }),
  updateJob
);

router.patch(
  '/:id/status',
  authenticateFirebase,
  requireRole(['ADMIN', 'HR']),
  validateRequest({ body: updateJobStatusSchema }),
  updateJobStatus
);

export default router;
