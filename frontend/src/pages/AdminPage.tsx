import React from 'react';
import { ShieldCheck, UserCheck, Key, Database, RefreshCw } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const users = [
    {
      id: 'USR-001',
      name: 'Ranadeep (Team Lead)',
      email: 'ranadeep@smartats.com',
      role: 'admin',
      roleBadge: 'bg-purple-50 text-purple-700 border-purple-200',
      customClaim: 'admin: true, hr: true',
    },
    {
      id: 'USR-002',
      name: 'Cloud Engineer',
      email: 'cloud@smartats.com',
      role: 'admin',
      roleBadge: 'bg-purple-50 text-purple-700 border-purple-200',
      customClaim: 'admin: true',
    },
    {
      id: 'USR-003',
      name: 'Hiring Manager 1',
      email: 'manager@smartats.com',
      role: 'hiring_manager',
      roleBadge: 'bg-blue-50 text-blue-700 border-blue-200',
      customClaim: 'hiring_manager: true',
    },
    {
      id: 'USR-004',
      name: 'Lead Recruiter',
      email: 'recruiter@smartats.com',
      role: 'recruiter',
      roleBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      customClaim: 'recruiter: true',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Administration & RBAC</h1>
          <p className="text-sm text-slate-500">
            Firebase Auth custom claims inspection and user role governance.
          </p>
        </div>

        <button
          onClick={() => alert('[Day 1 Prototype] Syncing custom claims with Firebase Auth Emulator...')}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Claims
        </button>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Auth Provider</p>
            <p className="text-sm font-bold text-slate-800">Firebase Emulator (9099)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Database Service</p>
            <p className="text-sm font-bold text-slate-800">PostgreSQL (5432)</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">RBAC Roles</p>
            <p className="text-sm font-bold text-slate-800">4 Active Roles</p>
          </div>
        </div>
      </div>

      {/* User Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-sm">Privileged User Directory</h2>
          <span className="text-xs text-slate-400">4 Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-3">User & Email</th>
                <th className="px-6 py-3">Assigned Role</th>
                <th className="px-6 py-3">Decoded Custom Claim</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                        <UserCheck className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${user.roleBadge}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700 font-mono">
                      {user.customClaim}
                    </code>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-xs text-brand-600 hover:text-brand-700 font-semibold">
                      Edit Claims
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
