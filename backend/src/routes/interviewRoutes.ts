import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  scheduleInterview,
  listInterviews,
  listInterviewers,
  updateInterview,
  submitScorecard,
  getScorecard,
  createInterviewSchema,
  updateInterviewSchema,
  submitScorecardSchema,
} from '../controllers/interviewController';

const router = Router();

// Protect all /api/interviews endpoints with Firebase authentication
router.use(authenticateFirebase);

/**
 * GET /api/interviews/interviewers
 * Retrieves available active interviewers for scheduling within tenant company
 */
router.get(
  '/interviewers',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'RECRUITER']),
  listInterviewers
);

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

/**
 * PATCH /api/interviews/:id
 * Reschedules or cancels an interview with overlap conflict validation
 * Restricted to staff: HR, RECRUITER, ADMIN, SUPER_ADMIN
 */
router.patch(
  '/:id',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'RECRUITER', 'INTERVIEWER']),
  validateRequest({ body: updateInterviewSchema }),
  updateInterview
);

/**
 * POST /api/interviews/:id/feedback
 * Submits structured evaluator scorecard and marks interview COMPLETED
 * Restricted to staff: HR, RECRUITER, ADMIN, SUPER_ADMIN, INTERVIEWER
 */
router.post(
  '/:id/feedback',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'RECRUITER', 'INTERVIEWER']),
  validateRequest({ body: submitScorecardSchema }),
  submitScorecard
);

/**
 * GET /api/interviews/:id/feedback
 * Retrieves confidential evaluator scorecards.
 * STRICTLY restricted to internal staff (Candidates blocked with 403 Forbidden).
 */
router.get(
  '/:id/feedback',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'RECRUITER', 'INTERVIEWER']),
  getScorecard
);

export default router;
