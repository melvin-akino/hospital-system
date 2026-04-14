export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export type DiscountType = 'SENIOR' | 'PWD' | 'EMPLOYEE' | 'PHILHEALTH' | 'HMO' | 'NONE';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';
export type BloodType =
  | 'A_POSITIVE'
  | 'A_NEGATIVE'
  | 'B_POSITIVE'
  | 'B_NEGATIVE'
  | 'AB_POSITIVE'
  | 'AB_NEGATIVE'
  | 'O_POSITIVE'
  | 'O_NEGATIVE';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type BillStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'PARTIAL' | 'CANCELLED';
export type ConsultationStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';
export type AdmissionStatus = 'ADMITTED' | 'DISCHARGED' | 'TRANSFERRED';
export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'BILLING'
  | 'PHARMACIST'
  | 'LAB_TECH'
  | 'RADIOLOGY_TECH'
  | 'PATIENT';

export type PaymentMethod =
  | 'CASH'
  | 'GCASH'
  | 'MAYA'
  | 'CREDIT_CARD'
  | 'DEBIT_CARD'
  | 'BANK_TRANSFER'
  | 'CHECK'
  | 'HMO'
  | 'PHILHEALTH';

export type RequisitionStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
