import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { query } from '../config/database';
import { authenticateFirebase } from '../middleware/authMiddleware';
import { getSafeStoragePath } from '../config/storage';

const router = Router();

// Protect all resume routes with Firebase authentication
router.use(authenticateFirebase);

/**
 * GET /api/resumes/:id/download
 * Ownership-verified private resume streaming endpoint.
 *
 * Security & Ownership Rules:
 * 1. Requires valid Firebase authentication session.
 * 2. ADMIN and HR roles have access to view/download any candidate's resume for recruitment evaluation.
 * 3. CANDIDATE role is strictly constrained by ownership: can only download their own resume (Anti-IDOR).
 * 4. Malformed IDs return 400 Bad Request.
 * 5. Missing records or unlinked files return 404 Not Found.
 * 6. Sets defense-in-depth headers: nosniff, private cache control, Content-Disposition attachment.
 */
router.get('/:id/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const resumeId = req.params.id;
    const currentUser = req.user;

    if (!currentUser || !currentUser.uid) {
      res.status(401).json({
        success: false,
        error: { message: 'Authentication required to download resume', statusCode: 401 },
      });
      return;
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(resumeId)) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid resume identifier format', statusCode: 400 },
      });
      return;
    }

    // Retrieve resume metadata with candidate owner linkage
    const resumeSql = `
      SELECT 
        rm.id,
        rm.candidate_id,
        rm.file_name,
        rm.stored_file_name,
        rm.file_size,
        rm.mime_type,
        rm.sha256_hash,
        cp.user_id AS candidate_user_id,
        u.firebase_uid AS candidate_firebase_uid
      FROM resume_metadata rm
      JOIN candidate_profiles cp ON rm.candidate_id = cp.id
      JOIN users u ON cp.user_id = u.id
      WHERE rm.id = $1
      LIMIT 1;
    `;
    const result = await query(resumeSql, [resumeId]);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: { message: 'Resume document not found', statusCode: 404 },
      });
      return;
    }

    const resume = result.rows[0];
    const role = (currentUser.role || '').toUpperCase();

    // IDOR & Authorization Guard:
    // HR and ADMIN can review any resume.
    // CANDIDATE can only access their own resume.
    const isPrivileged = role === 'ADMIN' || role === 'HR';
    const isOwner = currentUser.uid === resume.candidate_firebase_uid;

    if (!isPrivileged && !isOwner) {
      res.status(403).json({
        success: false,
        error: {
          message: 'Forbidden: You do not have permission to access this resume',
          statusCode: 403,
        },
      });
      return;
    }

    // Resolve safe physical storage path
    const filePath = getSafeStoragePath(resume.stored_file_name);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        error: { message: 'Resume file missing from storage', statusCode: 404 },
      });
      return;
    }

    // Defense-in-depth headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    if (resume.sha256_hash) {
      res.setHeader('ETag', `"${resume.sha256_hash}"`);
    }

    res.download(filePath, resume.file_name, (err) => {
      if (err) {
        console.error('[Resume Stream Error]', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: { message: 'Failed to stream resume file', statusCode: 500 },
          });
        }
      }
    });
  } catch (error: unknown) {
    console.error('[Resume Download Handler Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal error downloading resume', statusCode: 500 },
    });
  }
});

export default router;
