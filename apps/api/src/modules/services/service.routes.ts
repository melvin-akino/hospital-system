import { Router } from 'express';
import {
  createService,
  getServices,
  getService,
  updateService,
  deleteService,
  getCategories,
  createCategory,
  bulkUpdatePrices,
} from './service.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createServiceSchema, updateServiceSchema, createServiceCategorySchema } from '@pibs/shared';

const router = Router();

router.use(authenticate);

router.get('/categories', getCategories);
router.post('/categories', validate(createServiceCategorySchema), createCategory);
router.get('/', getServices);
router.post('/', validate(createServiceSchema), createService);
router.put('/bulk-price', bulkUpdatePrices);
router.get('/:id', getService);
router.put('/:id', validate(updateServiceSchema), updateService);
router.delete('/:id', deleteService);

export default router;
