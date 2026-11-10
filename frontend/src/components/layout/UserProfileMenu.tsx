import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Settings, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ROUTES } from '../../constants/routes';

export interface UserProfileMenuProps {
  user?: {
    uid?: string;
    email?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    role?: string;
  } | null;
  onLogout?: () => Promise<void> | void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ user, onLogout }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (onLogout) {
        await onLogout();
      }
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
      setDropdownOpen(false);
    }
  };

  const displayName = user?.fullName || user?.email?.split('@')[0] || 'ATS Member';
  const displayEmail = user?.email || 'user@ats.internal';
  const role = (user?.role || 'CANDIDATE').toUpperCase();

  // Role Badge Variant
  const getBadgeVariant = (userRole: string) => {
    switch (userRole) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return 'primary';
      case 'HR':
      case 'HR_MANAGER':
      case 'RECRUITER':
        return 'warning';
      default:
        return 'default';
    }
  };

  // User initials for avatar fallback
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Avatar / Trigger Button */}
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-expanded={dropdownOpen}
        aria-haspopup="true"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
            {getInitials(displayName)}
          </div>
        )}

        <div className="hidden lg:flex flex-col text-left leading-tight pr-1">
          <span className="text-xs font-semibold text-slate-800 truncate max-w-[120px]">{displayName}</span>
          <span className="text-[10px] text-slate-500 capitalize">{role.toLowerCase()}</span>
        </div>

        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {/* Dropdown Menu */}
      {dropdownOpen && (
        <div className="origin-top-right absolute right-0 mt-2 w-64 rounded-xl shadow-xl bg-white border border-slate-200 ring-1 ring-black/5 divide-y divide-slate-100 focus:outline-none z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User Info Header */}
          <div className="p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-sm font-semibold text-slate-900 truncate">{displayName}</span>
              <Badge variant={getBadgeVariant(role)} size="sm">
                {role}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
          </div>

          {/* Quick Links */}
          <div className="py-1">
            <Link
              to={ROUTES.CANDIDATE}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
            >
              <User className="w-4 h-4 text-slate-400" />
              Candidate Profile
            </Link>

            <Link
              to={ROUTES.HR_PIPELINE}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              HR Workspace
            </Link>

            {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
              <Link
                to={ROUTES.ADMIN}
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
              >
                <ShieldCheck className="w-4 h-4 text-slate-400" />
                Admin Dashboard
              </Link>
            )}

            <Link
              to={ROUTES.SETTINGS}
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand-600 transition"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              Account Settings
            </Link>
          </div>

          {/* Logout Action */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                setLogoutModalOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              Sign Out
            </button>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        title="Confirm Sign Out"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogoutModalOpen(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmLogout}
              isLoading={isLoggingOut}
            >
              Sign Out
            </Button>
          </div>
        }
      >
        <div className="py-2 text-sm text-slate-600">
          <p className="mb-2">Are you sure you want to end your current session?</p>
          <p className="text-xs text-slate-500">
            You will need to sign back in to view your candidate applications, interview schedules, or recruitment pipelines.
          </p>
        </div>
      </Modal>
    </div>
  );
};
