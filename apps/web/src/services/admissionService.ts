import api from '../lib/api';

export interface Room {
  id: string;
  roomNumber: string;
  roomTypeId?: string;
  departmentId?: string;
  floor?: string;
  building?: string;
  beds: number;
  isOccupied: boolean;
  isActive: boolean;
  notes?: string;
  roomType?: { id: string; name: string; ratePerDay: number };
  department?: { id: string; name: string };
  admissions?: Admission[];
}

export interface RoomType {
  id: string;
  name: string;
  ratePerDay: number;
  description?: string;
}

export interface Admission {
  id: string;
  admissionNo: string;
  patientId: string;
  roomId?: string;
  attendingDoctor?: string;
  admittedAt: string;
  dischargedAt?: string;
  status: 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED';
  diagnosis?: string;
  notes?: string;
  daysStayed?: number;
  patient?: { id: string; patientNo: string; firstName: string; lastName: string };
  room?: Room;
}

export interface AdmissionStats {
  totalAdmitted: number;
  availableRooms: number;
  occupancyRate: number;
  avgLengthOfStay: number;
  totalRooms: number;
}

export const admissionService = {
  getRooms: async (params?: Record<string, string>) => {
    const res = await api.get('/rooms', { params });
    return res.data;
  },

  createRoom: async (data: Partial<Room>) => {
    const res = await api.post('/rooms', data);
    return res.data;
  },

  updateRoom: async (id: string, data: Partial<Room>) => {
    const res = await api.put(`/rooms/${id}`, data);
    return res.data;
  },

  getRoomTypes: async () => {
    const res = await api.get('/room-types');
    return res.data;
  },

  createRoomType: async (data: Partial<RoomType>) => {
    const res = await api.post('/room-types', data);
    return res.data;
  },

  getAdmissions: async (params?: Record<string, string | number | undefined>) => {
    const res = await api.get('/admissions', { params });
    return res.data;
  },

  getAdmission: async (id: string) => {
    const res = await api.get(`/admissions/${id}`);
    return res.data;
  },

  createAdmission: async (data: {
    patientId: string;
    roomId?: string;
    attendingDoctor?: string;
    diagnosis?: string;
    notes?: string;
  }) => {
    const res = await api.post('/admissions', data);
    return res.data;
  },

  discharge: async (id: string, data: { dischargeNotes?: string; dischargedAt?: string }) => {
    const res = await api.put(`/admissions/${id}/discharge`, data);
    return res.data;
  },

  getStats: async () => {
    const res = await api.get('/admissions/stats');
    return res.data;
  },
};
