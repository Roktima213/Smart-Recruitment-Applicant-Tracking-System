import { Router } from 'express';
import { authenticateFirebase, requireRole } from '../middleware/authMiddleware';
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getDeliveryLogs,
} from '../controllers/notificationController';

const router = Router();

// In-app notifications for authenticated user
router.get('/', authenticateFirebase, getMyNotifications);
router.patch('/:id/read', authenticateFirebase, markAsRead);
router.post('/read-all', authenticateFirebase, markAllAsRead);

// Delivery telemetry logs for recruitment and administrative staff
router.get(
  '/logs',
  authenticateFirebase,
  requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'RECRUITER']),
  getDeliveryLogs
);

export default router;
