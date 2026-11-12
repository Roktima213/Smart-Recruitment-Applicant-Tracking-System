import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Phone,
  Plus,
  X,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Building,
  Calendar,
  MapPin,
  Linkedin,
  Github,
  Globe,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export interface CandidateProfileData {
  fullName: string;
  headline: string;
  phoneNumber: string;
  summary: string;
  skills: string[];
  currentCompany?: string;
  experienceYears?: number | string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export interface ProfileEditorProps {
  initialData: CandidateProfileData;
  onSave: (data: CandidateProfileData) => Promise<void> | void;
  isSaving?: boolean;
  onCancel?: () => void;
  className?: string;
}

const POPULAR_SKILLS = [
  'React',
  'TypeScript',
  'Node.js',
  'JavaScript',
  'Python',
  'Tailwind CSS',
  'PostgreSQL',
  'Docker',
  'AWS',
  'GraphQL',
  'Next.js',
  'Git & CI/CD',
  'REST APIs',
  'MongoDB',
  'Kubernetes',
];

export const ProfileEditor: React.FC<ProfileEditorProps> = ({
  initialData,
  onSave,
  isSaving = false,
  onCancel,
  className = '',
}) => {
  const [formData, setFormData] = useState<CandidateProfileData>({ ...initialData });
  const [skillInput, setSkillInput] = useState('');
  const [skillWarning, setSkillWarning] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setFormData({ ...initialData });
    setIsDirty(false);
  }, [initialData]);

  // Handle generic text input changes
  const handleInputChange = (field: keyof CandidateProfileData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Interactive Skills Tag Input Logic
  // ---------------------------------------------------------------------------
  const addSkill = (rawSkill: string) => {
    setSkillWarning(null);
    const trimmed = rawSkill.trim();
    if (!trimmed) return;

    // Support comma-separated batch input (e.g. "React, Node.js, AWS")
    const newItems = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const currentSkillsLower = formData.skills.map((s) => s.toLowerCase());
    const validToAdd: string[] = [];

    for (const item of newItems) {
      if (currentSkillsLower.includes(item.toLowerCase())) {
        setSkillWarning(`"${item}" is already added to your skills.`);
        continue;
      }
      if (formData.skills.length + validToAdd.length >= 30) {
        setSkillWarning('Maximum 30 skills limit reached.');
        break;
      }
      validToAdd.push(item);
    }

    if (validToAdd.length > 0) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, ...validToAdd],
      }));
      setIsDirty(true);
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkillWarning(null);
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
    setIsDirty(true);
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === ',' && skillInput.trim()) {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  // ---------------------------------------------------------------------------
  // Validation and Form Submit
  // ---------------------------------------------------------------------------
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    }

    if (!formData.headline.trim()) {
      newErrors.headline = 'Professional Headline is required.';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone Number is required.';
    } else {
      // Basic phone format check: allows international + signs, parentheses, hyphens, and digits
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,16}$/;
      if (!phoneRegex.test(formData.phoneNumber.trim())) {
        newErrors.phoneNumber = 'Please enter a valid phone number (e.g. +1 555-019-2834).';
      }
    }

    if (!formData.summary.trim()) {
      newErrors.summary = 'Summary / bio is required.';
    } else if (formData.summary.trim().length < 20) {
      newErrors.summary = 'Summary should be at least 20 characters.';
    }

    if (formData.skills.length === 0) {
      newErrors.skills = 'Please add at least one relevant skill.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await onSave(formData);
    setIsDirty(false);
  };

  const handleReset = () => {
    setFormData({ ...initialData });
    setSkillInput('');
    setSkillWarning(null);
    setErrors({});
    setIsDirty(false);
    if (onCancel) onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-8 ${className}`}
    >
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Candidate Profile Editor</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Keep your credentials, contact information, and core technical skills up to date.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="px-2.5 py-1 rounded-full text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
              ● Unsaved Changes
            </span>
          )}
        </div>
      </div>

      {/* Section 1: Core Contact & Profile Information */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-brand-600" />
          General & Contact Details
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <Input
            label="Full Name *"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="e.g. Rekha Sharma"
            leftIcon={<User className="w-4 h-4" />}
            error={errors.fullName}
          />

          {/* Professional Headline */}
          <Input
            label="Professional Headline *"
            value={formData.headline}
            onChange={(e) => handleInputChange('headline', e.target.value)}
            placeholder="e.g. Senior Full Stack Engineer | React, TypeScript & Node.js"
            leftIcon={<Briefcase className="w-4 h-4" />}
            error={errors.headline}
            helperText="Appears under your name on applications & recruiter search"
          />

          {/* Phone Number */}
          <Input
            label="Phone Number *"
            value={formData.phoneNumber}
            onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
            placeholder="+1 (555) 234-5678"
            leftIcon={<Phone className="w-4 h-4" />}
            error={errors.phoneNumber}
            helperText="Include country code for interview scheduling"
          />

          {/* Location */}
          <Input
            label="Location"
            value={formData.location || ''}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="e.g. San Francisco, CA (Open to Remote)"
            leftIcon={<MapPin className="w-4 h-4" />}
          />

          {/* Current Company */}
          <Input
            label="Current Company"
            value={formData.currentCompany || ''}
            onChange={(e) => handleInputChange('currentCompany', e.target.value)}
            placeholder="e.g. TechCorp Labs"
            leftIcon={<Building className="w-4 h-4" />}
          />

          {/* Experience Years */}
          <Input
            label="Total Experience (Years)"
            type="number"
            step="0.5"
            min="0"
            max="40"
            value={formData.experienceYears ?? ''}
            onChange={(e) => handleInputChange('experienceYears', e.target.value)}
            placeholder="e.g. 5.5"
            leftIcon={<Calendar className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Section 2: Summary / Bio */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="candidate-bio" className="block text-sm font-medium text-slate-700">
            Professional Summary / Bio *
          </label>
          <span
            className={`text-2xs font-mono ${
              formData.summary.length > 750 ? 'text-rose-600 font-bold' : 'text-slate-400'
            }`}
          >
            {formData.summary.length} / 800 chars
          </span>
        </div>
        <textarea
          id="candidate-bio"
          rows={4}
          maxLength={800}
          value={formData.summary}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          placeholder="Write a concise overview of your background, key technical strengths, notable projects, and what you are looking for in your next role..."
          className={`w-full rounded-lg border text-sm p-3.5 focus:outline-none focus:ring-2 transition-colors ${
            errors.summary
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900 placeholder-rose-300'
              : 'border-slate-300 focus:border-brand-500 focus:ring-brand-200 text-slate-900 placeholder-slate-400'
          }`}
        />
        {errors.summary ? (
          <p className="text-xs text-rose-600">{errors.summary}</p>
        ) : (
          <p className="text-xs text-slate-500">
            A strong 2-4 sentence summary increases recruiter response rates by up to 60%.
          </p>
        )}
      </div>

      {/* Section 3: Interactive Skills Tag Input */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Interactive Skills & Technologies *
            </label>
            <p className="text-xs text-slate-500">
              Add skills matching your experience. Press Enter, comma, or click 'Add' to tag.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {formData.skills.length} / 30 skills added
          </span>
        </div>

        {/* Input Box with Add Button */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder="e.g. React, TypeScript, GraphQL, Docker..."
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => addSkill(skillInput)}
            disabled={!skillInput.trim()}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Skill
          </Button>
        </div>

        {/* Skill Warning or Validation Error */}
        {skillWarning && (
          <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {skillWarning}
          </p>
        )}
        {errors.skills && <p className="text-xs text-rose-600">{errors.skills}</p>}

        {/* Active Added Skills Tags */}
        <div className="min-h-[46px] p-3 rounded-xl bg-slate-50/80 border border-slate-200 flex flex-wrap gap-2 items-center">
          {formData.skills.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No skills added yet. Use the field above or click popular suggestions below.
            </span>
          ) : (
            formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200 shadow-2xs group hover:bg-brand-100 transition-colors"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-brand-200 text-brand-600 hover:text-brand-800 transition-colors"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Suggested / Popular Skills Quick-Add Pills */}
        <div className="space-y-1.5 pt-1">
          <span className="text-2xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Quick-Add Popular Tech Skills:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_SKILLS.filter(
              (popSkill) => !formData.skills.map((s) => s.toLowerCase()).includes(popSkill.toLowerCase())
            ).map((popSkill) => (
              <button
                key={popSkill}
                type="button"
                onClick={() => addSkill(popSkill)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
              >
                <Plus className="w-3 h-3 text-slate-400" />
                {popSkill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 4: Web Links & Portfolio */}
      <div className="space-y-4 pt-2 border-t border-slate-100">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-brand-600" />
          Links & Online Presence
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="LinkedIn Profile"
            value={formData.linkedinUrl || ''}
            onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
            placeholder="https://linkedin.com/in/..."
            leftIcon={<Linkedin className="w-4 h-4 text-blue-600" />}
          />

          <Input
            label="GitHub Profile"
            value={formData.githubUrl || ''}
            onChange={(e) => handleInputChange('githubUrl', e.target.value)}
            placeholder="https://github.com/..."
            leftIcon={<Github className="w-4 h-4 text-slate-800" />}
          />

          <Input
            label="Portfolio / Website"
            value={formData.portfolioUrl || ''}
            onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
            placeholder="https://yourportfolio.dev"
            leftIcon={<Globe className="w-4 h-4 text-emerald-600" />}
          />
        </div>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Profile changes reflect across all active and future job applications</span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {isDirty && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleReset}
              disabled={isSaving}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Discard Changes
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
            className="w-full sm:w-auto"
          >
            Save Profile Changes
          </Button>
        </div>
      </div>
    </form>
  );
};
