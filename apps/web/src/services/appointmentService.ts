import api from '../lib/api';

export interface Appointment {
  id: string;
  appointmentNo: string;
  patientId: string;
  doctorId: string | null;
  serviceId: string | null;
  scheduledAt: string;
  duration: number;
  status: string;
  notes: string | null;
  createdAt: string;
  patient?: {
    id: string;
    patientNo: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
}

export interface DoctorAvailability {
  doctorId: string;
  date: string;
  schedule: { startTime: string; endTime: string; slotDuration: number };
  bookedSlots: string[];
  availableSlots: string[];
  allSlots: string[];
}

export const appointmentService = {
  getAppointments: (params?: Record<string, string>): Promise<{ data: Appointment[]; total: number }> =>
    api.get('/appointments', { params }).then((r) => r.data),
  getAppointment: (id: string): Promise<Appointment> =>
    api.get(`/appointments/${id}`).then((r) => r.data.data),
  createAppointment: (data: {
    patientId: string;
    doctorId?: string;
    serviceId?: string;
    scheduledAt: string;
    duration?: number;
    notes?: string;
  }): Promise<Appointment> =>
    api.post('/appointments', data).then((r) => r.data.data),
  updateAppointment: (id: string, data: Partial<Appointment>): Promise<Appointment> =>
    api.put(`/appointments/${id}`, data).then((r) => r.data.data),
  cancelAppointment: (id: string): Promise<Appointment> =>
    api.delete(`/appointments/${id}`).then((r) => r.data.data),
  getDoctorAvailability: (doctorId: string, date: string): Promise<DoctorAvailability> =>
    api.get(`/appointments/availability/${doctorId}`, { params: { date } }).then((r) => r.data.data),
  getTodayAppointments: (): Promise<Appointment[]> =>
    api.get('/appointments/today').then((r) => r.data.data),
};
