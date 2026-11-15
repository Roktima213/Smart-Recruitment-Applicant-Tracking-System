import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import {
  createOffer,
  issueOffer,
  listOffers,
} from '../controllers/offerController';

const router = Router();

router.use(authenticateFirebase);
router.use(requireRole(['HR', 'RECRUITER']));

router.get('/', listOffers);
router.post('/', createOffer);
router.post('/:id/issue', issueOffer);

export default router;
