import { Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../config/database';
import { storageService } from '../services/storageService';

// PDF Magic bytes: "%PDF-" -> [0x25, 0x50, 0x44, 0x46, 0x2D]
const PDF_MAGIC_BYTES = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

// DOCX Magic bytes: "PK\x03\x04" (Zip archive format used by Office Open XML) -> [0x50, 0x4B, 0x03, 0x04]
const DOCX_MAGIC_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export const updateProfileSchema = z.object({
  headline: z.string().trim().max(255).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  skills: z.array(z.string().trim().min(1)).optional().default([]),
  experience_years: z.number().min(0).max(50).optional().default(0),
  current_company: z.string().trim().max(255).optional().nullable(),
  linkedin_url: z.string().trim().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  github_url: z.string().trim().url('Invalid GitHub URL').optional().nullable().or(z.literal('')),
  portfolio_url: z.string().trim().url('Invalid Portfolio URL').optional().nullable().or(z.literal('')),
  phone: z.string().trim().max(30).optional().nullable(),
});

/**
 * Validates magic-byte signature of uploaded file buffer.
 */
export function validateMagicBytes(buffer: Buffer): { valid: boolean; format: 'pdf' | 'docx' | 'unknown' } {
  if (!buffer || buffer.length < 5) {
    return { valid: false, format: 'unknown' };
  }

  if (buffer.subarray(0, 5).equals(PDF_MAGIC_BYTES)) {
    return { valid: true, format: 'pdf' };
  }

  if (buffer.subarray(0, 4).equals(DOCX_MAGIC_BYTES)) {
    return { valid: true, format: 'docx' };
  }

  return { valid: false, format: 'unknown' };
}

/**
 * Helper to resolve internal user_id from req.user
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const firebaseUid = req.user?.uid;
  if (!firebaseUid) return null;

  const result = await pool.query('SELECT id, full_name, email, role FROM users WHERE firebase_uid = $1 LIMIT 1;', [
    firebaseUid,
  ]);
  return result.rows[0]?.id || null;
}

/**
 * GET /api/candidates/me
 * Retrieves current candidate profile and active resume metadata.
 */
export const getCandidateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'User account not synchronized in database', statusCode: 401 },
      });
      return;
    }

    // Fetch or initialize profile
    let profileRes = await pool.query(
      `SELECT 
        cp.id,
        cp.user_id,
        u.full_name,
        u.email,
        cp.headline,
        cp.summary,
        cp.skills,
        cp.experience_years,
        cp.current_company,
        cp.linkedin_url,
        cp.github_url,
        cp.portfolio_url,
        cp.created_at,
        cp.updated_at
      FROM candidate_profiles cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.user_id = $1;`,
      [userId]
    );

    if (profileRes.rows.length === 0) {
      // Auto-create empty profile
      const insertRes = await pool.query(
        `INSERT INTO candidate_profiles (user_id, skills)
         VALUES ($1, '{}')
         RETURNING id, user_id, headline, summary, skills, experience_years, current_company, linkedin_url, github_url, portfolio_url, created_at, updated_at;`,
        [userId]
      );
      const userRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1;', [userId]);
      profileRes = {
        rows: [
          {
            ...insertRes.rows[0],
            full_name: userRes.rows[0]?.full_name,
            email: userRes.rows[0]?.email,
          },
        ],
      } as any;
    }

    const candidateProfile = profileRes.rows[0];

    // Fetch latest resume metadata
    const resumeRes = await pool.query(
      `SELECT id, file_name, stored_file_name, file_size, mime_type, sha256_hash, created_at
       FROM resume_metadata
       WHERE candidate_id = $1
       ORDER BY created_at DESC
       LIMIT 1;`,
      [candidateProfile.id]
    );

    res.status(200).json({
      success: true,
      profile: candidateProfile,
      resume: resumeRes.rows[0] || null,
    });
  } catch (error: any) {
    console.error('[Candidate Controller - GetProfile Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve candidate profile', statusCode: 500 },
    });
  }
};

/**
 * PUT /api/candidates/me
 * Updates candidate profile details.
 */
