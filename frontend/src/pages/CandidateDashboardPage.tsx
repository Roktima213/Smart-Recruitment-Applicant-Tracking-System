import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  AlertCircle, 
  Globe, 
  Linkedin, 
  Github, 
  Plus, 
  X, 
  Save, 
  ShieldCheck, 
  FileCheck, 
  RefreshCw 
} from 'lucide-react';
import { useCandidateProfile, UpdateProfileInput } from '../hooks/useCandidateProfile';
import { useToast } from '../context/ToastContext';

export const CandidateDashboardPage: React.FC = () => {
  const {
    profile,
    resume,
    loading,
    saving,
    uploading,
    uploadProgress,
    updateProfile,
    uploadResume,
    fetchProfile,
  } = useCandidateProfile();

  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Form states
  const [headline, setHeadline] = useState('');
  const [summary, setSummary] = useState('');
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [currentCompany, setCurrentCompany] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');

  // Sync form inputs when profile loads
  useEffect(() => {
    if (profile) {
      setHeadline(profile.headline || '');
      setSummary(profile.summary || '');
      setExperienceYears(profile.experience_years || 0);
      setCurrentCompany(profile.current_company || '');
      setLinkedinUrl(profile.linkedin_url || '');
      setGithubUrl(profile.github_url || '');
      setPortfolioUrl(profile.portfolio_url || '');
      setSkills(profile.skills || []);
    }
  }, [profile]);

  const handleAddSkill = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      toast.info(`"${trimmed}" is already in your skills list.`);
      return;
    }
    setSkills([...skills, trimmed]);
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: UpdateProfileInput = {
      headline: headline || null,
      summary: summary || null,
      experience_years: Number(experienceYears) || 0,
      current_company: currentCompany || null,
      linkedin_url: linkedinUrl || null,
      github_url: githubUrl || null,
      portfolio_url: portfolioUrl || null,
      skills,
    };
    await updateProfile(payload);
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadResume(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await uploadResume(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            Verified Candidate Workspace
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate Profile & Application Center
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Maintain your professional profile, upload your verified resume, and manage open submissions.
          </p>
        </div>

        <button
          onClick={() => fetchProfile()}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-sm transition self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Profile
        </button>
      </div>

      {/* Main Grid: Profile Form (Left 2 Cols) & Resume Widget (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Comprehensive Profile Editor */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Professional Details</h2>
                <p className="text-xs text-slate-500">Provide accurate information to match with relevant openings.</p>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>

            {/* Headline & Current Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Professional Headline</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Full-Stack Engineer | React & Node.js"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Current / Most Recent Company</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp or Freelance"
                  value={currentCompany}
                  onChange={(e) => setCurrentCompany(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Years of Experience & Full Name info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Total Years of Experience</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(parseFloat(e.target.value) || 0)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Email Address (Synchronized)</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || 'Authenticated User'}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Summary / Bio */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Candidate Bio & Summary</label>
              <textarea
                rows={4}
                placeholder="Highlight your technical background, domain specializations, and career achievements..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
              />
            </div>

            {/* Interactive Skills Tag Input */}
            <div className="space-y-2.5">
              <label className="text-xs font-semibold text-slate-700">Technical Skills & Competencies</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a skill and press Enter (e.g. React, Docker, Python)"
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                />
                <button
                  type="button"
                  onClick={() => handleAddSkill()}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {/* Skills Tags Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {skills.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No skills added yet. Add relevant tags above.</span>
                ) : (
                  skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-medium"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-indigo-400 hover:text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Professional Links */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Online Presence & Links</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="relative">
                  <Linkedin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="LinkedIn Profile URL"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                  />
                </div>

                <div className="relative">
                  <Github className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="GitHub Profile URL"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                  />
                </div>

                <div className="relative">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="url"
                    placeholder="Portfolio or Website"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Defensive Resume Upload Dropzone & Document Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Master Resume</h2>
              <span className="text-[11px] font-semibold text-slate-400">PDF or DOCX</span>
            </div>

            {/* Current Resume Info Card (if exists) */}
            {resume ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate" title={resume.file_name}>
                      {resume.file_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {formatFileSize(resume.file_size)} • Uploaded {new Date(resume.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    SHA-256: {resume.sha256_hash.substring(0, 12)}...
                  </span>
                  <span className="font-semibold text-emerald-600">Verified</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>No verified resume on file. Upload your document below.</span>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                isDragging
                  ? 'border-brand-500 bg-brand-50/50'
                  : 'border-slate-300 hover:border-brand-400 bg-slate-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="space-y-3">
                <div className="w-12 h-12 bg-white text-brand-600 rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Click to upload or drag & drop
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Strict magic-byte checking • Max size 5 MB
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>Uploading & Verifying...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-600 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Guidance Alert */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">Security & Integrity Protections:</p>
              <p>Uploaded documents undergo byte-level header analysis and are isolated with random UUID keys.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboardPage;
