
/// <reference types="jest" />

import { createHash } from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import * as yazl from 'yazl';

import { storageConfig } from '../config/storage';
import { storeResume } from './resumeStorageService';

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('Resume Storage Service', () => {
  let temporaryDirectory: string;
  let originalUploadDir: string;
  let originalMaxUploadBytes: number;

  beforeEach(async () => {
    originalUploadDir = storageConfig.uploadDir;
    originalMaxUploadBytes = storageConfig.maxUploadBytes;

    temporaryDirectory = await fs.mkdtemp(
      path.join(os.tmpdir(), 'resume-storage-test-')
    );

    storageConfig.uploadDir = temporaryDirectory;
    storageConfig.maxUploadBytes = 5 * 1024 * 1024;
  });

  afterEach(async () => {
    storageConfig.uploadDir = originalUploadDir;
    storageConfig.maxUploadBytes = originalMaxUploadBytes;

    await fs.rm(temporaryDirectory, { recursive: true, force: true });
  });

  const validPdfBuffer = Buffer.from('%PDF-1.7\nTest resume content');

  async function createZipBuffer(
    entries: Array<{
      name: string;
      content: string;
      compress?: boolean;
    }>
  ): Promise<Buffer> {
    const zipFile = new yazl.ZipFile();

    for (const entry of entries) {
      zipFile.addBuffer(Buffer.from(entry.content), entry.name, {
        compress: entry.compress ?? false,
      });
    }

    zipFile.end();

    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      zipFile.outputStream.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      zipFile.outputStream.on('error', reject);

      zipFile.outputStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  async function createValidDocxBuffer(): Promise<Buffer> {
    return createZipBuffer([
      {
        name: '[Content_Types].xml',
        content: '<?xml version="1.0"?><Types></Types>',
      },
      {
        name: 'word/document.xml',
        content: '<?xml version="1.0"?><document></document>',
      },
    ]);
  }

  it('should store a valid PDF using a UUID filename', async () => {
    const result = await storeResume({
      originalFilename: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: validPdfBuffer,
    });

    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    expect(result.storedFilename).toBe(`${result.id}.pdf`);
    expect(result.originalFilename).toBe('resume.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.size).toBe(validPdfBuffer.length);

    const savedFile = await fs.readFile(
      path.join(temporaryDirectory, result.storedFilename)
    );

    expect(savedFile.equals(validPdfBuffer)).toBe(true);
  });

  it('should calculate the correct SHA-256 hash', async () => {
    const result = await storeResume({
      originalFilename: 'resume.pdf',
      mimeType: 'application/pdf',
      buffer: validPdfBuffer,
    });

    const expectedHash = createHash('sha256')
      .update(validPdfBuffer)
      .digest('hex');

    expect(result.sha256).toBe(expectedHash);
  });

  it('should store a DOCX archive containing the required entries', async () => {
    const docxBuffer = await createValidDocxBuffer();

    const result = await storeResume({
      originalFilename: 'resume.docx',
      mimeType: DOCX_MIME,
      buffer: docxBuffer,
    });

    expect(result.storedFilename).toBe(`${result.id}.docx`);
    expect(result.mimeType).toBe(DOCX_MIME);
  });

  it('should reject a malformed DOCX archive', async () => {
    await expect(
      storeResume({
        originalFilename: 'resume.docx',
        mimeType: DOCX_MIME,
        buffer: Buffer.from('PK but not a valid ZIP archive'),
      })
    ).rejects.toThrow('File content does not match the declared file type');
  });

  it('should reject a ZIP archive missing the Word document', async () => {
    const docxBuffer = await createZipBuffer([
      {
        name: '[Content_Types].xml',
        content: '<Types></Types>',
      },
    ]);

    await expect(
      storeResume({
        originalFilename: 'resume.docx',
        mimeType: DOCX_MIME,
        buffer: docxBuffer,
      })
    ).rejects.toThrow('File content does not match the declared file type');
  });

  it('should reject a ZIP archive missing content types', async () => {
    const docxBuffer = await createZipBuffer([
      {
        name: 'word/document.xml',
        content: '<document></document>',
      },
    ]);

    await expect(
      storeResume({
        originalFilename: 'resume.docx',
        mimeType: DOCX_MIME,
        buffer: docxBuffer,
      })
    ).rejects.toThrow('File content does not match the declared file type');
  });

  it('should reject a DOCX archive with too many entries', async () => {
    const entries = [
      {
        name: '[Content_Types].xml',
        content: '<Types></Types>',
      },
      {
        name: 'word/document.xml',
        content: '<document></document>',
      },
      ...Array.from({ length: 999 }, (_, index) => ({
        name: `extra/file-${index}.xml`,
        content: '<file></file>',
      })),
    ];

    const docxBuffer = await createZipBuffer(entries);

    await expect(
      storeResume({
        originalFilename: 'resume.docx',
        mimeType: DOCX_MIME,
        buffer: docxBuffer,
      })
    ).rejects.toThrow('File content does not match the declared file type');
  });

  it('should reject a DOCX entry exceeding the uncompressed size limit', async () => {
    const largeContent = 'A'.repeat(11 * 1024 * 1024);

    const docxBuffer = await createZipBuffer([
      {
        name: '[Content_Types].xml',
        content: '<Types></Types>',
      },
      {
        name: 'word/document.xml',
        content: largeContent,
        compress: true,
      },
    ]);

    await expect(
      storeResume({
        originalFilename: 'resume.docx',
        mimeType: DOCX_MIME,
        buffer: docxBuffer,
      })
    ).rejects.toThrow('File content does not match the declared file type');
  });

  it('should reject a DOCX archive exceeding the total uncompressed size limit', async () => {
    const docxBuffer = await createZipBuffer([
      {
        name: '[Content_Types].xml',
        content: '<Types></Types>',
      },
      {
        name: 'word/document.xml',
        content: '<document></document>',
      },
      {
        name: 'extra/file-1.xml',
        content: 'A'.repeat(9 * 1024 * 1024),
        compress: true,
      },
      {
        name: 'extra/file-2.xml',
        content: 'B'.repeat(9 * 1024 * 1024),
        compress: true,
      },
      {
        name: 'extra/file-3.xml',
        content: 'C'.repeat(9 * 1024 * 1024),
        compress: true,
      },
    ]);

    await expect(
      storeResume({
        originalFilename: 'resume.docx',
        mimeType: DOCX_MIME,
        buffer: docxBuffer,
      })
    ).rejects.toThrow(
      'File content does not match the declared file type'
    );
  });

  it('should reject an empty file', async () => {
    await expect(
      storeResume({
        originalFilename: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(0),
      })
    ).rejects.toThrow('Resume file cannot be empty');
  });

  it('should reject an unsupported MIME type', async () => {
    await expect(
      storeResume({
        originalFilename: 'resume.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('test'),
      })
    ).rejects.toThrow('Unsupported resume file type');
  });

  it('should reject a file with an invalid PDF signature', async () => {
    await expect(
      storeResume({
        originalFilename: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('This is not a PDF'),
      })
    ).rejects.toThrow('File content does not match the declared file type');
  });

  it('should reject a file larger than the configured limit', async () => {
    storageConfig.maxUploadBytes = 10;

    await expect(
      storeResume({
        originalFilename: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.7 This file is too large'),
      })
    ).rejects.toThrow('Resume exceeds the maximum allowed size');
  });

  it('should reject a missing original filename', async () => {
    await expect(
      storeResume({
        originalFilename: '   ',
        mimeType: 'application/pdf',
        buffer: validPdfBuffer,
      })
    ).rejects.toThrow('Original filename is required');
  });

  it('should reject an invalid buffer', async () => {
    await expect(
      storeResume({
        originalFilename: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: 'not-a-buffer' as unknown as Buffer,
      })
    ).rejects.toThrow('A valid resume file buffer is required');
  });

  it('should store only the basename of the original filename', async () => {
    const result = await storeResume({
      originalFilename: 'C:\\Users\\Candidate\\resume.pdf',
      mimeType: 'application/pdf',
      buffer: validPdfBuffer,
    });

    expect(result.originalFilename).toBe('resume.pdf');
  });
});
