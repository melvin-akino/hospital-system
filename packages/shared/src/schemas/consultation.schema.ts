import { z } from 'zod';

export const createConsultationSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  consultationType: z.string().default('OPD'),
  scheduledAt: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  chiefComplaint: z.string().optional(),
  findings: z.string().optional(),
  assessment: z.string().optional(),
  treatmentPlan: z.string().optional(),
  icdCodes: z.array(z.string()).default([]),
});

export const updateConsultationSchema = createConsultationSchema.partial().extend({
  status: z
    .enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .optional(),
  completedAt: z.string().optional(),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
