import { z } from 'zod';

export const createBillSchema = z.object({
  patientId: z.string().uuid(),
  consultationId: z.string().uuid().optional(),
  admissionId: z.string().uuid().optional(),
  discountType: z.string().optional(),
  discountPercent: z.number().min(0).max(100).default(0),
  philhealthDeduction: z.number().min(0).default(0),
  hmoDeduction: z.number().min(0).default(0),
  notes: z.string().optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid().optional(),
        description: z.string().min(1),
        quantity: z.number().int().min(1).default(1),
        unitPrice: z.number().min(0),
        discount: z.number().min(0).default(0),
      })
    )
    .min(1, 'At least one item is required'),
});

export const addPaymentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  method: z.enum([
    'CASH',
    'GCASH',
    'MAYA',
    'CREDIT_CARD',
    'DEBIT_CARD',
    'BANK_TRANSFER',
    'CHECK',
    'HMO',
    'PHILHEALTH',
  ]),
  referenceNo: z.string().optional(),
  receivedBy: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateBillInput = z.infer<typeof createBillSchema>;
export type AddPaymentInput = z.infer<typeof addPaymentSchema>;
