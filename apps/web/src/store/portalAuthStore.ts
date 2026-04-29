import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PortalPatient {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
}

interface PortalAuthState {
  patient: PortalPatient | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (patient: PortalPatient, token: string) => void;
  logout: () => void;
}

export const usePortalAuthStore = create<PortalAuthState>()(
  persist(
    (set) => ({
      patient: null,
      token: null,
      isAuthenticated: false,
      login: (patient, token) => {
        localStorage.setItem('portal_token', token);
        set({ patient, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('portal_token');
        set({ patient: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'pibs_portal_auth',
      partialize: (s) => ({ patient: s.patient, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);
