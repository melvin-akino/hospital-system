import { Router } from 'express';
import {
  getChartOfAccounts,
  createAccount,
  updateAccount,
  getGLEntries,
  createGLEntry,
  getTrialBalance,
  getIncomeStatement,
  getBalanceSheet,
} from './accounting.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

// Chart of Accounts
router.get('/chart-of-accounts', getChartOfAccounts);
router.post('/chart-of-accounts', createAccount);
router.put('/chart-of-accounts/:id', updateAccount);

// GL Entries
router.get('/gl-entries', getGLEntries);
router.post('/gl-entries', createGLEntry);

// Reports
router.get('/reports/trial-balance', getTrialBalance);
router.get('/reports/income-statement', getIncomeStatement);
router.get('/reports/balance-sheet', getBalanceSheet);

export default router;
