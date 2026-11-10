import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export interface StorageConfig {
  uploadDir: string;
  maxUploadBytes: number;
  allowedMimeTypes: string[];
}

const resolvedUploadDir = path.resolve(process.env.UPLOAD_DIR || '../uploads');
const maxUploadBytes = Number(process.env.MAX_UPLOAD_BYTES) || 5242880; // 5 MB default

export const storageConfig: StorageConfig = {
  uploadDir: resolvedUploadDir,
  maxUploadBytes,
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};

/**
 * Ensures the private storage directory exists with write permissions.
 */
export function ensureStorageDirectory(): void {
  try {
    if (!fs.existsSync(storageConfig.uploadDir)) {
      fs.mkdirSync(storageConfig.uploadDir, { recursive: true, mode: 0o700 });
    }
  } catch (err: any) {
    console.error(`[Storage Error] Failed to create storage directory at ${storageConfig.uploadDir}:`, err.message);
  }
}

// Ensure storage directory exists on module load
ensureStorageDirectory();

/**
 * Resolves a safe file path within the upload directory, preventing path traversal attacks.
 * Disallows null bytes, leading/trailing slashes, and relative '..' components.
 */
export function getSafeStoragePath(filename: string): string {
  if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
    throw new Error('Filename must be a non-empty string');
  }

  // Guard against path traversal sequences and separators
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Directory traversal attempt detected');
  }

  // Strip null bytes and normalize
  const sanitized = filename.replace(/\0/g, '').trim();
  const basename = path.basename(sanitized);

  if (!basename || basename === '.' || basename === '..') {
    throw new Error('Invalid filename for storage');
  }

  const baseDir = path.resolve(storageConfig.uploadDir);
  const resolved = path.resolve(baseDir, basename);

  // Guard against traversal outside upload directory
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Directory traversal attempt detected');
  }

  return resolved;
}
