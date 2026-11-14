import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import {
  listInterviews,
  listInterviewers,
  scheduleInterview,
  scheduleInterviewSchema,
} from '../controllers/interviewController';
import { validateRequest } from '../middleware/validateRequest';

const router = Router();

router.use(authenticateFirebase);

router.get(
  '/',
  requireRole(['HR']),
  listInterviews
);

router.get(
  '/interviewers',
  requireRole(['HR']),
  listInterviewers
);

router.post(
  '/',
  requireRole(['HR']),
  validateRequest({ body: scheduleInterviewSchema }),
  scheduleInterview
);

export default router;
