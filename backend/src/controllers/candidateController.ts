/// <reference types="multer" />
import { Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { query, getClient } from '../config/database';
import { storageConfig, ensureStorageDirectory, getSafeStoragePath } from '../config/storage';
import { storeResume } from '../services/resumeStorageService';

/**
 * Magic-byte file signature validation
 */
export interface MagicByteDetection {
  isValid: boolean;
  detectedMimeType: string | null;
  extension: string | null;
}

export function detectFileTypeFromMagicBytes(buffer: Buffer): MagicByteDetection {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return {
      isValid: true,
      detectedMimeType: 'application/pdf',
      extension: '.pdf',
    };
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return {
      isValid: true,
      detectedMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extension: '.docx',
    };
  }

  return {
    isValid: false,
    detectedMimeType: null,
    extension: null,
  };
}

/**
 * Zod validation schema for updating candidate profile
 */
const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1).max(255).optional(),
  location: z.string().trim().max(255).optional().nullable(),
  summary: z.string().trim().max(5000).optional().nullable(),
  skills: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  phone: z.string().trim().max(50).optional().nullable(),
  headline: z.string().trim().max(255).optional().nullable(),
  currentCompany: z.string().trim().max(255).optional().nullable(),
  current_company: z.string().trim().max(255).optional().nullable(),
  experienceYears: z.number().min(0, 'Experience years must be non-negative').max(70).optional(),
  experience_years: z.number().min(0, 'Experience years must be non-negative').max(70).optional(),
  linkedinUrl: z.string().trim().max(2048).optional().nullable(),
  linkedin_url: z.string().trim().max(2048).optional().nullable(),
  githubUrl: z.string().trim().max(2048).optional().nullable(),
  github_url: z.string().trim().max(2048).optional().nullable(),
  portfolioUrl: z.string().trim().max(2048).optional().nullable(),
  portfolio_url: z.string().trim().max(2048).optional().nullable(),
  portfolioLinks: z
    .object({
      linkedin: z.string().trim().max(2048).optional().nullable(),
      github: z.string().trim().max(2048).optional().nullable(),
      portfolio: z.string().trim().max(2048).optional().nullable(),
    })
    .optional(),
});

/**
 * Helper to get or bootstrap candidate user and profile from authenticated session
 */
export async function getOrCreateCandidateProfile(firebaseUid: string) {
  // 1. Fetch user from PostgreSQL
  const userSql = `
    SELECT id, firebase_uid, email, full_name, role, phone, avatar_url, is_active
    FROM users
    WHERE firebase_uid = $1
    LIMIT 1;
  `;
  const userRes = await query(userSql, [firebaseUid]);

  if (userRes.rows.length === 0) {
    return null;
  }

  const user = userRes.rows[0];

  // 2. Fetch or create candidate_profiles record
  const profileSql = `
    SELECT id, user_id, headline, summary, skills, experience_years, current_company, location, linkedin_url, github_url, portfolio_url, created_at, updated_at
    FROM candidate_profiles
    WHERE user_id = $1
    LIMIT 1;
  `;
  let profileRes = await query(profileSql, [user.id]);

  if (profileRes.rows.length === 0) {
    // Bootstrap initial empty candidate profile
    const insertProfileSql = `
      INSERT INTO candidate_profiles (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
      RETURNING id, user_id, headline, summary, skills, experience_years, current_company, location, linkedin_url, github_url, portfolio_url, created_at, updated_at;
    `;
    profileRes = await query(insertProfileSql, [user.id]);
  }

  return {
    user,
    profile: profileRes.rows[0],
  };
}

export interface CandidateUserRecord {
  id: string;
  firebase_uid?: string;
  email: string;
  full_name: string;
  role?: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
}

export interface CandidateProfileRecord {
  id: string;
  user_id: string;
  headline?: string | null;
  summary?: string | null;
  skills?: string[] | null;
  experience_years?: number | string | null;
  current_company?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  location?: string | null;
}

export interface ResumeMetadataRecord {
  id: string;
  candidate_id?: string;
  file_name: string;
  stored_file_name: string;
  file_size: number | string;
  mime_type: string;
  sha256_hash: string;
  created_at: Date | string;
}

