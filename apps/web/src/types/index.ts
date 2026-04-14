export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  success: boolean;
  message: string;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface Patient {
  id: string;
  patientNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodType?: string;
  civilStatus?: string;
  nationality: string;
  religion?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  isSenior: boolean;
  isPwd: boolean;
  pwdIdNo?: string;
  seniorIdNo?: string;
  philhealthNo?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: string;
  userId?: string;
  doctorNo: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  licenseNo: string;
  prcExpiryDate?: string;
  specialty: string;
  subspecialty?: string;
  departmentId?: string;
  department?: Department;
  consultingFee: number;
  bio?: string;
  photoUrl?: string;
  isActive: boolean;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  schedules?: DoctorSchedule[];
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { doctors: number; rooms: number };
}

export interface Service {
  id: string;
  serviceCode: string;
  serviceName: string;
  categoryId?: string;
  category?: ServiceCategory;
  basePrice: number;
  durationMinutes?: number;
  isDiscountable: boolean;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  _count?: { services: number };
}

export interface Consultation {
  id: string;
  consultationNo: string;
  patientId: string;
  patient?: Partial<Patient>;
  doctorId: string;
  doctor?: Partial<Doctor>;
  consultationType: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  scheduledAt: string;
  completedAt?: string;
  chiefComplaint?: string;
  findings?: string;
  assessment?: string;
  treatmentPlan?: string;
  icdCodes: string[];
  createdAt: string;
  updatedAt: string;
  bill?: Partial<Bill>;
}

export interface Bill {
  id: string;
  billNo: string;
  patientId: string;
  patient?: Partial<Patient>;
  consultationId?: string;
  consultation?: Partial<Consultation>;
  admissionId?: string;
  status: 'DRAFT' | 'FINALIZED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
  subtotal: number;
  discountType?: string;
  discountPercent: number;
  discountAmount: number;
  philhealthDeduction: number;
  hmoDeduction: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  orNumber?: string;
  notes?: string;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  items?: BillItem[];
  payments?: Payment[];
}

export interface BillItem {
  id: string;
  billId: string;
  serviceId?: string;
  service?: Partial<Service>;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Payment {
  id: string;
  billId: string;
  amount: number;
  method: string;
  referenceNo?: string;
  receivedBy?: string;
  notes?: string;
  paidAt: string;
}

export interface HmoCompany {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface VitalSign {
  id: string;
  patientId: string;
  temperature?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  recordedAt: string;
  recordedBy?: string;
  notes?: string;
}

export interface SearchParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}
