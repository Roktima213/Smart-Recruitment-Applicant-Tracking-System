import React, { useState } from 'react';
import { Calendar, User, Video, Clock, RefreshCw } from 'lucide-react';
import {
  useInterviews,
  InterviewRequestError,
} from '../../hooks/useInterviews';

export const HrInterviewsPage: React.FC = () => {
  const {
    interviews,
    interviewers,
    applications,
    loading,
    loadingOptions,
    error,
    fetchInterviews,
    scheduleInterview,
  } = useInterviews();

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [startDateTime, setStartDateTime] = useState('');
  const handleScheduleInterview = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setFormError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const applicationId = String(formData.get('applicationId') || '');
    const interviewerId = String(formData.get('interviewerId') || '');
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const startValue = String(formData.get('scheduledStart') || '');
    const endValue = String(formData.get('scheduledEnd') || '');
    const locationOrLink = String(formData.get('locationOrLink') || '').trim();

    if (!applicationId || !interviewerId || !title || !startValue || !endValue) {
      setFormError('Please complete all required fields.');
      return;
    }

    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      setFormError('Please enter valid interview dates and times.');
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      setFormError('Interview end time must be after its start time.');
      return;
    }

    setSubmitting(true);

    try {
      await scheduleInterview({
        applicationId,
        interviewerId,
        title,
        description: description || null,
        scheduledStart: startDate.toISOString(),
        scheduledEnd: endDate.toISOString(),
        locationOrLink: locationOrLink || null,
      });

      form.reset();
      setStartDateTime('');
      setFormError(null);
    } catch (err) {
      if (err instanceof InterviewRequestError && err.status === 409) {
        setFormError(
          'Scheduling conflict: this interviewer already has an interview during the selected time. Choose another time or interviewer.'
        );
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError('Unable to schedule the interview. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Invalid date';
    }

    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Interview Schedules
          </h1>
          <p className="text-sm text-slate-500">
            Coordinate interview rounds, interviewer assignments, and candidate scorecards.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchInterviews}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Schedule an Interview
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Select an application and interviewer, then provide the interview details.
          </p>
        </div>

        {formError && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {formError}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {error}
          </div>
        )}

        {loadingOptions ? (
          <p className="text-sm text-slate-500">
            Loading applications and interviewers...
          </p>
        ) : (
          <form onSubmit={handleScheduleInterview} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="applicationId"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Application <span className="text-red-500">*</span>
                </label>
                <select
                  id="applicationId"
                  name="applicationId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="" disabled>
                    Select an application
                  </option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.candidate?.name || 'Candidate'} -{' '}
                      {application.job?.title || 'Job'} ({application.currentStage})
                    </option>
                  ))}
                </select>
                {applications.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No real applications are available for scheduling.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="interviewerId"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Interviewer <span className="text-red-500">*</span>
                </label>
                <select
                  id="interviewerId"
                  name="interviewerId"
                  required
                  defaultValue=""
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="" disabled>
                    Select an interviewer
                  </option>
                  {interviewers.map((interviewer) => (
                    <option key={interviewer.id} value={interviewer.id}>
                      {interviewer.name} ({interviewer.email})
                    </option>
                  ))}
                </select>
                {interviewers.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    No active HR interviewers are available.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Interview Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  required
                  maxLength={255}
                  placeholder="e.g. Technical System Design"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label
                  htmlFor="scheduledStart"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Start Date and Time <span className="text-red-500">*</span>
                </label>
               <input
                  id="scheduledStart"
                  name="scheduledStart"
                  type="datetime-local"
                  required
                  value={startDateTime}
                  onChange={(event) => setStartDateTime(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              </div>

              <div>
                <label
                  htmlFor="scheduledEnd"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  End Date and Time <span className="text-red-500">*</span>
                </label>
                <input
                  id="scheduledEnd"
                  name="scheduledEnd"
                  type="datetime-local"
                  min={startDateTime || undefined}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="locationOrLink"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Meeting Location or Video Link
                </label>
                <input
                  id="locationOrLink"
                  name="locationOrLink"
                  type="text"
                  maxLength={1000}
                  placeholder="Office address or meeting URL"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={5000}
                  placeholder="Add interview instructions or topics..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={
                  submitting ||
                  applications.length === 0 ||
                  interviewers.length === 0
                }
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition"
              >
                <Calendar className="w-4 h-4" />
                {submitting ? 'Scheduling...' : 'Schedule Interview'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Scheduled Interviews
          </h2>
          <p className="text-sm text-slate-500">
            Interviews scheduled for your company.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading interviews...</p>
        ) : interviews.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">
              No interviews scheduled yet.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Scheduled interviews will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {interviews.map((item) => (
              <div
                key={item.id}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                      {item.title}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 mt-2">
                      {item.candidate_name || 'Candidate'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {item.job_title || 'Job'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {item.status}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{formatDate(item.scheduled_start)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Ends: {formatDate(item.scheduled_end)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      Interviewer: {item.interviewer_name || 'Not assigned'}
                    </span>
                  </div>
                  {item.location_or_link && (
                    <div className="flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-slate-400" />
                      <span className="break-all">{item.location_or_link}</span>
                    </div>
                  )}
                </div>

                {item.description && (
                  <p className="text-xs text-slate-500 border-t border-slate-100 pt-3">
                    {item.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
