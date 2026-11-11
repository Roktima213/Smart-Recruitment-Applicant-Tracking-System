import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import {
  listAllUsers,
  updateUserRole,
  updateUserStatus,
  getCompany,
  updateCompany,
} from '../controllers/adminController';

const router = Router();

// Enforce Firebase authentication and ADMIN role on all /api/admin routes
router.use(authenticateFirebase);
router.use(requireRole(['ADMIN']));

/**
 * GET /api/admin/users
 * List all registered users with role and company information
 */
router.get('/users', listAllUsers);

/**
 * PATCH /api/admin/users/:id/role
 * Update user role and synchronize Firebase custom claims
 */
router.patch('/users/:id/role', updateUserRole);

/**
 * PATCH /api/admin/users/:id/status
 * Activate or deactivate user account and revoke sessions
 */
router.patch('/users/:id/status', updateUserStatus);

/**
 * GET /api/admin/company
 * Retrieve company profile and configuration
 */
router.get('/company', getCompany);

/**
 * PUT /api/admin/company
 * Update company profile, branding, and system settings
 */
router.put('/company', updateCompany);

export default router;
