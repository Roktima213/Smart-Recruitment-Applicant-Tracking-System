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
import { authenticateFirebase, optionalAuthenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { publicCache } from '../middleware/cacheControl';

const router = Router();

// Public & Candidate Read Access with Optional Auth, Caching and ETag Validation
router.get(
  '/',
  optionalAuthenticateFirebase,
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 30, vary: ['Accept-Encoding', 'Origin', 'Authorization'] }),
  listJobs
);
router.get(
  '/:id',
  optionalAuthenticateFirebase,
  publicCache({ maxAgeSeconds: 60, staleWhileRevalidateSeconds: 30, vary: ['Accept-Encoding', 'Origin', 'Authorization'] }),
  getJobById
);

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
