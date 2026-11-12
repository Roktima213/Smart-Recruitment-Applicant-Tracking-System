import { Router } from 'express';
import { authenticateFirebase } from '../middleware/authMiddleware';
import { requireCandidateRole } from './candidateRoutes';
import {
  submitApplication,
  getMyApplications,
  submitApplicationSchema,
} from '../controllers/applicationController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Protect all /api/applications endpoints with Firebase authentication and CANDIDATE role guard
router.use(authenticateFirebase);
router.use(requireCandidateRole);

/**
 * POST /api/applications
 * Candidate-only application submission within ACID transaction
 */
router.post(
  '/',
  validateRequest({ body: submitApplicationSchema }),
  submitApplication
);

/**
 * GET /api/applications/me
 * Candidate-only application history retrieval (newest first)
 */
router.get(
  '/me',
  getMyApplications
);

export default router;

