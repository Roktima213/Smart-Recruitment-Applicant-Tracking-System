import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storageConfig, ensureStorageDirectory, getSafeStoragePath } from '../config/storage';

export interface StoredResumeResult {
  storedFileName: string;
  filePath: string;
  fileSizeBytes: number;
  sha256Hash: string;
  mimeType: string;
  // Aliases for compatibility
  fileName?: string;
  filename?: string;
  storedFilename?: string;
  filepath?: string;
  fileSize?: number;
  size?: number;
  sha256?: string;
}

export class StorageService {
  /**
   * Initializes storage directories upon startup.
   */
  public constructor() {
    ensureStorageDirectory();
  }

  /**
   * Generates a collision-resistant UUID filename preserving valid extension.
   */
  public generateStoredFileName(originalFilename: string): string {
    const ext = path.extname(originalFilename || '').toLowerCase();
    const sanitizedExt = ext === '.docx' ? '.docx' : '.pdf';
    const uniqueId = crypto.randomUUID();
    return `${uniqueId}${sanitizedExt}`;
  }

  /**
   * Computes SHA-256 cryptographic hash of buffer.
   */
  public calculateSha256(buffer: Buffer): string {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Valid buffer is required to compute SHA-256 hash');
    }
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Saves uploaded file buffer safely into private storage directory.
   */
  public async saveResumeFile(
    fileBuffer: Buffer,
    originalFilename: string = 'resume.pdf',
    mimeType: string = 'application/pdf'
  ): Promise<StoredResumeResult> {
    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('Valid file buffer is required to save resume');
    }

    if (fileBuffer.length === 0) {
      throw new Error('Cannot save empty file buffer');
    }

    if (fileBuffer.length > storageConfig.maxUploadBytes) {
      throw new Error(`File size exceeds maximum upload limit of ${storageConfig.maxUploadBytes} bytes`);
    }

    ensureStorageDirectory();

    const storedFileName = this.generateStoredFileName(originalFilename);
    const safePath = getSafeStoragePath(storedFileName);
    const sha256Hash = this.calculateSha256(fileBuffer);

    await fs.promises.writeFile(safePath, fileBuffer, { mode: 0o600 });

    return {
      storedFileName,
      filePath: safePath,
      fileSizeBytes: fileBuffer.length,
      sha256Hash,
      mimeType,
      fileName: originalFilename || storedFileName,
      filename: originalFilename || storedFileName,
      storedFilename: storedFileName,
      filepath: safePath,
      fileSize: fileBuffer.length,
      size: fileBuffer.length,
      sha256: sha256Hash,
    };
  }

  /**
   * Resolves safe absolute path to stored file, rejecting path traversal attempts.
   */
  public getFilePath(storedFileName: string): string {
    return getSafeStoragePath(storedFileName);
  }

  /**
   * Verifies file existence on disk.
   */
  public fileExists(storedFileName: string): boolean {
    try {
      const safePath = this.getFilePath(storedFileName);
      return fs.existsSync(safePath);
    } catch {
      return false;
    }
  }

  /**
   * Returns a readable stream to download/inspect a stored file.
   */
  public getFileStream(storedFileName: string): fs.ReadStream {
    const safePath = this.getFilePath(storedFileName);
    if (!fs.existsSync(safePath)) {
      throw new Error('Requested file not found in storage');
    }
    return fs.createReadStream(safePath);
  }

  /**
   * Safely deletes an existing file from disk.
   */
  public async deleteResumeFile(storedFileName: string): Promise<boolean> {
    try {
      const safePath = this.getFilePath(storedFileName);
      if (fs.existsSync(safePath)) {
        await fs.promises.unlink(safePath);
        return true;
      }
      return false;
    } catch (err: any) {
      if (err.message && err.message.includes('Directory traversal')) {
        throw err;
      }
      console.warn(`[StorageService] Failed to unlink file ${storedFileName}:`, err.message);
      return false;
    }
  }
}

export const storageService = new StorageService();

// Standalone function exports for direct functional imports
export const computeSha256 = (buffer: Buffer): string => storageService.calculateSha256(buffer);
export const calculateSha256 = (buffer: Buffer): string => storageService.calculateSha256(buffer);
export const saveResumeFile = (
  fileBuffer: Buffer,
  originalFilename: string = 'resume.pdf',
  mimeType: string = 'application/pdf'
): Promise<StoredResumeResult> => storageService.saveResumeFile(fileBuffer, originalFilename, mimeType);
export const getResumeStream = (storedFileName: string): fs.ReadStream => storageService.getFileStream(storedFileName);
export const deleteResumeFile = (storedFileName: string): Promise<boolean> => storageService.deleteResumeFile(storedFileName);
export const resumeFileExists = (storedFileName: string): boolean => storageService.fileExists(storedFileName);

export default storageService;
