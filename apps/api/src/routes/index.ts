import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import patientRoutes from '../modules/patients/patient.routes';
import doctorRoutes from '../modules/doctors/doctor.routes';
import serviceRoutes from '../modules/services/service.routes';
import consultationRoutes from '../modules/consultations/consultation.routes';
import billingRoutes from '../modules/billing/billing.routes';
import departmentRoutes from '../modules/departments/department.routes';
import emrRoutes from '../modules/emr/emr.routes';
import labRoutes from '../modules/lab/lab.routes';
import pharmacyRoutes from '../modules/pharmacy/pharmacy.routes';
import queueRoutes from '../modules/queue/queue.routes';
import hmoRoutes from '../modules/hmo/hmo.routes';
import philhealthRoutes from '../modules/philhealth/philhealth.routes';
import accountingRoutes from '../modules/accounting/accounting.routes';
import analyticsRoutes from '../modules/analytics/analytics.routes';
import admissionsRoutes from '../modules/admissions/admissions.routes';
import orRoutes from '../modules/or/or.routes';
import bloodbankRoutes from '../modules/bloodbank/bloodbank.routes';
import assetsRoutes from '../modules/assets/assets.routes';
import dialysisRoutes from '../modules/dialysis/dialysis.routes';
import philhealthEClaimsRoutes from '../modules/philhealth-eclaims/philhealth-eclaims.routes';
import hmoApiRoutes from '../modules/hmo-api/hmo-api.routes';
import dohRoutes from '../modules/doh/doh.routes';
import barcodeRoutes from '../modules/barcode/barcode.routes';
import telemedicineRoutes from '../modules/telemedicine/telemedicine.routes';
import aiRoutes from '../modules/ai/ai.routes';
import nursesRoutes from '../modules/nurses/nurses.routes';
import smsRoutes from '../modules/sms/sms.routes';
import onlinePaymentRoutes from '../modules/payments/payments.routes';
import appointmentRoutes from '../modules/appointments/appointments.routes';
import hieRoutes from '../modules/hie/hie.routes';
import patientPortalRoutes from '../modules/patient-portal/patient-portal.routes';
import usersRoutes from '../modules/users/users.routes';
import auditRoutes from '../modules/audit/audit.routes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/doctors', doctorRoutes);
router.use('/services', serviceRoutes);
router.use('/consultations', consultationRoutes);
router.use('/billing', billingRoutes);
router.use('/departments', departmentRoutes);

// Phase 2 modules — routes are mounted directly (they declare full paths internally)
router.use('/', emrRoutes);
router.use('/', labRoutes);
router.use('/', pharmacyRoutes);
router.use('/', queueRoutes);
router.use('/', hmoRoutes);

// Phase 3 modules
router.use('/', philhealthRoutes);
router.use('/', accountingRoutes);
router.use('/', analyticsRoutes);

// Phase 4 modules
router.use('/', admissionsRoutes);
router.use('/', orRoutes);
router.use('/', bloodbankRoutes);
router.use('/', assetsRoutes);
router.use('/', dialysisRoutes);

// Phase 5 modules
router.use('/', philhealthEClaimsRoutes);
router.use('/', hmoApiRoutes);
router.use('/', dohRoutes);
router.use('/', barcodeRoutes);

// Phase 6 modules
router.use('/', telemedicineRoutes);
router.use('/', aiRoutes);
router.use('/', nursesRoutes);

// Phase 7 modules
router.use('/', smsRoutes);
router.use('/', onlinePaymentRoutes);
router.use('/', appointmentRoutes);
router.use('/', hieRoutes);
router.use('/', patientPortalRoutes);
router.use('/', usersRoutes);
router.use('/', auditRoutes);

// API info
router.get('/', (_req, res) => {
  res.json({
    name: 'iHIMS API',
    version: '2.0.0',
    description: 'intelligent Hospital Information System',
  });
});
