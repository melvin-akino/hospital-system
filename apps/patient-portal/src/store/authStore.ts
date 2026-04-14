import { create } from 'zustand';

export interface PatientProfile {
  id: string;
  patientNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  philhealthNo?: string;
  isSenior?: boolean;
  isPwd?: boolean;
}

interface PatientAuthState {
  token: string | null;
  patient: PatientProfile | null;
  isAuthenticated: boolean;
  login: (token: string, patient: PatientProfile) => void;
  logout: () => void;
  setPatient: (patient: PatientProfile) => void;
}

const storedToken = localStorage.getItem('patient_portal_token');
const storedPatientRaw = localStorage.getItem('patient_portal_patient');
let storedPatient: PatientProfile | null = null;
try {
  storedPatient = storedPatientRaw ? JSON.parse(storedPatientRaw) : null;
} catch {
  storedPatient = null;
}

export const usePatientAuthStore = create<PatientAuthState>()((set) => ({
  token: storedToken,
  patient: storedPatient,
  isAuthenticated: !!storedToken && !!storedPatient,

  login: (token: string, patient: PatientProfile) => {
    localStorage.setItem('patient_portal_token', token);
    localStorage.setItem('patient_portal_patient', JSON.stringify(patient));
    set({ token, patient, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('patient_portal_token');
    localStorage.removeItem('patient_portal_patient');
    set({ token: null, patient: null, isAuthenticated: false });
  },

  setPatient: (patient: PatientProfile) => {
    localStorage.setItem('patient_portal_patient', JSON.stringify(patient));
    set({ patient });
  },
}));
