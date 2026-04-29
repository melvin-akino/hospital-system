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
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getInventoryBatches,
  updateInventoryBatch,
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
router.get('/inventory/:itemId/batches', getInventoryBatches);

// Batch/Lot management
router.put('/inventory/batches/:batchId', updateInventoryBatch);

// Suppliers
router.get('/suppliers',      getSuppliers);
router.post('/suppliers',     createSupplier);
router.get('/suppliers/:id',  getSupplier);
router.put('/suppliers/:id',  updateSupplier);
router.delete('/suppliers/:id', deleteSupplier);

// Purchase Orders
router.get('/purchase-orders',              getPurchaseOrders);
router.post('/purchase-orders',             createPurchaseOrder);
router.get('/purchase-orders/:id',          getPurchaseOrder);
router.put('/purchase-orders/:id',          updatePurchaseOrder);
router.post('/purchase-orders/:id/receive', receivePurchaseOrder);
router.post('/purchase-orders/:id/cancel',  cancelPurchaseOrder);

export default router;
