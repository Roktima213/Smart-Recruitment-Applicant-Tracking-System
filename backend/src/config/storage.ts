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
  if (!fs.existsSync(storageConfig.uploadDir)) {
    fs.mkdirSync(storageConfig.uploadDir, { recursive: true, mode: 0o700 });
  }
}
