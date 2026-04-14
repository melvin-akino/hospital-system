import { z } from 'zod';

export const createDoctorSchema = z.object({
  userId: z.string().uuid().optional(),
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  licenseNo: z.string().min(1, 'License number is required'),
  prcExpiryDate: z.string().optional(),
  specialty: z.string().min(1, 'Specialty is required'),
  subspecialty: z.string().optional(),
  departmentId: z.string().uuid().optional(),
  consultingFee: z.number().min(0).default(0),
  bio: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
});

export const updateDoctorSchema = createDoctorSchema.partial();

export const createScheduleSchema = z.object({
  doctorId: z.string().uuid(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format HH:MM'),
  slotDuration: z.number().int().min(5).default(30),
  isActive: z.boolean().default(true),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
