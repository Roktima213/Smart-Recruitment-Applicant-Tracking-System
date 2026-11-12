
import { randomUUID, createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import * as yauzl from 'yauzl';

import {
  storageConfig,
  ensureStorageDirectory,
  getSafeStoragePath,
} from '../config/storage';

export interface ResumeUploadInput {
  originalFilename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface StoredResume {
  id: string;
  originalFilename: string;
  storedFilename: string;
  mimeType: string;
  size: number;
  sha256: string;
}

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
};

const MAX_DOCX_ENTRIES = 1000;
const MAX_DOCX_ENTRY_SIZE = 10 * 1024 * 1024;
const MAX_DOCX_TOTAL_SIZE = 25 * 1024 * 1024;

async function hasValidDocxArchive(buffer: Buffer): Promise<boolean> {
  let zipfile: yauzl.ZipFile | undefined;

  try {
    zipfile = await yauzl.fromBufferPromise(buffer, {
      lazyEntries: true,
      decodeStrings: true,
      validateEntrySizes: true,
      strictFileNames: true,
    });

    let entryCount = 0;
    let totalUncompressedSize = 0;
    let hasContentTypes = false;
    let hasDocument = false;

    for await (const entry of zipfile.eachEntry()) {
      entryCount++;

      if (entryCount > MAX_DOCX_ENTRIES || entry.isEncrypted()) {
        return false;
      }

      if (yauzl.validateFileName(entry.fileName)) {
        return false;
      }

      if (entry.fileName === '[Content_Types].xml') {
        hasContentTypes = true;
      }

      if (entry.fileName === 'word/document.xml') {
        hasDocument = true;
      }

      if (entry.fileName.endsWith('/')) {
        continue;
      }

      if (entry.uncompressedSize > MAX_DOCX_ENTRY_SIZE) {
        return false;
      }

      totalUncompressedSize += entry.uncompressedSize;

      if (totalUncompressedSize > MAX_DOCX_TOTAL_SIZE) {
        return false;
      }

      const stream = await zipfile.openReadStreamPromise(entry);

      let actualEntrySize = 0;

      for await (const chunk of stream) {
        actualEntrySize += chunk.length;

        if (actualEntrySize > MAX_DOCX_ENTRY_SIZE) {
          return false;
        }
      }

      if (actualEntrySize !== entry.uncompressedSize) {
        return false;
      }
    }

    return hasContentTypes && hasDocument;
  } catch {
    return false;
  } finally {
    if (zipfile?.isOpen) {
      zipfile.close();
    }
  }
}

async function hasValidFileContent(
  buffer: Buffer,
  mimeType: string
): Promise<boolean> {
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 5).toString() === '%PDF-';
  }

  if (
    mimeType ===
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return hasValidDocxArchive(buffer);
  }

  return false;
}

export async function storeResume(
  input: ResumeUploadInput
): Promise<StoredResume> {
  if (!input || !Buffer.isBuffer(input.buffer)) {
    throw new Error('A valid resume file buffer is required');
  }

  if (input.buffer.length === 0) {
    throw new Error('Resume file cannot be empty');
  }

  if (input.buffer.length > storageConfig.maxUploadBytes) {
    throw new Error(
      `Resume exceeds the maximum allowed size of ${storageConfig.maxUploadBytes} bytes`
    );
  }

  if (
    !input.mimeType ||
    !storageConfig.allowedMimeTypes.includes(input.mimeType)
  ) {
    throw new Error('Unsupported resume file type');
  }

  if (!(await hasValidFileContent(input.buffer, input.mimeType))) {
    throw new Error('File content does not match the declared file type');
  }

  if (
    !input.originalFilename ||
    typeof input.originalFilename !== 'string' ||
    input.originalFilename.trim().length === 0
  ) {
    throw new Error('Original filename is required');
  }

  const id = randomUUID();
  const extension = MIME_EXTENSIONS[input.mimeType];
  const storedFilename = `${id}${extension}`;

  ensureStorageDirectory();

  const filePath = getSafeStoragePath(storedFilename);

  const sha256 = createHash('sha256')
    .update(input.buffer)
    .digest('hex');

  await fs.writeFile(filePath, input.buffer, {
    flag: 'wx',
    mode: 0o600,
  });

  const originalFilename = path.basename(
    input.originalFilename.replace(/\\/g, '/')
  );

  return {
    id,
    originalFilename,
    storedFilename,
    mimeType: input.mimeType,
    size: input.buffer.length,
    sha256,
  };
}
