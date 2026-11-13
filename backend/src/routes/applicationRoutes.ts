import { Router } from 'express';
import { authenticateFirebase } from '../middleware/authMiddleware';
import {
  submitApplication,
  getMyApplications,
  getApplicationById,
} from '../controllers/applicationController';

const router = Router();

// Protect all application routes with Firebase authentication
router.use(authenticateFirebase);

/**
 * POST /api/applications
 * Submit a job application with atomic stage history insertion.
 */
router.post('/', submitApplication);

/**
 * GET /api/applications/me
 * Candidate personal application tracking history.
 */
router.get('/me', getMyApplications);

/**
 * GET /api/applications/:id
 * Retrieve single application detail with complete stage progression timeline.
 */
router.get('/:id', getApplicationById);

export default router;
