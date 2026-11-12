import { Router } from 'express';
import multer from 'multer';
import {
  getCandidateProfile,
  updateCandidateProfile,
  uploadResume,
} from '../controllers/candidateController';
import { authenticateFirebase } from '../middleware/authMiddleware';

const router = Router();

// Multer in-memory storage for magic-byte analysis and buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5242880, // 5 MB hard limit
    files: 1,
  },
});

// All candidate routes require authenticated session
router.use(authenticateFirebase);

// Profile Read & Update
router.get('/me', getCandidateProfile);
router.put('/me', updateCandidateProfile);

// Defensive Resume Upload
router.post('/me/resume', upload.single('resume'), uploadResume);

export default router;