/**
 * Format candidate profile for API response
 */
function formatProfileResponse(
  user: CandidateUserRecord,
  profile: CandidateProfileRecord,
  latestResume?: ResumeMetadataRecord | null
) {
  return {
    candidateId: profile.id,
    userId: user.id,
    name: user.full_name,
    email: user.email,
    phone: user.phone || null,
    headline: profile.headline || null,
    summary: profile.summary || null,
    skills: profile.skills || [],
    experienceYears: profile.experience_years !== null ? Number(profile.experience_years) : 0,
    currentCompany: profile.current_company || null,
    location: profile.location || null,
    portfolioLinks: {
      linkedin: profile.linkedin_url || null,
      github: profile.github_url || null,
      portfolio: profile.portfolio_url || null,
    },
    linkedinUrl: profile.linkedin_url || null,
    githubUrl: profile.github_url || null,
    portfolioUrl: profile.portfolio_url || null,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    ...(latestResume && {
      resume: {
        id: latestResume.id,
        fileName: latestResume.file_name,
        storedFileName: latestResume.stored_file_name,
        fileSizeBytes: latestResume.file_size,
        mimeType: latestResume.mime_type,
        sha256Hash: latestResume.sha256_hash,
        createdAt: latestResume.created_at,
      },
    }),
  };
}

/**
 * 1. GET /api/candidates/me
 * Retrieves authenticated candidate's profile and latest resume
 */
