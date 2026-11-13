import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { requireCandidateRole } from './candidateRoutes';
import {
  submitApplication,
  getMyApplications,
  getApplicationById,
  updateApplicationStage,
  submitApplicationSchema,
  updateApplicationStageSchema,
} from '../controllers/applicationController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

// Protect all /api/applications endpoints with Firebase authentication
router.use(authenticateFirebase);

/**
 * POST /api/applications
 * Candidate-only application submission within ACID transaction
 */
router.post(
  '/',
  requireCandidateRole,
  validateRequest({ body: submitApplicationSchema }),
  submitApplication
);

/**
 * GET /api/applications/me
 * Candidate-only application history retrieval (newest first)
 */
router.get(
  '/me',
  requireCandidateRole,
  getMyApplications
);

/**
 * GET /api/applications/:id
 * Retrieve single application details with ownership/role authorization
 */
router.get(
  '/:id',
  getApplicationById
);

/**
 * PATCH /api/applications/:id/stage
 * HR / Admin-only stage transition with state machine validation and row-level locking
 */
router.patch(
  '/:id/stage',
  requireRole(['ADMIN', 'HR']),
  validateRequest({ body: updateApplicationStageSchema }),
  updateApplicationStage
);

export default router;
