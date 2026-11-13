import React from 'react';
import {
  FileText,
  Calendar,
  ArrowRight,
  Building2,
  MapPin,
  XCircle,
} from 'lucide-react';
import { PipelineApplication, ALLOWED_NEXT_STAGES } from './types';

interface PipelineCardProps {
  application: PipelineApplication;
  onMoveClick: (application: PipelineApplication) => void;
  onDragStart?: (e: React.DragEvent, application: PipelineApplication) => void;
  onViewDetails?: (application: PipelineApplication) => void;
  isUpdating?: boolean;
}

export const PipelineCard: React.FC<PipelineCardProps> = ({
  application,
  onMoveClick,
  onDragStart,
  onViewDetails,
  isUpdating = false,
}) => {
  const allowedNext = ALLOWED_NEXT_STAGES[application.currentStage] || [];
  const hasAllowedTransitions = allowedNext.length > 0;
  const isTerminal = application.currentStage === 'REJECTED';

  const formattedDate = new Date(application.appliedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`Candidate ${application.candidate.name}, applied for ${application.job.title}, stage ${application.currentStage}`}
      draggable={!isTerminal && !isUpdating}
      onDragStart={(e) => {
        if (onDragStart && !isTerminal) {
          onDragStart(e, application);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewDetails?.(application);
        }
      }}
      className={`group relative bg-white rounded-xl p-3.5 border transition shadow-2xs focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none ${
        isUpdating
          ? 'opacity-60 border-brand-300 pointer-events-none'
          : isTerminal
          ? 'border-slate-200/80 hover:border-slate-300'
          : 'border-slate-200 hover:border-brand-300 hover:shadow-xs cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Top Header: Candidate Name + Score */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold shrink-0">
            {application.candidate.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4
              onClick={() => onViewDetails?.(application)}
              className="text-xs font-bold text-slate-900 truncate hover:text-brand-600 transition cursor-pointer"
            >
              {application.candidate.name}
            </h4>
            <p className="text-[11px] text-slate-500 truncate">
              {application.candidate.headline || application.job.title}
            </p>
          </div>
        </div>

        {application.matchScore !== undefined && (
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
              application.matchScore >= 90
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : application.matchScore >= 75
                ? 'bg-brand-50 text-brand-700 border border-brand-200'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {application.matchScore}%
          </span>
        )}
      </div>

      {/* Job Title & Details */}
      <div className="space-y-1 mb-2.5 text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="truncate font-medium text-slate-700">{application.job.title}</span>
        </div>
        {application.job.location && (
          <div className="flex items-center gap-1.5 truncate text-slate-400">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{application.job.location}</span>
          </div>
        )}
      </div>

      {/* Skills Badges (if present) */}
      {application.candidate.skills && application.candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2.5">
          {application.candidate.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="px-1.5 py-0.5 text-[10px] bg-slate-50 text-slate-600 rounded border border-slate-200/70"
            >
              {skill}
            </span>
          ))}
          {application.candidate.skills.length > 3 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{application.candidate.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer / Quick Actions */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-slate-400 text-[10px]">
          <Calendar className="w-3 h-3" />
          <span>{formattedDate}</span>
          {application.resumeFileName && (
            <span className="inline-flex items-center gap-0.5 text-brand-600 font-medium ml-1">
              <FileText className="w-3 h-3" />
              <span>CV</span>
            </span>
          )}
        </div>

        {hasAllowedTransitions && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveClick(application);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition"
            title="Move candidate stage"
          >
            <span>Advance</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}

        {isTerminal && (
          <span className="text-[10px] font-semibold text-rose-500 flex items-center gap-0.5">
            <XCircle className="w-3 h-3" />
            <span>Closed</span>
          </span>
        )}
      </div>
    </div>
  );
};