export async function getMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    const data = await getOrCreateCandidateProfile(uid);
    if (!data) {
      res.status(404).json({
        success: false,
        error: { message: 'Candidate user record not found in database', statusCode: 404 },
      });
      return;
    }

    const { user, profile } = data;

    // Fetch latest resume metadata if available
    const resumeSql = `
      SELECT id, candidate_id, file_name, stored_file_name, file_size, mime_type, sha256_hash, created_at
      FROM resume_metadata
      WHERE candidate_id = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const resumeRes = await query(resumeSql, [profile.id]);
    const latestResume = resumeRes.rows[0] || null;

    res.status(200).json({
      success: true,
      profile: formatProfileResponse(user, profile, latestResume),
    });
  } catch (error: unknown) {
    console.error('[Get Candidate Profile Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve candidate profile', statusCode: 500 },
    });
  }
}

/**
 * 2. PUT /api/candidates/me
 * Updates candidate profile fields (summary, skills, phone, portfolio links)
 */
export async function updateMyProfile(req: Request, res: Response): Promise<void> {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
    const parseResult = updateProfileSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.errors[0]?.message || 'Invalid profile update payload';
      res.status(400).json({
        success: false,
        error: { message: errorMessage, statusCode: 400 },
      });
      return;
    }

    const data = await getOrCreateCandidateProfile(uid);
    if (!data) {
      res.status(404).json({
        success: false,
        error: { message: 'Candidate user record not found in database', statusCode: 404 },
      });
      return;
    }

    const { user, profile } = data;
    const incoming = parseResult.data;

    // Resolve incoming values with fallback to existing values
    const resolvedSummary = incoming.summary !== undefined ? incoming.summary : profile.summary;
    const resolvedLocation = incoming.location !== undefined ? incoming.location : profile.location;
    const resolvedSkills = incoming.skills !== undefined ? incoming.skills : profile.skills;
    const resolvedHeadline = incoming.headline !== undefined ? incoming.headline : profile.headline;
    const resolvedCurrentCompany =
      incoming.currentCompany !== undefined
        ? incoming.currentCompany
        : incoming.current_company !== undefined
        ? incoming.current_company
        : profile.current_company;
    const resolvedExperience =
      incoming.experienceYears !== undefined
        ? incoming.experienceYears
        : incoming.experience_years !== undefined
        ? incoming.experience_years
        : profile.experience_years;

    const resolvedLinkedin =
      incoming.linkedinUrl !== undefined
        ? incoming.linkedinUrl
        : incoming.linkedin_url !== undefined
        ? incoming.linkedin_url
        : incoming.portfolioLinks?.linkedin !== undefined
        ? incoming.portfolioLinks.linkedin
        : profile.linkedin_url;

    const resolvedGithub =
      incoming.githubUrl !== undefined
        ? incoming.githubUrl
        : incoming.github_url !== undefined
        ? incoming.github_url
        : incoming.portfolioLinks?.github !== undefined
        ? incoming.portfolioLinks.github
        : profile.github_url;

    const resolvedPortfolio =
      incoming.portfolioUrl !== undefined
        ? incoming.portfolioUrl
        : incoming.portfolio_url !== undefined
        ? incoming.portfolio_url
        : incoming.portfolioLinks?.portfolio !== undefined
        ? incoming.portfolioLinks.portfolio
        : profile.portfolio_url;

    // Update candidate profile and user details atomically.
    const client = await getClient();
    let inTransaction = false;

    let updatedProfile: CandidateProfileRecord;
    let updatedUser = user;

    try {
      await client.query('BEGIN');
      inTransaction = true;

      const updateProfileSql = `
        UPDATE candidate_profiles
        SET
          headline = $1,
          summary = $2,
          skills = $3,
          experience_years = $4,
          current_company = $5,
          linkedin_url = $6,
          github_url = $7,
          portfolio_url = $8,
          location = $9,
          updated_at = NOW()
        WHERE id = $10
        RETURNING id, user_id, headline, summary, skills, experience_years,
                  current_company, location, linkedin_url, github_url,
                  portfolio_url, created_at, updated_at;
      `;

      const updatedProfileRes = await client.query(updateProfileSql, [
        resolvedHeadline,
        resolvedSummary,
        resolvedSkills,
        resolvedExperience,
        resolvedCurrentCompany,
        resolvedLinkedin,
        resolvedGithub,
        resolvedPortfolio,
        resolvedLocation,
        profile.id,
      ]);

      updatedProfile = updatedProfileRes.rows[0];

      if (!updatedProfile) {
        throw new Error('Candidate profile update returned no record.');
      }

      if (incoming.phone !== undefined || incoming.fullName !== undefined) {
        const updateUserSql = `
          UPDATE users
          SET
            phone = $1,
            full_name = $2,
            updated_at = NOW()
          WHERE id = $3
          RETURNING id, firebase_uid, email, full_name, role, phone, avatar_url, is_active;
        `;

        const updatedUserRes = await client.query(updateUserSql, [
          incoming.phone !== undefined ? incoming.phone : user.phone,
          incoming.fullName !== undefined ? incoming.fullName : user.full_name,
          user.id,
        ]);

        updatedUser = updatedUserRes.rows[0];

        if (!updatedUser) {
          throw new Error('User update returned no record.');
        }
      }

      await client.query('COMMIT');
      inTransaction = false;
    } catch (txError) {
      if (inTransaction) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[Candidate Profile Rollback Error]', rollbackError);
        }
      }

      throw txError;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      message: 'Candidate profile updated successfully',
      profile: formatProfileResponse(updatedUser, updatedProfile),
    });
  } catch (error: unknown) {
    console.error('[Update Candidate Profile Error]', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update candidate profile', statusCode: 500 },
    });
  }
}

/**
 * 3. POST /api/candidates/me/resume
 * Secure Resume Upload with magic-byte validation and SHA-256 metadata storage
 */
export async function uploadResume(req: Request, res: Response): Promise<void> {
  const file = req.file;

  if (!file) {
    res.status(400).json({
      success: false,
      error: { message: 'No resume file uploaded. Please attach a file under the "resume" field', statusCode: 400 },
    });
    return;
  }

  const uploadedPath = file.path;

  try {
    const uid = req.user?.uid;
    if (!uid) {
      // Clean up file if not authenticated
      if (fs.existsSync(uploadedPath)) {
        fs.unlinkSync(uploadedPath);
      }
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    // 1. Verify file exists on disk
    if (!fs.existsSync(uploadedPath)) {
      res.status(400).json({
        success: false,
        error: { message: 'Uploaded file could not be read from disk', statusCode: 400 },
      });
      return;
    }

    // 2. Read file content for magic-byte inspection and SHA-256 calculation
    const fileBuffer = await fs.promises.readFile(uploadedPath);
    const fileSizeBytes = fileBuffer.length;

    // Enforce 5 MB limit
    if (fileSizeBytes > storageConfig.maxUploadBytes) {
      await fs.promises.unlink(uploadedPath);
      res.status(400).json({
        success: false,
        error: {
          message: `File size (${fileSizeBytes} bytes) exceeds maximum allowed limit of ${storageConfig.maxUploadBytes} bytes (5 MB)`,
          statusCode: 400,
        },
      });
      return;
    }

    // 3. Inspect magic bytes header
    const detection = detectFileTypeFromMagicBytes(fileBuffer);
    if (!detection.isValid || !detection.detectedMimeType) {
      // Delete rejected file immediately
      await fs.promises.unlink(uploadedPath);
      res.status(400).json({
        success: false,
        error: {
          message: 'Invalid file format. Only valid PDF and DOCX files with verified magic-byte headers are accepted',
          statusCode: 400,
        },
      });
      return;
    }

    // 4. Delegate to production-grade resumeStorageService for deep OpenXML / PDF inspection & safe storage
    let storedResume;
    try {
      storedResume = await storeResume({
        originalFilename: file.originalname,
        mimeType: detection.detectedMimeType,
        buffer: fileBuffer,
      });
    } catch (storageErr: any) {
      if (fs.existsSync(uploadedPath)) {
        await fs.promises.unlink(uploadedPath);
      }
      res.status(400).json({
        success: false,
        error: {
          message: `Invalid file format. Only valid PDF and DOCX files with verified magic-byte headers are accepted: ${storageErr.message}`,
          statusCode: 400,
        },
      });
      return;
    }

    // Remove multer temporary upload now that storeResume has written the validated file
    if (fs.existsSync(uploadedPath)) {
      try {
        await fs.promises.unlink(uploadedPath);
      } catch {
        // ignore
      }
    }

    const finalPath = getSafeStoragePath(storedResume.storedFilename);

    // 5. Retrieve candidate profile to associate resume
    const data = await getOrCreateCandidateProfile(uid);
    if (!data) {
      if (fs.existsSync(finalPath)) {
        await fs.promises.unlink(finalPath);
      }
      res.status(404).json({
        success: false,
        error: { message: 'Candidate user record not found in database', statusCode: 404 },
      });
      return;
    }

    const { profile } = data;

    // 6. Store metadata in PostgreSQL resume_metadata table
    try {
      const insertSql = `
        INSERT INTO resume_metadata (
          candidate_id,
          file_name,
          stored_file_name,
          file_size,
          mime_type,
          sha256_hash,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, candidate_id, file_name, stored_file_name, file_size, mime_type, sha256_hash, created_at;
      `;
      const result = await query(insertSql, [
        profile.id,
        path.basename(file.originalname).substring(0, 255),
        storedResume.storedFilename,
        storedResume.size,
        storedResume.mimeType,
        storedResume.sha256,
      ]);
      const savedResume = result.rows[0];

      res.status(200).json({
        success: true,
        message: 'Resume uploaded and verified successfully',
        resume: {
          id: savedResume.id,
          candidateId: savedResume.candidate_id,
          fileName: savedResume.file_name,
          filename: savedResume.file_name,
          storedFileName: savedResume.stored_file_name,
          storagePath: savedResume.stored_file_name,
          fileSize: savedResume.file_size,
          fileSizeBytes: savedResume.file_size,
          mimeType: savedResume.mime_type,
          sha256Hash: savedResume.sha256_hash,
          createdAt: savedResume.created_at,
        },
      });
    } catch (dbError: unknown) {
      console.error('[Resume Metadata DB Error]', dbError);
      // Clean up uploaded file if database insert fails
      if (fs.existsSync(finalPath)) {
        await fs.promises.unlink(finalPath);
      }
      res.status(500).json({
        success: false,
        error: { message: 'Failed to record resume metadata in database', statusCode: 500 },
      });
    }
  } catch (error: unknown) {
    console.error('[Resume Upload Error]', error);
    if (fs.existsSync(uploadedPath)) {
      try {
        fs.unlinkSync(uploadedPath);
      } catch {
        // ignore unlink error
      }
    }
    res.status(500).json({
      success: false,
      error: { message: 'Unexpected error processing resume upload', statusCode: 500 },
    });
  }
}

