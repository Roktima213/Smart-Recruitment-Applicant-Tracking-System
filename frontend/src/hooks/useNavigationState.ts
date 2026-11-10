import { useState, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../constants/routes';

export type UserRole = 'ADMIN' | 'HR' | 'CANDIDATE';

export interface NavItem {
  name: string;
  path: string;
  allowedRoles?: UserRole[];
  badge?: string;
}

export function useNavigationState(userRole?: UserRole) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const location = useLocation();

  const toggleDrawer = useCallback(() => {
    setMobileDrawerOpen((prev) => !prev);
  }, []);

  const closeDrawer = useCallback(() => {
    setMobileDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setMobileDrawerOpen(true);
  }, []);

  /**
   * Evaluates if a given path is currently active, with support for nested sub-routes.
   */
  const isRouteActive = useCallback(
    (targetPath: string): boolean => {
      if (targetPath === ROUTES.HOME) {
        return location.pathname === ROUTES.HOME;
      }
      if (targetPath.startsWith('/hr')) {
        return location.pathname.startsWith('/hr');
      }
      return location.pathname.startsWith(targetPath);
    },
    [location.pathname]
  );

  /**
   * Generates breadcrumbs from the current pathname.
   */
  const breadcrumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
      return [{ label: 'Home', path: ROUTES.HOME }];
    }

    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ');
      return { label, path };
    });
  }, [location.pathname]);

  /**
   * Filters navigation items based on current active user role.
   */
  const filterAllowedItems = useCallback(
    (items: NavItem[]): NavItem[] => {
      if (!userRole) return items;
      return items.filter((item) => {
        if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
        return item.allowedRoles.includes(userRole);
      });
    },
    [userRole]
  );

  return {
    currentPath: location.pathname,
    mobileDrawerOpen,
    toggleDrawer,
    closeDrawer,
    openDrawer,
    isRouteActive,
    breadcrumbs,
    filterAllowedItems,
  };
}
