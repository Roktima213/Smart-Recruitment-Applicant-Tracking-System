import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import { syncUser, getCurrentUser } from '../controllers/authController';
import { syncAllClaims } from '../controllers/adminController';

const router = Router();

/**
 * POST /api/auth/sync
 * Syncs user upon login or registration
 */
router.post('/sync', authenticateFirebase, syncUser);

/**
 * POST /api/auth/sync-claims
 * Re-synchronize Firebase custom claims for authenticated user (or all users if Admin)
 */
router.post('/sync-claims', authenticateFirebase, syncAllClaims);

/**
 * GET /api/auth/me
 * Gets profile of current authenticated user
 */
router.get('/me', authenticateFirebase, getCurrentUser);

/**
 * GET /api/auth/verify-role
 * Route testing RBAC authorization
 */
router.get('/verify-role/admin', authenticateFirebase, requireRole(['ADMIN']), (req, res) => {
  res.json({ success: true, message: 'Welcome Admin', user: req.user });
});

router.get('/verify-role/hr', authenticateFirebase, requireRole(['ADMIN', 'HR']), (req, res) => {
  res.json({ success: true, message: 'Welcome HR/Recruiter', user: req.user });
});

export default router;
