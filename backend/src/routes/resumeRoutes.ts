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
    // 1. Candidate owner can download their own resume.
    // 2. Global ADMIN can review any candidate resume.
    // 3. HR can ONLY review candidate resumes if the candidate has applied to a job in HR's company.
    const isOwner = currentUser.uid === resume.candidate_firebase_uid;
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';

    if (isOwner) {
      // Owner candidate access allowed
    } else if (isAdmin) {
      // Global admin access allowed
    } else if (role === 'HR') {
      let hrCompanyId = currentUser.companyId;
      if (!hrCompanyId && currentUser.uid) {
        const hrRes = await query('SELECT company_id FROM users WHERE firebase_uid = $1 LIMIT 1;', [currentUser.uid]);
        hrCompanyId = hrRes.rows[0]?.company_id || null;
      }
      if (!hrCompanyId) {
        res.status(403).json({
          success: false,
          error: { message: 'Forbidden: HR user has no assigned company', statusCode: 403 },
        });
        return;
      }

      const appMatchSql = `
        SELECT 1 FROM applications a
        JOIN jobs j ON a.job_id = j.id
        WHERE j.company_id = $1
          AND (a.resume_id = $2 OR a.candidate_id = $3)
        LIMIT 1;
      `;
      const appMatchRes = await query(appMatchSql, [hrCompanyId, resumeId, resume.candidate_id]);
      if (appMatchRes.rows.length === 0) {
        res.status(403).json({
          success: false,
          error: {
            message: 'Forbidden: You do not have permission to access resumes outside your organization applications',
            statusCode: 403,
          },
        });
        return;
      }
    } else {
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

    // Defense-in-depth security headers (nosniff, Content-Disposition, private cache)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resume.file_name)}"`);
    res.setHeader('Content-Type', resume.mime_type || 'application/pdf');
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
