import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../services/apiClient';

export interface AdminUserRecord {
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

export interface UseAdminUsersReturn {
  users: AdminUserRecord[];
  loading: boolean;
  error: string | null;
  fetchUsers: (query?: string, role?: string) => Promise<void>;
  updateUserRole: (userId: string, role: 'ADMIN' | 'HR' | 'CANDIDATE') => Promise<AdminUserRecord>;
  toggleUserStatus: (userId: string, isActive: boolean) => Promise<AdminUserRecord>;
}

export function useAdminUsers(initialRoleFilter = ''): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (searchQuery?: string, roleFilter?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (searchQuery) params.q = searchQuery;
      if (roleFilter) params.role = roleFilter;

      const response = await apiClient.get('/admin/users', { params });
      if (response.data?.users) {
        setUsers(response.data.users);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch user directory';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers('', initialRoleFilter);
  }, [fetchUsers, initialRoleFilter]);

  const updateUserRole = useCallback(
    async (userId: string, role: 'ADMIN' | 'HR' | 'CANDIDATE'): Promise<AdminUserRecord> => {
      try {
        const response = await apiClient.patch(`/admin/users/${userId}/role`, { role });
        const updatedUser = response.data.user;
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updatedUser.role } : u)));
        return updatedUser;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to update user role';
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  const toggleUserStatus = useCallback(
    async (userId: string, isActive: boolean): Promise<AdminUserRecord> => {
      try {
        const response = await apiClient.patch(`/admin/users/${userId}/status`, { isActive });
        const updatedUser = response.data.user;
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: updatedUser.is_active } : u)));
        return updatedUser;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to update user status';
        setError(msg);
        throw new Error(msg);
      }
    },
    []
  );

  return {
    users,
    loading,
    error,
    fetchUsers,
    updateUserRole,
    toggleUserStatus,
  };
}
