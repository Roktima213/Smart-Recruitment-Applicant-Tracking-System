import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import {
  listUsers,
  updateUserRole,
  updateUserStatus,
  getCompany,
  updateCompany,
} from '../controllers/adminController';

const router = Router();

// Protect all admin routes with authentication and strict ADMIN role authorization
router.use(authenticateFirebase);
router.use(requireRole(['ADMIN']));

// User Directory & Role Management
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', updateUserStatus);

// Company & Workspace Settings
router.get('/company', getCompany);
router.put('/company', updateCompany);

export default router;
