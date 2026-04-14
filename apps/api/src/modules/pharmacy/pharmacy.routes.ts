import { Router } from 'express';
import {
  getMedications,
  getMedication,
  createMedication,
  updateMedication,
  checkInteractions,
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  getLowStockAlerts,
  getExpiryAlerts,
  getSuppliers,
  createSupplier,
  createPurchaseOrder,
  getPurchaseOrders,
} from './pharmacy.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Medications
router.get('/medications', getMedications);
router.post('/medications', createMedication);
router.get('/medications/:id', getMedication);
router.put('/medications/:id', updateMedication);
router.get('/medications/:id/check-interactions', checkInteractions);

// Inventory alerts (must be before /:id)
router.get('/inventory/low-stock', getLowStockAlerts);
router.get('/inventory/expiry-alerts', getExpiryAlerts);

// Inventory
router.get('/inventory', getInventory);
router.post('/inventory', createInventoryItem);
router.get('/inventory/:id', getInventoryItem);
router.put('/inventory/:id', updateInventoryItem);
router.post('/inventory/:id/adjust', adjustStock);

// Suppliers
router.get('/suppliers', getSuppliers);
router.post('/suppliers', createSupplier);

// Purchase Orders
router.get('/purchase-orders', getPurchaseOrders);
router.post('/purchase-orders', createPurchaseOrder);

export default router;
