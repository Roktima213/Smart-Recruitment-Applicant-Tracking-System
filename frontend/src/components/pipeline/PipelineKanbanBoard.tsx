import React, { useState } from 'react';
import {
  Users,
} from 'lucide-react';
import {
  ApplicationStage,
  PipelineApplication,
  PIPELINE_COLUMNS,
  ALLOWED_NEXT_STAGES,
} from './types';
import { PipelineCard } from './PipelineCard';

interface PipelineKanbanBoardProps {
  applications: PipelineApplication[];
  onRequestTransition: (application: PipelineApplication, targetStage?: ApplicationStage) => void;
  onViewDetails?: (application: PipelineApplication) => void;
  updatingAppId?: string | null;
  onIllegalDropAttempt?: (message: string) => void;
}

export const PipelineKanbanBoard: React.FC<PipelineKanbanBoardProps> = ({
  applications,
  onRequestTransition,
  onViewDetails,
  updatingAppId,
  onIllegalDropAttempt,
}) => {
  const [draggedApp, setDraggedApp] = useState<PipelineApplication | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<ApplicationStage | null>(null);

  const handleDragStart = (e: React.DragEvent, app: PipelineApplication) => {
    setDraggedApp(app);
    e.dataTransfer.setData('text/plain', app.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: ApplicationStage) => {
    e.preventDefault();
    if (!draggedApp) return;

    if (activeDropColumn !== stageId) {
      setActiveDropColumn(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: ApplicationStage) => {
    e.preventDefault();
    if (activeDropColumn === stageId) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStage: ApplicationStage) => {
    e.preventDefault();
    setActiveDropColumn(null);

    if (!draggedApp) return;
    const fromStage = draggedApp.currentStage;

    if (fromStage === targetStage) {
      setDraggedApp(null);
      return;
    }

    if (fromStage === 'REJECTED') {
      onIllegalDropAttempt?.('Candidate is in terminal Rejected stage and cannot be moved.');
      setDraggedApp(null);
      return;
    }

    const allowedNext = ALLOWED_NEXT_STAGES[fromStage] || [];
    if (!allowedNext.includes(targetStage)) {
      onIllegalDropAttempt?.(
        `Cannot jump from ${fromStage} directly to ${targetStage}. Allowed targets: ${allowedNext.join(', ')}`
      );
      setDraggedApp(null);
      return;
    }

    // Allowed transition: prompt user for mandatory audit reason via modal
    onRequestTransition(draggedApp, targetStage);
    setDraggedApp(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-4 overflow-x-auto pb-6">
      {PIPELINE_COLUMNS.map((column) => {
        const columnApps = applications.filter((app) => app.currentStage === column.id);
        const isDropTarget = activeDropColumn === column.id;
        const isAllowedDrop =
          draggedApp &&
          draggedApp.currentStage !== column.id &&
          (ALLOWED_NEXT_STAGES[draggedApp.currentStage] || []).includes(column.id);

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={(e) => handleDragLeave(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col min-w-[270px] rounded-2xl border transition-all duration-150 ${
              isDropTarget && isAllowedDrop
                ? 'bg-brand-50/60 border-brand-400 ring-2 ring-brand-300 ring-offset-2'
                : isDropTarget && !isAllowedDrop
                ? 'bg-rose-50/60 border-rose-300'
                : 'bg-slate-100/60 border-slate-200/80'
            }`}
          >
            {/* Column Header */}
            <div className={`p-3.5 border-b rounded-t-2xl ${column.headerBg} ${column.borderColor}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${column.accentColor}`}>
                  {column.name}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs ${column.badgeBg}`}
                >
                  {columnApps.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{column.description}</p>
            </div>

            {/* Candidate Cards List */}
            <div
              role="region"
              aria-label={`${column.name} stage candidates`}
              tabIndex={0}
              className="p-2.5 space-y-2.5 flex-1 min-h-[380px] overflow-y-auto max-h-[calc(100vh-280px)] focus-visible:ring-1 focus-visible:ring-brand-400 focus-visible:outline-none rounded-b-2xl"
            >
              {columnApps.length === 0 ? (
                <div
                  role="status"
                  aria-label={`No candidates in ${column.name} stage`}
                  className="h-44 border-2 border-dashed border-slate-200/90 rounded-xl flex flex-col items-center justify-center text-slate-400 p-4 text-center select-none"
                >
                  <Users className="w-6 h-6 mb-1.5 stroke-[1.5] text-slate-300" />
                  <p className="text-xs font-semibold text-slate-600">
                    {column.id === 'APPLIED'
                      ? 'No new applicants'
                      : column.id === 'SCREENING'
                      ? 'No candidates in screening'
                      : column.id === 'INTERVIEW'
                      ? 'No scheduled interviews'
                      : column.id === 'SELECTED'
                      ? 'No candidates selected'
                      : column.id === 'OFFERED'
                      ? 'No offers pending'
                      : 'No archived rejections'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {column.id === 'REJECTED'
                      ? 'Closed applications appear here'
                      : 'Drag or move a candidate here'}
                  </p>
                </div>
              ) : (
                columnApps.map((app) => (
                  <PipelineCard
                    key={app.id}
                    application={app}
                    onMoveClick={(a) => onRequestTransition(a)}
                    onDragStart={handleDragStart}
                    onViewDetails={onViewDetails}
                    isUpdating={updatingAppId === app.id}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
