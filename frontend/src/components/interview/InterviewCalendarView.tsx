import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Video,
  Clock,
  User,
  Plus,
} from 'lucide-react';
import { InterviewEvent } from './InterviewTypes';
import { Button } from '../ui/Button';

export interface InterviewCalendarViewProps {
  interviews: InterviewEvent[];
  onSelectInterview?: (interview: InterviewEvent) => void;
  onScheduleSlot?: (dateStr: string) => void;
  className?: string;
}

export const InterviewCalendarView: React.FC<InterviewCalendarViewProps> = ({
  interviews,
  onSelectInterview,
  onScheduleSlot,
  className = '',
}) => {
  // Current calendar view month/year (defaults to November 2026 as per workspace timeline)
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 10, 14));
  const [selectedDateStr, setSelectedDateStr] = useState<string>('2026-11-14');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Navigate months
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const today = new Date(2026, 10, 14);
    setCurrentDate(today);
    setSelectedDateStr('2026-11-14');
  };

  // Group interviews by date string "YYYY-MM-DD"
  const interviewsByDate = useMemo(() => {
    const map: Record<string, InterviewEvent[]> = {};
    interviews.forEach((inv) => {
      // Parse ISO string to YYYY-MM-DD
      const datePart = inv.scheduledStart.split('T')[0];
      if (!map[datePart]) {
        map[datePart] = [];
      }
      map[datePart].push(inv);
    });
    return map;
  }, [interviews]);

  // Compute month days matrix
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: {
      day: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    // Prev month padding
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === '2026-11-14';
      cells.push({ day: d, dateStr, isCurrentMonth: true, isToday });
    }

    // Next month padding to fill complete weeks (up to 35 or 42 cells)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining && cells.length < 42; d++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, dateStr, isCurrentMonth: false, isToday: false });
    }

    return cells;
  }, [year, month]);

  // Interviews on selected date
  const selectedDayInterviews = interviewsByDate[selectedDateStr] || [];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Calendar Navigation Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {monthNames[month]} {year}
            </h2>
            <p className="text-xs text-slate-500">
              {interviews.length} total interview rounds scheduled across this period
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
          >
            Today
          </button>
          <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition border-r border-slate-200"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/70 text-center text-xs font-bold text-slate-600 py-3">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid Cells */}
        <div
          role="grid"
          aria-label={`${monthNames[month]} ${year} Interview Calendar`}
          className="grid grid-cols-7 divide-x divide-y divide-slate-100"
        >
          {calendarCells.map((cell, idx) => {
            const dayEvents = interviewsByDate[cell.dateStr] || [];
            const isSelected = cell.dateStr === selectedDateStr;

            return (
              <div
                key={`${cell.dateStr}-${idx}`}
                role="gridcell"
                tabIndex={0}
                aria-label={`${cell.dateStr}, ${dayEvents.length} interview${dayEvents.length === 1 ? '' : 's'}`}
                onClick={() => setSelectedDateStr(cell.dateStr)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedDateStr(cell.dateStr);
                  }
                }}
                className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors cursor-pointer outline-none ${
                  !cell.isCurrentMonth
                    ? 'bg-slate-50/40 text-slate-300'
                    : isSelected
                    ? 'bg-purple-50/60 ring-2 ring-inset ring-purple-600'
                    : 'bg-white hover:bg-slate-50/80 text-slate-800'
                } focus:ring-2 focus:ring-brand-500`}
              >
                {/* Cell Header: Day number & count */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      cell.isToday
                        ? 'bg-purple-600 text-white shadow-xs'
                        : isSelected
                        ? 'font-extrabold text-purple-700'
                        : 'text-slate-700'
                    }`}
                  >
                    {cell.day}
                  </span>

                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Day events badges preview */}
                <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectInterview?.(ev);
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100/90 text-purple-900 truncate hover:bg-purple-200 transition"
                      title={`${ev.title} — ${ev.candidateName}`}
                    >
                      <span className="font-semibold">{ev.scheduledStart.split('T')[1]?.slice(0, 5)}</span>{' '}
                      {ev.candidateName.split(' ')[0]}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[10px] text-slate-400 font-semibold pl-1">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda Drawer / Detail Card */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-purple-600" />
              <span>Agenda for {selectedDateStr}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {selectedDayInterviews.length} interview round
              {selectedDayInterviews.length === 1 ? '' : 's'} scheduled for this day
            </p>
          </div>

          {onScheduleSlot && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onScheduleSlot(selectedDateStr)}
              leftIcon={<Plus className="w-3.5 h-3.5 text-purple-600" />}
            >
              Add Interview to this Date
            </Button>
          )}
        </div>

        {selectedDayInterviews.length === 0 ? (
          <div className="p-8 text-center space-y-2 rounded-xl bg-slate-50/70 border border-dashed border-slate-200">
            <p className="text-xs font-semibold text-slate-700">No interviews scheduled on this date.</p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Use the "+ Schedule Interview" button to coordinate candidate sessions and interviewer times.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {selectedDayInterviews.map((ev) => (
              <div
                key={ev.id}
                onClick={() => onSelectInterview?.(ev)}
                className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-slate-50 hover:border-purple-300 transition cursor-pointer space-y-3 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {ev.type}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 mt-1.5">{ev.title}</h4>
                    <p className="text-[11px] text-slate-500">
                      {ev.candidateName} — {ev.candidateRole}
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ev.status === 'SCHEDULED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {ev.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {ev.scheduledStart.split('T')[1]?.slice(0, 5)} -{' '}
                      {ev.scheduledEnd.split('T')[1]?.slice(0, 5)} UTC
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Interviewer: {ev.interviewer}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-2">
                  <a
                    href={ev.locationOrLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition"
                  >
                    <Video className="w-3.5 h-3.5" />
                    Join Video Call
                  </a>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectInterview?.(ev);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
