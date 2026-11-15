import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import {
  createDraftOffer,
  issueOffer,
  getOfferById,
  listOffers,
  createOfferSchema,
} from '../controllers/offerController';

const router = Router();

// Protect all /api/offers endpoints with Firebase authentication
router.use(authenticateFirebase);

/**
 * GET /api/offers
 * List offers accessible to caller (scoped by organization or candidate).
 */
router.get('/', listOffers);

/**
 * POST /api/offers
 * Create or save a draft offer with HTML snapshot and active offer uniqueness check.
 * Restricted to HR, ADMIN, SUPER_ADMIN.
 */
router.post(
  '/',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR']),
  validateRequest({ body: createOfferSchema }),
  createDraftOffer
);

/**
 * PATCH /api/offers/:id/issue & POST /api/offers/:id/issue
 * Atomically issues an offer, transitions application stage from SELECTED to OFFERED,
 * appends stage audit history, and enqueues a notification event.
 * Restricted to HR, ADMIN, SUPER_ADMIN.
 */
router.patch(
  '/:id/issue',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR']),
  issueOffer
);

router.post(
  '/:id/issue',
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR']),
  issueOffer
);

/**
 * GET /api/offers/:id
 * Retrieves offer details and immutable HTML offer letter snapshot.
 * Accessible to candidate owner, or HR/ADMIN within the same organization.
 */
router.get(
  '/:id',
  getOfferById
);

export default router;
