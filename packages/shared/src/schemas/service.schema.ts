import { z } from 'zod';

export const createServiceSchema = z.object({
  serviceCode: z.string().min(1, 'Service code is required'),
  serviceName: z.string().min(1, 'Service name is required'),
  categoryId: z.string().uuid().optional(),
  basePrice: z.number().min(0),
  durationMinutes: z.number().int().min(1).optional(),
  isDiscountable: z.boolean().default(true),
  description: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

export const createServiceCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateServiceCategoryInput = z.infer<typeof createServiceCategorySchema>;
