import React, { useState, useEffect } from 'react';
import {
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Power,
  Users,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { apiClient } from '../services/apiClient';

export interface AdminUser {
  id: string;
  firebase_uid: string;
  email: string;
  full_name: string;
  role: 'ADMIN' | 'HR' | 'CANDIDATE';
  company_id?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyConfig {
  id?: string;
  name: string;
  domain?: string | null;
  logo_url?: string | null;
  settings?: {
    timezone?: string;
    defaultCurrency?: string;
    autoScreening?: boolean;
    [key: string]: unknown;
  };
}

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'company'>('users');

  // Users State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Role Edit Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'HR' | 'CANDIDATE'>('CANDIDATE');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Status Toggle Modal State
  const [statusUser, setStatusUser] = useState<AdminUser | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Company Settings State
  const [company, setCompany] = useState<CompanyConfig>({
    name: 'Acme Corporation',
    domain: 'acme.local',
    logo_url: '',
    settings: {
      timezone: 'UTC',
      defaultCurrency: 'USD',
      autoScreening: true,
    },
  });
  const [companySuccess, setCompanySuccess] = useState(false);

  // Notification Banner
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch Users from API
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (roleFilter) params.role = roleFilter;

      const response = await apiClient.get('/admin/users', { params });
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (err: any) {
      console.warn('[AdminPage] API fetch warning, fallback to default seed view:', err.message);
      // Fallback demo users if backend is starting or offline
      setUsers([
        {
          id: 'usr-admin-01',
          firebase_uid: 'seed-admin-001',
          email: 'admin@ats.local',
          full_name: 'Alex Admin',
          role: 'ADMIN',
          company_id: 'comp-01',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'usr-hr-01',
          firebase_uid: 'seed-hr-001',
          email: 'hr@ats.local',
          full_name: 'Helen Recruiter',
          role: 'HR',
          company_id: 'comp-01',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'usr-cand-01',
          firebase_uid: 'seed-cand-001',
          email: 'candidate@ats.local',
          full_name: 'Charlie Candidate',
          role: 'CANDIDATE',
          company_id: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch Company Config
  const fetchCompany = async () => {
    try {
      const res = await apiClient.get('/admin/company');
      if (res.data?.company) {
        setCompany(res.data.company);
      }
    } catch {
      // Keep initial default company
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCompany();
  }, [roleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  // Execute Role Update
  const handleSaveRole = async () => {
    if (!editingUser) return;
    setIsUpdatingRole(true);
    try {
      await apiClient.patch(`/admin/users/${editingUser.id}/role`, {
        role: selectedRole,
      });

      setBannerMessage({
        type: 'success',
        text: `Role for ${editingUser.full_name} updated to ${selectedRole}`,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? { ...u, role: selectedRole } : u))
      );
      setEditingUser(null);
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update user role',
      });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  // Execute Status Toggle
  const handleToggleStatus = async () => {
    if (!statusUser) return;
    setIsUpdatingStatus(true);
    const newStatus = !statusUser.is_active;
    try {
      await apiClient.patch(`/admin/users/${statusUser.id}/status`, {
        isActive: newStatus,
      });

      setBannerMessage({
        type: 'success',
        text: `Account for ${statusUser.full_name} is now ${newStatus ? 'Active' : 'Deactivated'}`,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === statusUser.id ? { ...u, is_active: newStatus } : u))
      );
      setStatusUser(null);
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update user status',
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Execute Company Save
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanySuccess(false);
    try {
      await apiClient.put('/admin/company', company);
      setCompanySuccess(true);
      setBannerMessage({
        type: 'success',
        text: 'Company organization settings saved successfully',
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save company settings',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'primary';
      case 'HR':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Administration & Governance</h1>
            <Badge variant="primary" size="sm">
              Floor 6 (Admin API & RBAC)
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage user directory permissions, company branding, and system-wide security settings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            isLoading={loadingUsers}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh Directory
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {bannerMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm transition ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-xs font-semibold underline hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'users'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          User Directory & Roles ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('company')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
            activeTab === 'company'
              ? 'border-brand-600 text-brand-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Company & Settings
        </button>
      </div>

      {/* Tab 1: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <form onSubmit={handleSearchSubmit} className="flex-1 w-full md:max-w-md">
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Roles' },
                  { value: 'ADMIN', label: 'Administrators' },
                  { value: 'HR', label: 'HR & Recruiters' },
                  { value: 'CANDIDATE', label: 'Candidates' },
                ]}
              />
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3.5">User</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Account Status</th>
                    <th className="px-6 py-3.5">Created Date</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No users match the selected query.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-sm">
                              {user.full_name?.slice(0, 2).toUpperCase() || 'US'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight">
                                {user.full_name}
                              </p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={getRoleBadgeVariant(user.role)}>
                            {user.role}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              user.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            ></span>
                            {user.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setSelectedRole(user.role);
                              }}
                              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            >
                              Role
                            </Button>

                            <button
                              onClick={() => setStatusUser(user)}
                              className={`p-1.5 rounded-lg border transition ${
                                user.is_active
                                  ? 'text-slate-400 hover:text-rose-600 hover:border-rose-300 bg-white'
                                  : 'text-emerald-600 hover:bg-emerald-50 border-emerald-300 bg-emerald-50/50'
                              }`}
                              title={user.is_active ? 'Deactivate Account' : 'Activate Account'}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Company Configuration */}
      {activeTab === 'company' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Organization Settings</h2>
            <p className="text-xs text-slate-500">
              Customize your company name, recruitment domain, and automated candidate screening rules.
            </p>
          </div>

          <form onSubmit={handleSaveCompany} className="space-y-4">
            <Input
              label="Company Name"
              value={company.name}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
              required
            />

            <Input
              label="Recruitment Domain"
              value={company.domain || ''}
              onChange={(e) => setCompany({ ...company, domain: e.target.value })}
              placeholder="e.g. acme.com or hiring.acme.local"
            />

            <Input
              label="Logo URL"
              value={company.logo_url || ''}
              onChange={(e) => setCompany({ ...company, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="System Timezone"
                value={company.settings?.timezone || 'UTC'}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    settings: { ...company.settings, timezone: e.target.value },
                  })
                }
              />

              <Input
                label="Default Currency"
                value={company.settings?.defaultCurrency || 'USD'}
                onChange={(e) =>
                  setCompany({
                    ...company,
                    settings: { ...company.settings, defaultCurrency: e.target.value },
                  })
                }
              />
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              {companySuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Settings updated
                </span>
              )}
              <Button type="submit" variant="primary">
                Save Organization Settings
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Role Modification Modal */}
      <Modal
        isOpen={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Update User Privilege"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingUser(null)}
              disabled={isUpdatingRole}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveRole}
              isLoading={isUpdatingRole}
            >
              Save New Role
            </Button>
          </div>
        }
      >
        {editingUser && (
          <div className="space-y-4 py-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 font-medium">Target User</p>
              <p className="font-semibold text-sm text-slate-800">{editingUser.full_name}</p>
              <p className="text-xs text-slate-500">{editingUser.email}</p>
            </div>

            <Select
              label="Assigned System Role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              options={[
                { value: 'CANDIDATE', label: 'CANDIDATE (Applicant Portal & Job Applications)' },
                { value: 'HR', label: 'HR / Recruiter (Pipeline, Job Postings, Interviews)' },
                { value: 'ADMIN', label: 'ADMIN (Full System Administration & User Management)' },
              ]}
            />

            <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
              Changing a role instantly updates the user record in PostgreSQL and synchronizes Firebase Auth custom claims.
            </div>
          </div>
        )}
      </Modal>

      {/* Status Confirmation Modal */}
      <Modal
        isOpen={Boolean(statusUser)}
        onClose={() => setStatusUser(null)}
        title={statusUser?.is_active ? 'Deactivate Account' : 'Reactivate Account'}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStatusUser(null)}
              disabled={isUpdatingStatus}
            >
              Cancel
            </Button>
            <Button
              variant={statusUser?.is_active ? 'danger' : 'primary'}
              size="sm"
              onClick={handleToggleStatus}
              isLoading={isUpdatingStatus}
            >
              {statusUser?.is_active ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        }
      >
        {statusUser && (
          <div className="py-2 text-sm text-slate-600 space-y-2">
            <p>
              Are you sure you want to{' '}
              <span className="font-semibold text-slate-900">
                {statusUser.is_active ? 'deactivate' : 'activate'}
              </span>{' '}
              the account for <span className="font-semibold">{statusUser.full_name}</span>?
            </p>
            {statusUser.is_active && (
              <p className="text-xs text-rose-600">
                Deactivating will revoke all active refresh tokens. The user will be blocked from accessing the system.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
