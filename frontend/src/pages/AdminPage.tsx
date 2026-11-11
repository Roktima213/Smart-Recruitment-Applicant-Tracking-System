import React, { useState, useMemo, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Building2,
  Key,
  RefreshCw,
  Search,
  Filter,
  UserPlus,
  Edit3,
  Globe,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Power,
  Mail,
  UserCheck,
  Briefcase,
  Check,
} from 'lucide-react';
import { Button, Badge, Modal, Input, Select } from '../components/ui';
import { apiClient } from '../services/apiClient';

export type UserRole = 'ADMIN' | 'HR' | 'CANDIDATE';

export interface AdminUser {
  id: string;
  firebase_uid: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  avatar_url?: string;
  created_at: string;
  last_active?: string;
}

export interface CompanySettings {
  id?: string;
  name: string;
  domain: string;
  logo_url: string;
  industry: string;
  portal_url: string;
  verified: boolean;
}

interface ToastNotification {
  id: number;
  type: 'success' | 'info' | 'error';
  message: string;
}

export const AdminPage: React.FC = () => {
  // ---------------------------------------------------------------------------
  // 1. Initial State Data (aligned with 001_users_companies schema)
  // ---------------------------------------------------------------------------
  const [users, setUsers] = useState<AdminUser[]>([
    {
      id: 'usr-001',
      firebase_uid: 'fb-admin-lead-01',
      full_name: 'Ranadeep Saha',
      email: 'ranadeep@smartats.com',
      role: 'ADMIN',
      is_active: true,
      created_at: '2026-11-09T09:00:00Z',
      last_active: '2 mins ago',
    },
    {
      id: 'usr-002',
      firebase_uid: 'fb-admin-rekha-02',
      full_name: 'Rekha (Frontend Lead)',
      email: 'rekha@smartats.com',
      role: 'ADMIN',
      is_active: true,
      created_at: '2026-11-09T09:30:00Z',
      last_active: 'Just now',
    },
    {
      id: 'usr-003',
      firebase_uid: 'fb-hr-lead-03',
      full_name: 'Priya Sharma (HR Lead)',
      email: 'priya.hr@smartats.com',
      role: 'HR',
      is_active: true,
      created_at: '2026-11-09T11:15:00Z',
      last_active: '15 mins ago',
    },
    {
      id: 'usr-004',
      firebase_uid: 'fb-hr-recruiter-04',
      full_name: 'David Lee (Talent Specialist)',
      email: 'david.recruiter@smartats.com',
      role: 'HR',
      is_active: true,
      created_at: '2026-11-09T14:20:00Z',
      last_active: '1 hour ago',
    },
    {
      id: 'usr-005',
      firebase_uid: 'fb-cand-alex-05',
      full_name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      role: 'CANDIDATE',
      is_active: true,
      created_at: '2026-11-10T08:45:00Z',
      last_active: '3 hours ago',
    },
    {
      id: 'usr-006',
      firebase_uid: 'fb-cand-samira-06',
      full_name: 'Samira Khan',
      email: 'samira.khan@example.com',
      role: 'CANDIDATE',
      is_active: false,
      created_at: '2026-11-10T10:10:00Z',
      last_active: '2 days ago',
    },
  ]);

  const [company, setCompany] = useState<CompanySettings>({
    name: 'TechPulse Global Corp',
    domain: 'techpulse.io',
    logo_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    industry: 'Enterprise Software & Cloud Platforms',
    portal_url: 'https://careers.techpulse.io',
    verified: true,
  });

  // Company Settings Form State
  const [companyForm, setCompanyForm] = useState<CompanySettings>({ ...company });
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isCompanyEditing, setIsCompanyEditing] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Role Modification Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [targetRole, setTargetRole] = useState<UserRole>('CANDIDATE');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Invite / Add User Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('HR');
  const [isInviting, setIsInviting] = useState(false);

  // Sync Claims Feedback State
  const [isSyncingClaims, setIsSyncingClaims] = useState(false);

  // Toast System
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ---------------------------------------------------------------------------
  // 2. Fetch Live Data from Backend (Contract-First Fallback)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/admin/users')
      .then((res) => {
        if (isMounted && res.data && Array.isArray(res.data.users)) {
          setUsers(res.data.users);
        }
      })
      .catch(() => {
        // Fallback silently to client mock dataset for offline development
      });

    apiClient
      .get('/admin/company')
      .then((res) => {
        if (isMounted && res.data && res.data.company) {
          setCompany(res.data.company);
          setCompanyForm(res.data.company);
        }
      })
      .catch(() => {
        // Fallback silently
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 3. User Filtering & Search Logic
  // ---------------------------------------------------------------------------
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.is_active) ||
        (statusFilter === 'INACTIVE' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.is_active).length;
    const admins = users.filter((u) => u.role === 'ADMIN').length;
    const hrs = users.filter((u) => u.role === 'HR').length;
    const candidates = users.filter((u) => u.role === 'CANDIDATE').length;
    const activePct = total > 0 ? Math.round((active / total) * 100) : 0;
    return { total, active, admins, hrs, candidates, activePct };
  }, [users]);

  // ---------------------------------------------------------------------------
  // 4. Status Toggle Handler (with instant feedback)
  // ---------------------------------------------------------------------------
  const handleToggleStatus = async (user: AdminUser) => {
    const newStatus = !user.is_active;

    // Optimistic local state update for instant UI feedback
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u))
    );

    try {
      await apiClient.patch(`/admin/users/${user.id}/status`, { isActive: newStatus, is_active: newStatus });
      addToast(
        `User account "${user.full_name}" is now ${newStatus ? 'Active' : 'Deactivated'}.`,
        newStatus ? 'success' : 'info'
      );
    } catch (err: any) {
      // Revert optimistic update on rejection
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: user.is_active } : u))
      );
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update user status';
      addToast(msg, 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Role Modification Modal Handlers (with instant feedback)
  // ---------------------------------------------------------------------------
  const openRoleModal = (user: AdminUser) => {
    setSelectedUser(user);
    setTargetRole(user.role);
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser) return;
    setIsUpdatingRole(true);

    const prevRole = selectedUser.role;
    const newRole = targetRole;

    try {
      await apiClient.patch(`/admin/users/${selectedUser.id}/role`, { role: newRole });
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
      );
      setIsRoleModalOpen(false);
      addToast(
        `✓ Role updated for ${selectedUser.full_name}: changed from ${prevRole} to ${newRole}.`,
        'success'
      );
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update user role';
      addToast(msg, 'error');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 6. Company Settings Handlers (with instant feedback)
  // ---------------------------------------------------------------------------
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCompany(true);

    try {
      // Call backend PUT endpoint
      const res = await apiClient.put('/admin/company', companyForm);
      if (res.data?.company) {
        setCompany(res.data.company);
        setCompanyForm(res.data.company);
      } else {
        setCompany({ ...companyForm });
      }
      setIsCompanyEditing(false);
      addToast('✓ Company workspace settings saved successfully!', 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save company settings';
      addToast(msg, 'error');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleResetCompany = () => {
    setCompanyForm({ ...company });
    setIsCompanyEditing(false);
    addToast('Company settings changes reverted.', 'info');
  };

  // ---------------------------------------------------------------------------
  // 7. Invite Member Handler (with instant feedback)
  // ---------------------------------------------------------------------------
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addToast('Please enter both a full name and email address.', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const response = await apiClient.post('/admin/users/invite', {
        fullName: newUserName.trim(),
        full_name: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
      });
      const createdUser = response.data?.user;
      if (createdUser) {
        setUsers((prev) => [createdUser, ...prev.filter((u) => u.id !== createdUser.id)]);
      } else {
        const newUser: AdminUser = {
          id: `usr-${Date.now().toString().slice(-4)}`,
          firebase_uid: `fb-${Date.now().toString().slice(-6)}`,
          full_name: newUserName.trim(),
          email: newUserEmail.trim(),
          role: newUserRole,
          is_active: true,
          created_at: new Date().toISOString(),
          last_active: 'Just invited',
        };
        setUsers((prev) => [newUser, ...prev]);
      }
      setIsInviteModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('HR');
      addToast(`✓ Invitation sent to ${newUserEmail.trim()} with ${newUserRole} privileges.`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to invite user';
      addToast(msg, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 8. Custom Claims Sync
  // ---------------------------------------------------------------------------
  const handleSyncClaims = async () => {
    setIsSyncingClaims(true);
    try {
      const res = await apiClient.post('/auth/sync-claims');
      const msg = res.data?.message || '✓ All user custom claims synchronized with Firebase Auth Emulator!';
      addToast(msg, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Claims synchronization notice';
      addToast(msg, 'info');
    } finally {
      setIsSyncingClaims(false);
    }
  };

  // Helper for Role Badges
  const renderRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <Badge variant="primary" dot size="sm">
            ADMIN
          </Badge>
        );
      case 'HR':
        return (
          <Badge variant="info" dot size="sm">
            HR MANAGER
          </Badge>
        );
      case 'CANDIDATE':
        return (
          <Badge variant="success" dot size="sm">
            CANDIDATE
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ------------------------------------------------------------------- */}
      {/* Toast Notification Container                                       */}
      {/* ------------------------------------------------------------------- */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl shadow-lg border transition-all transform animate-in slide-in-from-top-2 ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : t.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-slate-900 border-slate-800 text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                {t.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                {t.type === 'info' && <ShieldCheck className="w-4 h-4 text-brand-400 shrink-0" />}
                <span>{t.message}</span>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-600 rounded p-0.5"
                aria-label="Dismiss toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* Header Banner & Quick Actions                                       */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                <ShieldAlert className="w-3.5 h-3.5 text-brand-600" />
                RBAC Security Console
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Auth Claims Synced
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Overview Dashboard
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl leading-relaxed">
              Centralized governance for user access roles, multi-tenant company settings, and system-wide
              privilege enforcement across PostgreSQL and Firebase Auth Custom Claims.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncClaims}
              isLoading={isSyncingClaims}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-slate-500" />}
            >
              Sync Claims
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsInviteModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Invite User
            </Button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* System KPI Cards                                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="font-semibold text-purple-600">{stats.admins} Admins</span> •{' '}
              <span className="font-semibold text-blue-600">{stats.hrs} HR</span> •{' '}
              <span className="font-semibold text-emerald-600">{stats.candidates} Cand</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Active Accounts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rate</p>
            <p className="text-2xl font-bold text-slate-900">{stats.activePct}%</p>
            <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> {stats.active} of {stats.total} accounts active
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Company Workspace */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workspace Entity</p>
            <p className="text-base font-bold text-slate-900 truncate max-w-[150px]">{company.name}</p>
            <p className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">{company.domain}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        {/* Security & RBAC Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security State</p>
            <p className="text-base font-bold text-slate-900">ACID RBAC</p>
            <p className="text-[11px] text-emerald-600 font-medium">Claims + DB Synced</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <Key className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 1: User Management Table                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Header & Search/Filters */}
        <div className="p-5 sm:p-6 border-b border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">User Management Table</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Inspect, modify roles, and toggle access states for all registered accounts.
              </p>
            </div>
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/70">
              Showing {filteredUsers.length} of {users.length} Users
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
            <div className="sm:col-span-6 lg:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search user by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="sm:col-span-3 lg:col-span-3 relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
              >
                <option value="ALL">Filter: All Roles</option>
                <option value="ADMIN">ADMIN Only</option>
                <option value="HR">HR Only</option>
                <option value="CANDIDATE">CANDIDATE Only</option>
              </select>
            </div>

            <div className="sm:col-span-3 lg:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-700"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Only</option>
                <option value="INACTIVE">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* The Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-3.5">User Details</th>
                <th className="px-6 py-3.5">Role Badge</th>
                <th className="px-6 py-3.5">Status Toggle</th>
                <th className="px-6 py-3.5">Activity</th>
                <th className="px-6 py-3.5 text-right">Action Buttons</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
                      <Users className="w-10 h-10 stroke-1 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No matching users found</p>
                      <p className="text-xs text-slate-400">
                        Try adjusting your search query or reset the role and status filters.
                      </p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setRoleFilter('ALL');
                          setStatusFilter('ALL');
                        }}
                        className="mt-2 text-xs text-brand-600 font-semibold hover:underline"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`transition hover:bg-slate-50/70 ${!user.is_active ? 'bg-slate-50/40 opacity-75' : ''}`}
                  >
                    {/* User Column */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {user.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-2">
                            <span>{user.full_name}</span>
                            {!user.is_active && (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                                Deactivated
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge Column */}
                    <td className="px-6 py-4">
                      {renderRoleBadge(user.role)}
                    </td>

                    {/* Status Toggle Column */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer ${
                          user.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                        title="Click to toggle active status"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            user.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{user.is_active ? 'Active' : 'Inactive'}</span>
                        <Power className="w-3 h-3 opacity-60 ml-0.5" />
                      </button>
                    </td>

                    {/* Activity Column */}
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600 font-medium">{user.last_active}</div>
                      <div className="text-[11px] text-slate-400">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Action Buttons Column */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRoleModal(user)}
                          leftIcon={<Edit3 className="w-3.5 h-3.5 text-brand-600" />}
                          className="hover:border-brand-400 hover:text-brand-700 text-xs font-semibold"
                        >
                          Change Role
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* SECTION 2: Company Settings Card                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0 border border-brand-100">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Company Settings Card
                {company.verified && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Domain
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Configure legal enterprise identity, domain authorization, and branding metadata for the ATS portal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!isCompanyEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCompanyEditing(true)}
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
              >
                Edit Settings
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetCompany}
                disabled={isSavingCompany}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Settings Body & Live Preview */}
        <form onSubmit={handleSaveCompany} className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Fields Column */}
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Company Name */}
                <Input
                  label="Company Name"
                  id="company-name"
                  value={companyForm.name}
                  disabled={!isCompanyEditing || isSavingCompany}
                  onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  leftIcon={<Building2 className="w-4 h-4 text-slate-400" />}
                  required
                />

                {/* Company Domain */}
                <Input
                  label="Company Domain"
                  id="company-domain"
                  value={companyForm.domain}
                  disabled={!isCompanyEditing || isSavingCompany}
                  onChange={(e) => setCompanyForm({ ...companyForm, domain: e.target.value })}
                  placeholder="e.g. acme.com"
                  leftIcon={<Globe className="w-4 h-4 text-slate-400" />}
                  required
                />
              </div>

              {/* Company Logo URL */}
              <Input
                label="Company Logo URL"
                id="company-logo-url"
                value={companyForm.logo_url}
                disabled={!isCompanyEditing || isSavingCompany}
                onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                placeholder="https://.../logo.png"
                leftIcon={<ImageIcon className="w-4 h-4 text-slate-400" />}
                helperText="Public image URL used on candidate application portals and offer letters."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Industry */}
                <Input
                  label="Industry & Sector"
                  id="company-industry"
                  value={companyForm.industry}
                  disabled={!isCompanyEditing || isSavingCompany}
                  onChange={(e) => setCompanyForm({ ...companyForm, industry: e.target.value })}
                  placeholder="e.g. Cloud & AI Infrastructure"
                />

                {/* Careers Portal */}
                <Input
                  label="Applicant Portal URL"
                  id="company-portal"
                  value={companyForm.portal_url}
                  disabled={!isCompanyEditing || isSavingCompany}
                  onChange={(e) => setCompanyForm({ ...companyForm, portal_url: e.target.value })}
                  placeholder="https://careers.acme.com"
                  leftIcon={<ExternalLink className="w-4 h-4 text-slate-400" />}
                />
              </div>

              {isCompanyEditing && (
                <div className="pt-4 flex items-center gap-3">
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSavingCompany}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Save Company Settings
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResetCompany}
                    disabled={isSavingCompany}
                  >
                    Revert
                  </Button>
                </div>
              )}
            </div>

            {/* Live Branding Preview Card */}
            <div className="lg:col-span-4">
              <div className="bg-slate-50/80 rounded-xl border border-slate-200/90 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Candidate View Preview
                  </span>
                  <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-600">
                    Live Preview
                  </span>
                </div>

                {/* Simulated Portal Header */}
                <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {companyForm.logo_url ? (
                        <img
                          src={companyForm.logo_url}
                          alt="Company Logo Preview"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://placehold.co/128x128/6366f1/ffffff?text=' +
                              encodeURIComponent(companyForm.name.slice(0, 2).toUpperCase() || 'CO');
                          }}
                        />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">
                        {companyForm.name || 'Company Name'}
                      </p>
                      <p className="text-xs text-slate-500 font-mono truncate">
                        {companyForm.domain || 'company.com'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Industry:</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">
                      {companyForm.industry || 'General'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  This identity appears across candidate invitations, offer letter templates, and applicant portal banners.
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 1: Role Modification Modal (with Instant Feedback)            */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => {
          if (!isUpdatingRole) setIsRoleModalOpen(false);
        }}
        title="Modify User Role & Privileges"
        subtitle={
          selectedUser
            ? `Update RBAC access policy and custom claims for ${selectedUser.full_name}`
            : ''
        }
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRoleModalOpen(false)}
              disabled={isUpdatingRole}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveRole}
              isLoading={isUpdatingRole}
              leftIcon={<Check className="w-4 h-4" />}
            >
              Confirm Role Change
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* User Details Callout */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="w-10 h-10 rounded-full bg-brand-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {selectedUser.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-slate-900 text-sm truncate">
                  {selectedUser.full_name}
                </div>
                <div className="text-xs text-slate-500 truncate">{selectedUser.email}</div>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Current
                </span>
                {renderRoleBadge(selectedUser.role)}
              </div>
            </div>

            {/* Role Options */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Select New Access Level
              </label>

              {/* ADMIN Option */}
              <div
                onClick={() => setTargetRole('ADMIN')}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  targetRole === 'ADMIN'
                    ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="mt-0.5 p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-900">Administrator (ADMIN)</p>
                    {targetRole === 'ADMIN' && (
                      <span className="text-purple-600 font-bold text-xs">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Full system access: manages user accounts, modifies RBAC claims, edits company branding, and views system audit logs.
                  </p>
                </div>
              </div>

              {/* HR Option */}
              <div
                onClick={() => setTargetRole('HR')}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  targetRole === 'HR'
                    ? 'border-blue-500 bg-blue-50/60 ring-2 ring-blue-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="mt-0.5 p-2 rounded-lg bg-blue-100 text-blue-700 shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-900">HR Manager (HR)</p>
                    {targetRole === 'HR' && (
                      <span className="text-blue-600 font-bold text-xs">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hiring workflows: manages job postings, candidate pipelines, interview scheduling, feedback ratings, and offer letters.
                  </p>
                </div>
              </div>

              {/* CANDIDATE Option */}
              <div
                onClick={() => setTargetRole('CANDIDATE')}
                className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                  targetRole === 'CANDIDATE'
                    ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="mt-0.5 p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-sm text-slate-900">Applicant / Candidate (CANDIDATE)</p>
                    {targetRole === 'CANDIDATE' && (
                      <span className="text-emerald-600 font-bold text-xs">Selected</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Standard applicant access: applies for open roles, uploads resume files, and checks application stage statuses.
                  </p>
                </div>
              </div>
            </div>

            {/* Instant Feedback Warning Callout */}
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Instant Policy Application</p>
                <p className="text-amber-700 mt-0.5">
                  Saving this modification immediately recalculates the user's Firebase Auth Custom Claim and updates PostgreSQL permissions in real-time.
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ------------------------------------------------------------------- */}
      {/* MODAL 2: Invite / Add User Modal                                    */}
      {/* ------------------------------------------------------------------- */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => {
          if (!isInviting) setIsInviteModalOpen(false);
        }}
        title="Invite New User to Workspace"
        subtitle="Provision a team account with predefined RBAC privileges."
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInviteModalOpen(false)}
              disabled={isInviting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInviteUser}
              isLoading={isInviting}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Send Workspace Invite
            </Button>
          </>
        }
      >
        <form onSubmit={handleInviteUser} className="space-y-4">
          <Input
            label="Full Name"
            id="new-user-name"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            required
          />

          <Input
            label="Email Address"
            id="new-user-email"
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="e.g. alex@example.com"
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
            required
          />

          <Select
            label="Assigned Role"
            id="new-user-role"
            value={newUserRole}
            onChange={(e) => setNewUserRole(e.target.value as UserRole)}
            options={[
              { value: 'ADMIN', label: 'Administrator (ADMIN) - Full Governance' },
              { value: 'HR', label: 'HR Manager (HR) - Requisitions & Pipeline' },
              { value: 'CANDIDATE', label: 'Candidate (CANDIDATE) - Job Applicant' },
            ]}
          />

          <p className="text-xs text-slate-400 leading-relaxed">
            The invited user will receive an automated notification email with access instructions matching their assigned role.
          </p>
        </form>
      </Modal>
    </div>
  );
};
