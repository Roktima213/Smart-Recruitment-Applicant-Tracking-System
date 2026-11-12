import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  RefreshCw,
  Trash2,
  Calendar,
  HardDrive,
  ShieldCheck,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

export interface ResumeDocument {
  id: string;
  fileName: string;
  fileSize: number; // in bytes
  mimeType: string;
  uploadedAt: string;
  status: 'ACTIVE' | 'VERIFIED' | 'UNDER_REVIEW' | 'PARSED';
  atsScore?: number;
  extractedSkills?: string[];
  pageCount?: number;
  sha256Hash?: string;
  downloadUrl?: string;
}

export interface DocumentPreviewCardProps {
  resume: ResumeDocument;
  onReplaceClick: () => void;
  onDeleteClick: () => void;
  onDownloadClick?: () => void;
  isReplacing?: boolean;
  className?: string;
}

export const DocumentPreviewCard: React.FC<DocumentPreviewCardProps> = ({
  resume,
  onReplaceClick,
  onDeleteClick,
  onDownloadClick,
  isReplacing = false,
  className = '',
}) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Format bytes into readable string (KB / MB)
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format ISO or date string into human readable date
  const formatUploadedDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  const isPdf = resume.fileName.toLowerCase().endsWith('.pdf') || resume.mimeType.includes('pdf');
  const isDocx =
    resume.fileName.toLowerCase().endsWith('.docx') ||
    resume.mimeType.includes('word') ||
    resume.mimeType.includes('officedocument');

  const handleDownload = () => {
    if (onDownloadClick) {
      onDownloadClick();
      return;
    }

    // Default browser fallback download simulation
    const blob = new Blob(
      [
        `Candidate Resume File: ${resume.fileName}\nUploaded: ${resume.uploadedAt}\nChecksum: ${
          resume.sha256Hash || 'verified-sha256'
        }`,
      ],
      { type: resume.mimeType || 'application/octet-stream' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = resume.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Document Card Container */}
      <div
        className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all overflow-hidden ${className}`}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-700 tracking-wide uppercase">
              Current Active Resume
            </span>
          </div>
          <Badge variant="success" size="sm" dot>
            {resume.status === 'ACTIVE' || resume.status === 'VERIFIED'
              ? 'Verified & Active'
              : resume.status}
          </Badge>
        </div>

        {/* Main Content Info */}
        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            {/* File Icon & Names */}
            <div className="flex items-start gap-4">
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  isPdf
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                <FileText className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg break-all">
                  {resume.fileName}
                </h3>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                    {formatFileSize(resume.fileSize)}
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {formatUploadedDate(resume.uploadedAt)}
                  </span>
                  {resume.pageCount && (
                    <>
                      <span>•</span>
                      <span>{resume.pageCount} page(s)</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick ATS Readiness Pill */}
            {resume.atsScore && (
              <div className="flex items-center sm:flex-col sm:items-end justify-between bg-emerald-50/70 border border-emerald-200/80 rounded-xl px-3.5 py-2 shrink-0">
                <span className="text-2xs font-semibold text-emerald-800 uppercase tracking-wider">
                  ATS Match Score
                </span>
                <span className="text-lg font-extrabold text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  {resume.atsScore}%
                </span>
              </div>
            )}
          </div>

          {/* Parsed Skills Snapshot */}
          {resume.extractedSkills && resume.extractedSkills.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-brand-600" />
                  Auto-Detected Resume Skills ({resume.extractedSkills.length})
                </span>
                <span className="text-2xs text-slate-400">Parsed by SmartATS Engine</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {resume.extractedSkills.slice(0, 8).map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
                  >
                    {skill}
                  </span>
                ))}
                {resume.extractedSkills.length > 8 && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200/60">
                    +{resume.extractedSkills.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsPreviewOpen(true)}
                leftIcon={<Eye className="w-3.5 h-3.5" />}
              >
                Preview Resume
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Download
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onReplaceClick}
                isLoading={isReplacing}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Replace
              </Button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Remove
            </Button>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. Modal: Document Preview Modal */}
      {/* --------------------------------------------------------------------- */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Document Preview"
        subtitle={resume.fileName}
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SHA-256 Hash Verified</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownload} leftIcon={<Download className="w-3.5 h-3.5" />}>
                Download Document
              </Button>
              <Button variant="primary" size="sm" onClick={() => setIsPreviewOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Document Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
            <div>
              <p className="text-2xs uppercase font-semibold text-slate-400">File Type</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {isPdf ? 'Adobe PDF Document' : isDocx ? 'Microsoft Word' : 'Document'}
              </p>
            </div>
            <div>
              <p className="text-2xs uppercase font-semibold text-slate-400">File Size</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{formatFileSize(resume.fileSize)}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-semibold text-slate-400">Uploaded Date</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{formatUploadedDate(resume.uploadedAt)}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-semibold text-slate-400">ATS Readiness</p>
              <p className="text-xs font-bold text-emerald-600 mt-0.5">
                {resume.atsScore ? `${resume.atsScore}% Score` : 'Parsed & Active'}
              </p>
            </div>
          </div>

          {/* Simulated Resume Document Canvas */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6 sm:p-8 shadow-inner space-y-6 max-h-[480px] overflow-y-auto font-sans">
            {/* Candidate Resume Header */}
            <div className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                  Rekha (Candidate)
                </h2>
                <p className="text-sm font-semibold text-brand-600 mt-0.5">
                  Senior Full Stack & Frontend Engineer
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  rekha@example.com • +1 (555) 234-5678 • San Francisco, CA • Open to Remote
                </p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  Verified Candidate
                </span>
              </div>
            </div>

            {/* Resume Summary Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Professional Summary
              </h4>
              <p className="text-xs text-slate-700 leading-relaxed">
                Passionate software engineer with 5+ years of experience building modern scalable web
                applications. Expert in TypeScript, React, Node.js, and cloud platforms. Proven track
                record of delivering high-performance UIs, robust backend microservices, and clean
                maintainable code in collaborative agile environments.
              </p>
            </div>

            {/* Resume Parsed Skills Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Extracted Skills & Competencies
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {(resume.extractedSkills || [
                  'React',
                  'TypeScript',
                  'JavaScript',
                  'Tailwind CSS',
                  'Node.js',
                  'PostgreSQL',
                  'Docker',
                  'REST APIs',
                  'Git',
                  'Vite',
                ]).map((skill, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Resume Work Experience Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Work History
              </h4>
              <div className="space-y-3">
                <div className="border-l-2 border-brand-500 pl-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">Senior Frontend Engineer</span>
                    <span className="text-slate-400">2023 — Present</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">TechCorp Labs • Full-time</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Architected enterprise web portals using React, TypeScript, and Tailwind CSS.
                    Enhanced user engagement by 40% and reduced page load times by 35%.
                  </p>
                </div>

                <div className="border-l-2 border-slate-300 pl-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-900">Software Engineer</span>
                    <span className="text-slate-400">2021 — 2023</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">CloudPulse Systems • Full-time</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Built interactive dashboard widgets, REST APIs, and automated CI/CD deployment pipelines.
                  </p>
                </div>
              </div>
            </div>

            {/* Resume Education Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Education</h4>
              <div className="text-xs">
                <p className="font-bold text-slate-900">B.S. in Computer Science & Engineering</p>
                <p className="text-slate-500">Graduated with Honors • 2017 — 2021</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* --------------------------------------------------------------------- */}
      {/* 2. Modal: Delete Resume Confirmation Modal */}
      {/* --------------------------------------------------------------------- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Remove Current Resume?"
        subtitle="This will detach your active resume from future applications."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setIsDeleteModalOpen(false);
                onDeleteClick();
              }}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              Confirm Remove
            </Button>
          </div>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-sm text-slate-600">
            Are you sure you want to remove <span className="font-semibold text-slate-900">{resume.fileName}</span>?
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Note: You will need to upload a new resume (PDF or DOCX, under 5 MB) to submit new job applications.
          </div>
        </div>
      </Modal>
    </>
  );
};
