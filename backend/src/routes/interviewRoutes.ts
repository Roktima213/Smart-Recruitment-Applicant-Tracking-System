import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  scheduleInterview,
  listInterviews,
  createInterviewSchema,
} from '../controllers/interviewController';

const router = Router();

// Protect all /api/interviews endpoints with Firebase authentication
router.use(authenticateFirebase);

/**
 * POST /api/interviews
 * Schedules an interview with advisory locking, overlap conflict detection, and stage transition
 * Restricted to HR, RECRUITER, ADMIN, SUPER_ADMIN
 */
router.post(
  '/',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'RECRUITER', 'INTERVIEWER']),
  validateRequest({ body: createInterviewSchema }),
  scheduleInterview
);

/**
 * GET /api/interviews
 * Retrieves interview events with tenant and candidate scoping
 */
router.get(
  '/',
  listInterviews
);

export default router;
