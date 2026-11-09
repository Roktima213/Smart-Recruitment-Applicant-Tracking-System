import React from 'react';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import {
  Briefcase,
  GitBranch,
  Calendar,
  Gift,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const hrMenuItems = [
    { name: 'Job Requisitions', path: ROUTES.HR_JOBS, icon: Briefcase },
    { name: 'Hiring Pipeline', path: ROUTES.HR_PIPELINE, icon: GitBranch },
    { name: 'Interview Schedules', path: ROUTES.HR_INTERVIEWS, icon: Calendar },
    { name: 'Offers & Approvals', path: ROUTES.HR_OFFERS, icon: Gift },
    { name: 'Recruitment Analytics', path: ROUTES.HR_ANALYTICS, icon: BarChart3 },
  ];

  const adminMenuItems = [
    { name: 'Admin & RBAC', path: ROUTES.ADMIN, icon: ShieldAlert },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          HR Management Console
        </h2>
        <p className="text-xs text-slate-500 mt-1">Smart ATS Workflows</p>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase px-3 mb-2 tracking-wider">
            Recruitment Operations
          </div>
          <div className="space-y-1">
            {hrMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase px-3 mb-2 tracking-wider">
            System Administration
          </div>
          <div className="space-y-1">
            {adminMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Sidebar Footer / Emulator Status Info */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-start gap-2.5">
          <div className="mt-0.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
          <div className="text-xs">
            <p className="font-medium text-slate-700">Firebase Emulator</p>
            <p className="text-slate-400 font-mono text-[11px]">localhost:9099</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span>Backend API</span>
          <span className="font-mono text-emerald-600 font-medium">5000 OK</span>
        </div>
      </div>
    </aside>
  );
};
