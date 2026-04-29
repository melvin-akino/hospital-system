import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserPermission {
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  displayName?: string;
  phone?: string;
  departmentId?: string | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  doctor?: {
    id: string;
    firstName: string;
    lastName: string;
    specialty: string;
  } | null;
  permissions?: UserPermission[];
}

/** Map role → default dashboard path after login */
export function getDashboardPath(user: AuthUser): string {
  const role = user.role;
  const dept = user.departmentCode?.toUpperCase();

  // Admins always go to the main dashboard
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return '/dashboard';

  // Role-specific non-dept dashboards
  switch (role) {
    case 'BILLING':
    case 'BILLING_SUPERVISOR': return '/billing';
    case 'PHARMACIST':         return '/pharmacy-queue';
    case 'LAB_TECH':           return '/lab-queue';
    case 'RADIOLOGY_TECH':     return '/radiology-queue';
  }

  // RECEPTIONIST — admitting desk by default, department-specific if assigned
  if (role === 'RECEPTIONIST') {
    if (dept === 'ER' || dept === 'EMERGENCY') return '/er-dashboard';
    if (dept === 'MED-REC' || dept === 'MEDREC') return '/medical-records';
    return '/admitting'; // default: admitting desk
  }

  // NURSE — route by department
  if (role === 'NURSE') {
    if (dept === 'ER' || dept === 'EMERGENCY') return '/er-dashboard';
    if (dept === 'OR') return '/or-dashboard';
    if (dept === 'ICU' || dept === 'CCU') return '/icu-dashboard';
    if (dept === 'OB' || dept === 'DR' || dept === 'OB-GYN') return '/ob-dashboard';
    if (dept === 'CSR') return '/csr-queue';
    if (dept === 'MED-REC' || dept === 'MEDREC') return '/medical-records';
    return '/nursing-station';
  }

  // DOCTOR — specialty-based routing if assigned to a department
  if (role === 'DOCTOR') {
    if (dept === 'OR') return '/or-dashboard';
    if (dept === 'ICU' || dept === 'CCU') return '/icu-dashboard';
    if (dept === 'OB' || dept === 'DR' || dept === 'OB-GYN') return '/ob-dashboard';
    if (dept === 'ER' || dept === 'EMERGENCY') return '/er-dashboard';
    return '/workspace';
  }

  return '/dashboard';
}

/** Helper: check if a user has a specific permission on a module */
export function hasPermission(
  user: AuthUser | null,
  module: string,
  flag: keyof Omit<UserPermission, 'module'>
): boolean {
  if (!user) return false;
  // Admins have everything
  if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
  const perm = user.permissions?.find((p) => p.module === module);
  return perm?.[flag] ?? false;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => {
        localStorage.setItem('ihims_token', token);
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('ihims_token');
        localStorage.removeItem('ihims_user');
        set({ user: null, token: null, isAuthenticated: false });
      },
      updateUser: (partialUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partialUser } : null,
        })),
    }),
    {
      name: 'ihims_auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
