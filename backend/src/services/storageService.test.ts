import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { storageService } from './storageService';
import { storageConfig } from '../config/storage';

describe('Storage Service - Private Resume Storage & Integrity', () => {
  const testFilesToClean: string[] = [];

  afterAll(async () => {
    // Cleanup any temporary files created during tests
    for (const filename of testFilesToClean) {
      try {
        const filePath = path.join(storageConfig.uploadDir, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should generate UUID-based storage filenames preserving allowed extensions', () => {
    const pdfStored = storageService.generateStoredFileName('My Resume 2026.pdf');
    expect(pdfStored).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i);

    const docxStored = storageService.generateStoredFileName('Candidate_CV.docx');
    expect(docxStored).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.docx$/i);

    // Fallback: non-docx extensions fallback to .pdf
    const otherStored = storageService.generateStoredFileName('document.unknown');
    expect(otherStored).toMatch(/\.pdf$/i);
  });

  it('should accurately compute SHA-256 hash for buffer integrity', () => {
    const sampleBuffer = Buffer.from('PDF sample content for cryptographic verification');
    const expectedHash = crypto.createHash('sha256').update(sampleBuffer).digest('hex');

    const computedHash = storageService.calculateSha256(sampleBuffer);
    expect(computedHash).toBe(expectedHash);
  });

  it('should save resume file into private storage directory and return metadata', async () => {
    const fileContent = Buffer.from('%PDF-1.7 sample resume payload for candidate profile testing');
    const originalName = 'Sample_Resume.pdf';
    const mimeType = 'application/pdf';

    const result = await storageService.saveResumeFile(fileContent, originalName, mimeType);
    testFilesToClean.push(result.storedFileName);

    expect(result.storedFileName).toMatch(/\.pdf$/);
    expect(result.fileSizeBytes).toBe(fileContent.length);
    expect(result.mimeType).toBe(mimeType);
    expect(result.sha256Hash).toBe(storageService.calculateSha256(fileContent));

    // Verify file actually exists on disk
    expect(fs.existsSync(result.filePath)).toBe(true);
    const readOnDisk = await fs.promises.readFile(result.filePath);
    expect(readOnDisk.equals(fileContent)).toBe(true);
  });

  it('should reject path traversal in getFilePath and getFileStream', () => {
    expect(() => storageService.getFilePath('../etc/passwd')).toThrow('Directory traversal attempt detected');
    expect(() => storageService.getFilePath('..\\windows\\system32')).toThrow('Directory traversal attempt detected');
    expect(() => storageService.getFileStream('../../secret.env')).toThrow('Directory traversal attempt detected');
  });

  it('should safely delete stored file on disk', async () => {
    const fileContent = Buffer.from('Temporary file to verify deletion handler');
    const result = await storageService.saveResumeFile(fileContent, 'temp_file.pdf', 'application/pdf');

    expect(storageService.fileExists(result.storedFileName)).toBe(true);

    const deleted = await storageService.deleteResumeFile(result.storedFileName);
    expect(deleted).toBe(true);
    expect(storageService.fileExists(result.storedFileName)).toBe(false);
  });
});