export const updateCandidateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    const validatedData = updateProfileSchema.parse(req.body);

    const upsertSql = `
      INSERT INTO candidate_profiles (
        user_id,
        headline,
        summary,
        skills,
        experience_years,
        current_company,
        linkedin_url,
        github_url,
        portfolio_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id) DO UPDATE SET
        headline = EXCLUDED.headline,
        summary = EXCLUDED.summary,
        skills = EXCLUDED.skills,
        experience_years = EXCLUDED.experience_years,
        current_company = EXCLUDED.current_company,
        linkedin_url = EXCLUDED.linkedin_url,
        github_url = EXCLUDED.github_url,
        portfolio_url = EXCLUDED.portfolio_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await pool.query(upsertSql, [
      userId,
      validatedData.headline || null,
      validatedData.summary || null,
      validatedData.skills || [],
      validatedData.experience_years ?? 0,
      validatedData.current_company || null,
      validatedData.linkedin_url || null,
      validatedData.github_url || null,
      validatedData.portfolio_url || null,
    ]);

    const userRes = await pool.query('SELECT full_name, email FROM users WHERE id = $1;', [userId]);

    res.status(200).json({
      success: true,
      profile: {
        ...result.rows[0],
        full_name: userRes.rows[0]?.full_name,
        email: userRes.rows[0]?.email,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { message: 'Validation failed', details: error.errors, statusCode: 400 },
      });
      return;
    }
    console.error('[Candidate Controller - UpdateProfile Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update candidate profile', statusCode: 500 },
    });
  }
};

/**
 * POST /api/candidates/me/resume
 * Defensive resume upload endpoint validating magic-bytes and payload size.
 */
export const uploadResume = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      res.status(401).json({
        success: false,
        error: { message: 'Unauthorized', statusCode: 401 },
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: { message: 'No resume file uploaded', statusCode: 400 },
      });
      return;
    }

    const { buffer, originalname, size, mimetype } = req.file;

    // Check size limit (5 MB = 5,242,880 bytes)
    if (size > 5242880) {
      res.status(413).json({
        success: false,
        error: { message: 'File size exceeds maximum allowed limit of 5 MB', statusCode: 413 },
      });
      return;
    }

    // Inspect Magic-Byte File Signatures (Anti-Spoofing Defense)
    const magicCheck = validateMagicBytes(buffer);
    if (!magicCheck.valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file contents: File header signature does not match expected PDF or DOCX format',
          statusCode: 400,
        },
      });
      return;
    }

    // Ensure candidate profile exists
    let profileRes = await pool.query('SELECT id FROM candidate_profiles WHERE user_id = $1;', [userId]);
    if (profileRes.rows.length === 0) {
      profileRes = await pool.query(
        'INSERT INTO candidate_profiles (user_id, skills) VALUES ($1, $2) RETURNING id;',
        [userId, []]
      );
    }
    const candidateId = profileRes.rows[0].id;

    // Save file via StorageService
    const stored = await storageService.saveResumeFile(buffer, originalname, mimetype);

    // Check if candidate already has an existing resume to replace
    const oldResumeRes = await pool.query(
      'SELECT id, stored_file_name FROM resume_metadata WHERE candidate_id = $1;',
      [candidateId]
    );

    if (oldResumeRes.rows.length > 0) {
      for (const old of oldResumeRes.rows) {
        await storageService.deleteResumeFile(old.stored_file_name);
      }
      await pool.query('DELETE FROM resume_metadata WHERE candidate_id = $1;', [candidateId]);
    }

    // Insert new resume record
    const insertRes = await pool.query(
      `INSERT INTO resume_metadata (
        candidate_id,
        file_name,
        stored_file_name,
        file_size,
        mime_type,
        sha256_hash
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, file_name, stored_file_name, file_size, mime_type, sha256_hash, created_at;`,
      [candidateId, originalname, stored.storedFileName, size, mimetype, stored.sha256Hash]
    );

    res.status(201).json({
      success: true,
      message: 'Resume uploaded and verified successfully',
      resume: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error('[Candidate Controller - UploadResume Error]:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to upload and process resume', statusCode: 500 },
    });
  }
};
