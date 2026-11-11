import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { authenticateFirebase } from '../middleware/authMiddleware';
import { storageConfig, ensureStorageDirectory } from '../config/storage';
import {
  getMyProfile,
  updateMyProfile,
  uploadResume,
} from '../controllers/candidateController';

const router = Router();

// Ensure upload directory exists
ensureStorageDirectory();

// Configure Multer Disk Storage with safe UUID filenames
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureStorageDirectory();
    cb(null, storageConfig.uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueId = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    // Default safe temporary extension before magic-byte verification
    const safeExt = ext === '.docx' ? '.docx' : '.pdf';
    cb(null, `resume-${uniqueId}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: storageConfig.maxUploadBytes, // 5 MB
    files: 1,
  },
});

/**
 * Candidate Authorization Guard:
 * Strictly enforces that only users with CANDIDATE role can access candidate endpoints.
 * Rejects other roles (HR, ADMIN, etc.) with HTTP 403 Forbidden.
 */
function requireCandidateRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required prior to candidate verification',
    });
    return;
  }

  if (req.user.isActive === false || (req.user as any).is_active === false) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'User account is deactivated',
    });
    return;
  }

  const role = (req.user.role || '').toUpperCase();
  if (role !== 'CANDIDATE') {
    res.status(403).json({
      error: 'Forbidden',
      message: `Forbidden: User role "${role}" is not permitted to access candidate endpoints`,
      allowedRoles: ['CANDIDATE'],
    });
    return;
  }

  next();
}

/**
 * Multer error handling wrapper for resume upload
 */
function handleResumeUpload(req: Request, res: Response, next: NextFunction): void {
  const singleUpload = upload.single('resume');

  singleUpload(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          error: {
            message: `File size exceeds maximum allowed limit of ${storageConfig.maxUploadBytes / (1024 * 1024)} MB`,
            statusCode: 400,
          },
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: {
          message: `File upload error: ${err.message}`,
          statusCode: 400,
        },
      });
      return;
    } else if (err) {
      res.status(400).json({
        success: false,
        error: {
          message: err.message || 'File upload failed',
          statusCode: 400,
        },
      });
      return;
    }

    next();
  });
}

// Protect all /api/candidates endpoints with Firebase authentication and CANDIDATE role check
router.use(authenticateFirebase);
router.use(requireCandidateRole);

/**
 * GET /api/candidates/me
 * Retrieve current candidate's profile
 */
router.get('/me', getMyProfile);

/**
 * PUT /api/candidates/me
 * Update current candidate's profile
 */
router.put('/me', updateMyProfile);

/**
 * POST /api/candidates/me/resume
 * Upload resume with magic-byte inspection and SHA-256 metadata storage
 */
router.post('/me/resume', handleResumeUpload, uploadResume);

export default router;

