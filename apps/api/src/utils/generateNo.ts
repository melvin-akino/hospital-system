import { prisma } from '../lib/prisma';

const pad = (n: number, len = 6): string => String(n).padStart(len, '0');

export const generatePatientNo = async (): Promise<string> => {
  const count = await prisma.patient.count();
  return `PAT-${pad(count + 1)}`;
};

export const generateBillNo = async (): Promise<string> => {
  const count = await prisma.bill.count();
  const year = new Date().getFullYear();
  return `BILL-${year}-${pad(count + 1)}`;
};

export const generateConsultationNo = async (): Promise<string> => {
  const count = await prisma.consultation.count();
  const date = new Date();
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `CON-${ym}-${pad(count + 1)}`;
};

export const generateDoctorNo = async (): Promise<string> => {
  const count = await prisma.doctor.count();
  return `DOC-${pad(count + 1)}`;
};

export const generateAdmissionNo = async (): Promise<string> => {
  const count = await prisma.admission.count();
  const year = new Date().getFullYear();
  return `ADM-${year}-${pad(count + 1)}`;
};

export const generateLabRequisitionNo = async (): Promise<string> => {
  const count = await prisma.labRequisition.count();
  return `LAB-${pad(count + 1)}`;
};

export const generateLabResultNo = async (): Promise<string> => {
  const count = await prisma.labResult.count();
  return `LR-${pad(count + 1)}`;
};

export const generateRadiologyOrderNo = async (): Promise<string> => {
  const count = await prisma.radiologyOrder.count();
  return `RAD-${pad(count + 1)}`;
};

export const generateAppointmentNo = async (): Promise<string> => {
  const count = await prisma.appointment.count();
  return `APT-${pad(count + 1)}`;
};

export const generateSurgeryNo = async (): Promise<string> => {
  const count = await prisma.surgery.count();
  return `SUR-${pad(count + 1)}`;
};

export const generateDialysisSessionNo = async (): Promise<string> => {
  const count = await prisma.dialysisSession.count();
  return `DLY-${pad(count + 1)}`;
};

export const generateOrNumber = async (): Promise<string> => {
  const count = await prisma.payment.count();
  const year = new Date().getFullYear();
  return `OR-${year}-${pad(count + 1)}`;
};

export const generateHmoClaimNo = async (): Promise<string> => {
  const count = await prisma.hmoClaim.count();
  return `HMO-${pad(count + 1)}`;
};

export const generatePhilHealthClaimNo = async (): Promise<string> => {
  const count = await prisma.philHealthClaim.count();
  return `PH-${pad(count + 1)}`;
};

export const generatePoNumber = async (): Promise<string> => {
  const count = await prisma.purchaseOrder.count();
  return `PO-${pad(count + 1)}`;
};

export const generateGlEntryNo = async (): Promise<string> => {
  const count = await prisma.glEntry.count();
  return `GL-${pad(count + 1)}`;
};
