import { Router } from 'express';
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  sendSms,
  sendBulkSms,
  getLogs,
  getStats,
  sendAppointmentReminder,
} from './sms.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/sms/templates', getTemplates);
router.post('/sms/templates', createTemplate);
router.put('/sms/templates/:id', updateTemplate);
router.delete('/sms/templates/:id', deleteTemplate);
router.post('/sms/send', sendSms);
router.post('/sms/send-bulk', sendBulkSms);
router.get('/sms/logs', getLogs);
router.get('/sms/stats', getStats);
router.post('/sms/appointment-reminder/:appointmentId', sendAppointmentReminder);

export default router;
