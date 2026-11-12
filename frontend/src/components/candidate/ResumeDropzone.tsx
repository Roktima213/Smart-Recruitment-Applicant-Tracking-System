import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ResumeDropzoneProps {
  onFileSelect: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
  errorMessage?: string | null;
  onClearError?: () => void;
  disabled?: boolean;
  className?: string;
}

export const ResumeDropzone: React.FC<ResumeDropzoneProps> = ({
  onFileSelect,
  isUploading = false,
  uploadProgress = 0,
  errorMessage = null,
  onClearError,
  disabled = false,
  className = '',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const dragCounterRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Maximum allowed file size: 5 MB in bytes (5 * 1024 * 1024 = 5,242,880 bytes)
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ];

  // Validate file against size (< 5 MB) and format (PDF / DOCX only)
  const validateAndProcessFile = useCallback(
    (file: File) => {
      setValidationError(null);
      if (onClearError) onClearError();

      const fileName = file.name.toLowerCase();
      const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
      const hasValidMime = ALLOWED_MIME_TYPES.includes(file.type) || hasValidExt;

      // 1. Validate File Format
      if (!hasValidExt && !hasValidMime) {
        const errorMsg = `Invalid file format (${fileName.split('.').pop() || 'unknown'}). Only PDF and DOCX files are supported.`;
        setValidationError(errorMsg);
        return false;
      }

      // 2. Validate File Size (< 5 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const errorMsg = `File size (${sizeMb} MB) exceeds the 5 MB maximum limit. Please upload a smaller file.`;
        setValidationError(errorMsg);
        return false;
      }

      // Validated successfully
      onFileSelect(file);
      return true;
    },
    [onFileSelect, onClearError]
  );

  // Drag and Drop Event Handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0 && !disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isUploading) {
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndProcessFile(droppedFile);
      e.dataTransfer.clearData();
    }
  };

  // File Picker Fallback Handlers
  const handleBrowseClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndProcessFile(selectedFile);
      // Reset input value so re-selecting the same file triggers change
      e.target.value = '';
    }
  };

  const activeError = validationError || errorMessage;

  return (
    <div className={`w-full ${className}`}>
      {/* Hidden File Input for fallback selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
        className="hidden"
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
        aria-label="Upload Resume File"
      />

      {/* Main Drag-and-Drop Surface */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        tabIndex={disabled || isUploading ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !isUploading) {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        className={`relative border-2 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-200 select-none ${
          isDragOver
            ? 'border-brand-600 bg-brand-50/80 ring-4 ring-brand-100 scale-[1.01]'
            : activeError
            ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
            : isUploading
            ? 'border-brand-300 bg-slate-50 cursor-wait'
            : 'border-dashed border-slate-300 hover:border-brand-500 bg-slate-50/60 hover:bg-brand-50/30 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
        } ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
      >
        {isUploading ? (
          /* Uploading Progress State */
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-brand-50 border-2 border-brand-200 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-slate-900">
                Uploading & Parsing Resume...
              </h4>
              <p className="text-xs text-slate-500">
                Extracting candidate contact, skills, and work history ({uploadProgress}%)
              </p>
            </div>
            {/* Visual Progress Bar */}
            <div className="w-full max-w-xs bg-slate-200 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-brand-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : isDragOver ? (
          /* Active Dragging Over State */
          <div className="flex flex-col items-center justify-center py-4 space-y-3 pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg animate-bounce">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-brand-700">Drop your resume here</h4>
              <p className="text-xs text-brand-600 font-medium">Release to start instant upload</p>
            </div>
          </div>
        ) : (
          /* Inactive / Ready to Upload State */
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-brand-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <p className="text-base font-semibold text-slate-900">
                <span className="text-brand-600 hover:text-brand-700 underline decoration-brand-400 font-bold">
                  Click to browse
                </span>{' '}
                or drag & drop your resume file here
              </p>
              <p className="text-xs text-slate-500">
                Support for ATS-friendly PDF and DOCX files up to 5 MB
              </p>
            </div>

            {/* Badges / Guideline Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                PDF (.pdf)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <FileText className="w-3.5 h-3.5 text-blue-500" />
                Word (.docx)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Max Size: &lt; 5 MB
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
              className="mt-2 text-xs"
            >
              Select Resume File
            </Button>
          </div>
        )}
      </div>

      {/* Validation Error Message */}
      {activeError && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-rose-900">Upload Validation Error</p>
            <p className="text-xs text-rose-700 mt-0.5">{activeError}</p>
          </div>
          {onClearError && (
            <button
              type="button"
              onClick={onClearError}
              className="text-rose-500 hover:text-rose-700 text-xs font-bold px-1"
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
};
