import path from 'path';
import fs from 'fs';
import { storageConfig, ensureStorageDirectory, getSafeStoragePath } from './storage';

describe('Storage Configuration & Path Traversal Hardening', () => {
  it('should have valid storageConfig defaults', () => {
    expect(storageConfig).toBeDefined();
    expect(storageConfig.uploadDir).toBeDefined();
    expect(storageConfig.maxUploadBytes).toBeGreaterThan(0);
    expect(storageConfig.allowedMimeTypes).toContain('application/pdf');
  });

  it('ensureStorageDirectory should ensure upload directory exists without throwing', () => {
    expect(() => ensureStorageDirectory()).not.toThrow();
    expect(fs.existsSync(storageConfig.uploadDir)).toBe(true);
  });

  it('getSafeStoragePath should resolve valid filenames inside uploadDir', () => {
    const filename = 'resume-12345.pdf';
    const safePath = getSafeStoragePath(filename);
    const expected = path.resolve(storageConfig.uploadDir, filename);

    expect(safePath).toBe(expected);
  });

  it('getSafeStoragePath should throw error for path traversal attempts with ..', () => {
    expect(() => getSafeStoragePath('../../../etc/passwd')).toThrow();
    expect(() => getSafeStoragePath('..\\..\\windows\\system32')).toThrow();
  });

  it('getSafeStoragePath should strip null bytes safely', () => {
    const malicious = 'safe-file.pdf\0.exe';
    const safePath = getSafeStoragePath(malicious);
    expect(safePath).toContain('safe-file.pdf.exe');
  });

  it('getSafeStoragePath should throw error for empty or invalid filename inputs', () => {
    expect(() => getSafeStoragePath('')).toThrow('Filename must be a non-empty string');
    expect(() => getSafeStoragePath(null as any)).toThrow();
    expect(() => getSafeStoragePath('   ')).toThrow();
  });
});
