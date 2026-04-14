import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z
    .enum([
      'SUPER_ADMIN',
      'ADMIN',
      'DOCTOR',
      'NURSE',
      'RECEPTIONIST',
      'BILLING',
      'PHARMACIST',
      'LAB_TECH',
      'RADIOLOGY_TECH',
      'PATIENT',
    ])
    .default('RECEPTIONIST'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
