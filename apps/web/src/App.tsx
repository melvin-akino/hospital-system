import React, { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin, ConfigProvider } from 'antd';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/layout/PrivateRoute';
import { useBrandingStore } from './store/brandingStore';
import { useAuthStore } from './store/authStore';

// Profile & auth extras
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const UnauthorizedPage = lazy(() => import('./pages/auth/UnauthorizedPage'));
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const PatientListPage = lazy(() => import('./pages/patients/PatientListPage'));
const PatientFormPage = lazy(() => import('./pages/patients/PatientFormPage'));
const PatientDetailPage = lazy(() => import('./pages/patients/PatientDetailPage'));
const DoctorListPage = lazy(() => import('./pages/doctors/DoctorListPage'));
const DoctorFormPage = lazy(() => import('./pages/doctors/DoctorFormPage'));
const DoctorProfilePage = lazy(() => import('./pages/doctors/DoctorProfilePage'));
const ServiceListPage = lazy(() => import('./pages/services/ServiceListPage'));
const ServiceFormPage = lazy(() => import('./pages/services/ServiceFormPage'));
const ConsultationListPage = lazy(() => import('./pages/consultations/ConsultationListPage'));
const ConsultationFormPage = lazy(() => import('./pages/consultations/ConsultationFormPage'));
const ConsultationDetailPage = lazy(
  () => import('./pages/consultations/ConsultationDetailPage')
);
const BillingListPage = lazy(() => import('./pages/billing/BillingListPage'));
const BillingFormPage = lazy(() => import('./pages/billing/BillingFormPage'));
const BillingDetailPage = lazy(() => import('./pages/billing/BillingDetailPage'));
const BillingSOAPage    = lazy(() => import('./pages/billing/BillingSOAPage'));

// Phase 2: EMR
const EMRDashboard = lazy(() => import('./pages/emr/EMRDashboard'));

// Phase 2: Laboratory & Radiology
const LabOrderFormPage = lazy(() => import('./pages/lab/LabOrderFormPage'));
const LabRequisitionListPage = lazy(() => import('./pages/lab/LabRequisitionListPage'));
const LabResultEntryPage = lazy(() => import('./pages/lab/LabResultEntryPage'));
const LabResultViewPage = lazy(() => import('./pages/lab/LabResultViewPage'));
const RadiologyOrderFormPage = lazy(() => import('./pages/lab/RadiologyOrderFormPage'));

// Phase 2: Pharmacy & Inventory
const MedicationCatalogPage  = lazy(() => import('./pages/pharmacy/MedicationCatalogPage'));
const InventoryDashboardPage = lazy(() => import('./pages/pharmacy/InventoryDashboardPage'));
const PurchaseOrderFormPage  = lazy(() => import('./pages/pharmacy/PurchaseOrderFormPage'));
const StockAlertsPage        = lazy(() => import('./pages/pharmacy/StockAlertsPage'));
const PharmacyPOSPage        = lazy(() => import('./pages/pharmacy/PharmacyPOSPage'));
const PharmacySalesPage      = lazy(() => import('./pages/pharmacy/PharmacySalesPage'));
const PharmacySuppliersPage    = lazy(() => import('./pages/pharmacy/PharmacySuppliersPage'));
const PurchaseOrdersListPage   = lazy(() => import('./pages/pharmacy/PurchaseOrdersListPage'));

// Phase 2: Queue Management
const QueueDisplayPage = lazy(() => import('./pages/queue/QueueDisplayPage'));
const QueueManagementPage = lazy(() => import('./pages/queue/QueueManagementPage'));

// Phase 2: HMO Processing
const HMORegistrationPage = lazy(() => import('./pages/hmo/HMORegistrationPage'));
const HMOClaimsPage = lazy(() => import('./pages/hmo/HMOClaimsPage'));
const HMOClaimFormPage = lazy(() => import('./pages/hmo/HMOClaimFormPage'));
const EligibilityCheckPage = lazy(() => import('./pages/hmo/EligibilityCheckPage'));

// Phase 3: PhilHealth Claims
const PhilHealthClaimsPage = lazy(() => import('./pages/philhealth/PhilHealthClaimsPage'));
const PhilHealthClaimFormPage = lazy(() => import('./pages/philhealth/PhilHealthClaimFormPage'));
const CaseRatesPage = lazy(() => import('./pages/philhealth/CaseRatesPage'));

// Phase 3: Accounting / GL
const ChartOfAccountsPage = lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
const GLEntryFormPage = lazy(() => import('./pages/accounting/GLEntryFormPage'));
const TrialBalancePage = lazy(() => import('./pages/accounting/TrialBalancePage'));
const IncomeStatementPage = lazy(() => import('./pages/accounting/IncomeStatementPage'));
const BalanceSheetPage = lazy(() => import('./pages/accounting/BalanceSheetPage'));

// Phase 3: Analytics & BI
const AnalyticsDashboard = lazy(() => import('./pages/analytics/AnalyticsDashboard'));
const RevenueReportPage = lazy(() => import('./pages/analytics/RevenueReportPage'));
const PatientMetricsPage = lazy(() => import('./pages/analytics/PatientMetricsPage'));
const DoctorPerformancePage = lazy(() => import('./pages/analytics/DoctorPerformancePage'));

// Phase 4: Rooms & Admissions
const RoomsDashboardPage = lazy(() => import('./pages/admissions/RoomsDashboardPage'));
const AdmissionsListPage = lazy(() => import('./pages/admissions/AdmissionsListPage'));
const AdmissionFormPage = lazy(() => import('./pages/admissions/AdmissionFormPage'));
const DischargeFormPage = lazy(() => import('./pages/admissions/DischargeFormPage'));

// Phase 4: OR Scheduler
const ORSchedulePage = lazy(() => import('./pages/or/ORSchedulePage'));
const SurgeryFormPage = lazy(() => import('./pages/or/SurgeryFormPage'));
const WHOChecklistPage = lazy(() => import('./pages/or/WHOChecklistPage'));

// Phase 4: Blood Bank
const BloodInventoryPage = lazy(() => import('./pages/bloodbank/BloodInventoryPage'));
const DonorDatabasePage = lazy(() => import('./pages/bloodbank/DonorDatabasePage'));
const TransfusionRequestPage = lazy(() => import('./pages/bloodbank/TransfusionRequestPage'));

// Phase 4: Asset Management
const AssetInventoryPage = lazy(() => import('./pages/assets/AssetInventoryPage'));
const AssetFormPage = lazy(() => import('./pages/assets/AssetFormPage'));
const MaintenanceFormPage = lazy(() => import('./pages/assets/MaintenanceFormPage'));
const DepreciationReportPage = lazy(() => import('./pages/assets/DepreciationReportPage'));

// Phase 4: Dialysis Center
const DialysisSchedulePage = lazy(() => import('./pages/dialysis/DialysisSchedulePage'));
const SessionFormPage = lazy(() => import('./pages/dialysis/SessionFormPage'));
const ActiveSessionsPage = lazy(() => import('./pages/dialysis/ActiveSessionsPage'));
const MachineManagementPage = lazy(() => import('./pages/dialysis/MachineManagementPage'));

// Phase 5: Integration & Compliance
const EClaimsPage = lazy(() => import('./pages/philhealth/EClaimsPage'));
const HMODirectBillingPage = lazy(() => import('./pages/hmo/HMODirectBillingPage'));
const DOHReportingPage = lazy(() => import('./pages/doh/DOHReportingPage'));
const BarcodeScannerPage = lazy(() => import('./pages/barcode/BarcodeScannerPage'));
const PatientWristbandPage = lazy(() => import('./pages/barcode/PatientWristbandPage'));

// Phase 6: Telemedicine
const TelemedicineSchedulePage = lazy(() => import('./pages/telemedicine/TelemedicineSchedulePage'));
const TelemedicineBookingPage = lazy(() => import('./pages/telemedicine/TelemedicineBookingPage'));
const VideoConsultationPage = lazy(() => import('./pages/telemedicine/VideoConsultationPage'));
const ConsultationNotesPage = lazy(() => import('./pages/telemedicine/ConsultationNotesPage'));

// Phase 6: AI Clinical Decision Support
const AIClinicalSupportPage = lazy(() => import('./pages/ai/AIClinicalSupportPage'));

// Phase 6: Nursing
const NurseDashboardPage = lazy(() => import('./pages/nurses/NurseDashboardPage'));
const VitalsEntryPage = lazy(() => import('./pages/nurses/VitalsEntryPage'));
const CarePlanPage = lazy(() => import('./pages/nurses/CarePlanPage'));
const ShiftHandoverPage = lazy(() => import('./pages/nurses/ShiftHandoverPage'));

// Phase 7: SMS
const SMSDashboardPage = lazy(() => import('./pages/sms/SMSDashboardPage'));

// Phase 7: Online Payments
const OnlinePaymentPage = lazy(() => import('./pages/payments/OnlinePaymentPage'));
const TransactionHistoryPage = lazy(() => import('./pages/payments/TransactionHistoryPage'));

// Phase 7: Appointments
const AppointmentListPage = lazy(() => import('./pages/appointments/AppointmentListPage'));
const AppointmentFormPage = lazy(() => import('./pages/appointments/AppointmentFormPage'));
const AvailabilityCalendarPage = lazy(() => import('./pages/appointments/AvailabilityCalendarPage'));

// Phase 7: HIE
const HIEDashboardPage = lazy(() => import('./pages/hie/HIEDashboardPage'));

// Departments
const DepartmentListPage = lazy(() => import('./pages/departments/DepartmentListPage'));

// Settings, User Management, Audit Log
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'));
const BackupPage         = lazy(() => import('./pages/settings/BackupPage'));
const UserManagementPage = lazy(() => import('./pages/users/UserManagementPage'));
const AuditLogPage       = lazy(() => import('./pages/audit/AuditLogPage'));

// Department Charges & Approval Queue
const DepartmentChargesPage = lazy(() => import('./pages/dept-charges/DepartmentChargesPage'));
const ChargeRequestsPage = lazy(() => import('./pages/charge-requests/ChargeRequestsPage'));
const OrderedServicesBillingPage = lazy(() => import('./pages/billing/OrderedServicesBillingPage'));

// Admitting
const AdmittingPage         = lazy(() => import('./pages/admitting/AdmittingPage'));
const DischargeSummaryPage  = lazy(() => import('./pages/admitting/DischargeSummaryPage'));
const LabWorkQueuePage      = lazy(() => import('./pages/lab/LabWorkQueuePage'));

// Department Dashboards
const ERDashboardPage       = lazy(() => import('./pages/er/ERDashboardPage'));
const DoctorWorkspacePage   = lazy(() => import('./pages/workspace/DoctorWorkspacePage'));
const NursingStationPage    = lazy(() => import('./pages/nursing/NursingStationPage'));
const PharmacyQueuePage     = lazy(() => import('./pages/pharmacy-queue/PharmacyQueuePage'));
const LabQueuePage          = lazy(() => import('./pages/lab-queue/LabQueuePage'));
const RadiologyQueuePage    = lazy(() => import('./pages/radiology-queue/RadiologyQueuePage'));
const CSRQueuePage          = lazy(() => import('./pages/csr-queue/CSRQueuePage'));
const MedicalRecordsPage    = lazy(() => import('./pages/medical-records/MedicalRecordsPage'));
const ORDashboardPage       = lazy(() => import('./pages/or/ORDashboardPage'));
const ICUDashboardPage      = lazy(() => import('./pages/icu/ICUDashboardPage'));
const OBDashboardPage       = lazy(() => import('./pages/ob/OBDashboardPage'));

// Help Center
const HelpCenterPage = lazy(() => import('./pages/help/HelpCenterPage'));

// Patient Portal (separate layout — no staff nav)
const PortalLoginPage       = lazy(() => import('./pages/portal/PortalLoginPage'));
const PortalLayout          = lazy(() => import('./pages/portal/PortalLayout'));
const PortalDashboard       = lazy(() => import('./pages/portal/PortalDashboard'));
const PortalAppointmentsPage = lazy(() => import('./pages/portal/PortalAppointmentsPage'));
const PortalLabResultsPage  = lazy(() => import('./pages/portal/PortalLabResultsPage'));
const PortalPrescriptionsPage = lazy(() => import('./pages/portal/PortalPrescriptionsPage'));
const PortalBillsPage       = lazy(() => import('./pages/portal/PortalBillsPage'));
const PortalProfilePage     = lazy(() => import('./pages/portal/PortalProfilePage'));

const LoadingFallback = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <Spin size="large" />
  </div>
);

// Role sets for convenience
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
const CLINICAL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
const BILLING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'BILLING', 'RECEPTIONIST'];
const BILLING_MGMT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'BILLING'];
const BILLING_SUPER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR'];
const PHARMACY_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PHARMACIST'];
const LAB_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'LAB_TECH'];
const RADIOLOGY_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'RADIOLOGY_TECH'];
const NURSING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR'];
const ACCOUNTING_ROLES = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'BILLING'];
const ALL_STAFF = ['SUPER_ADMIN', 'ADMIN', 'BILLING_SUPERVISOR', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'BILLING', 'PHARMACIST', 'LAB_TECH', 'RADIOLOGY_TECH'];
const ER_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'];
const WORKSPACE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOCTOR'];
const NURSING_STATION_ROLES = ['SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'];
const MEDREC_ROLES = ['SUPER_ADMIN', 'ADMIN', 'NURSE', 'DOCTOR', 'RECEPTIONIST'];

// Helper to wrap a route element with an inline role guard (avoids nesting Route/Route issues)
const Guard: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user } = useAuthStore();
  if (!user || !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const { primaryColor, loadBranding } = useBrandingStore();

  // Load branding once on mount (works even before login)
  useEffect(() => { loadBranding(); }, [loadBranding]);

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: primaryColor,
          colorLink: primaryColor,
        },
      }}
    >
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* ── Patient Portal (own layout, separate JWT) ── */}
        <Route path="/portal/login" element={<PortalLoginPage />} />
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<Navigate to="/portal/dashboard" replace />} />
          <Route path="dashboard"     element={<PortalDashboard />} />
          <Route path="appointments"  element={<PortalAppointmentsPage />} />
          <Route path="lab-results"   element={<PortalLabResultsPage />} />
          <Route path="prescriptions" element={<PortalPrescriptionsPage />} />
          <Route path="bills"         element={<PortalBillsPage />} />
          <Route path="profile"       element={<PortalProfilePage />} />
        </Route>

        {/* All authenticated routes share MainLayout */}
        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          {/* Dashboard — all staff */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* ── Clinical (all clinical staff) ── */}
          <Route path="/patients" element={<Guard roles={CLINICAL_ROLES}><PatientListPage /></Guard>} />
          <Route path="/patients/new" element={<Guard roles={CLINICAL_ROLES}><PatientFormPage /></Guard>} />
          <Route path="/patients/:id/edit" element={<Guard roles={CLINICAL_ROLES}><PatientFormPage /></Guard>} />
          <Route path="/patients/:id" element={<Guard roles={CLINICAL_ROLES}><PatientDetailPage /></Guard>} />
          <Route path="/doctors" element={<Guard roles={ALL_STAFF}><DoctorListPage /></Guard>} />
          <Route path="/doctors/new" element={<Guard roles={ADMIN_ROLES}><DoctorFormPage /></Guard>} />
          <Route path="/doctors/:id/edit" element={<Guard roles={ADMIN_ROLES}><DoctorFormPage /></Guard>} />
          <Route path="/doctors/:id" element={<Guard roles={ALL_STAFF}><DoctorProfilePage /></Guard>} />
          <Route path="/departments" element={<Guard roles={ALL_STAFF}><DepartmentListPage /></Guard>} />
          <Route path="/consultations" element={<Guard roles={CLINICAL_ROLES}><ConsultationListPage /></Guard>} />
          <Route path="/consultations/new" element={<Guard roles={CLINICAL_ROLES}><ConsultationFormPage /></Guard>} />
          <Route path="/consultations/:id" element={<Guard roles={CLINICAL_ROLES}><ConsultationDetailPage /></Guard>} />
          <Route path="/consultations/:id/edit" element={<Guard roles={CLINICAL_ROLES}><ConsultationFormPage /></Guard>} />

          {/* ── EMR ── */}
          <Route path="/emr/:patientId" element={<Guard roles={CLINICAL_ROLES}><EMRDashboard /></Guard>} />

          {/* ── Services ── */}
          <Route path="/services" element={<Guard roles={ALL_STAFF}><ServiceListPage /></Guard>} />
          <Route path="/services/new" element={<Guard roles={ADMIN_ROLES}><ServiceFormPage /></Guard>} />
          <Route path="/services/:id/edit" element={<Guard roles={ADMIN_ROLES}><ServiceFormPage /></Guard>} />

          {/* ── Billing ── */}
          <Route path="/billing" element={<Guard roles={BILLING_ROLES}><BillingListPage /></Guard>} />
          <Route path="/billing/new" element={<Guard roles={BILLING_ROLES}><BillingFormPage /></Guard>} />
          <Route path="/billing/:id" element={<Guard roles={BILLING_ROLES}><BillingDetailPage /></Guard>} />
          <Route path="/billing/:id/soa" element={<Guard roles={BILLING_ROLES}><BillingSOAPage /></Guard>} />
          <Route path="/billing/ordered-services" element={<Guard roles={BILLING_MGMT_ROLES}><OrderedServicesBillingPage /></Guard>} />
          <Route path="/dept-charges" element={<Guard roles={BILLING_MGMT_ROLES}><DepartmentChargesPage /></Guard>} />
          <Route path="/charge-requests" element={<Guard roles={BILLING_SUPER_ROLES}><ChargeRequestsPage /></Guard>} />

          {/* ── Department Dashboards (Phase 9) ── */}
          <Route path="/er-dashboard"      element={<Guard roles={ER_ROLES}><ERDashboardPage /></Guard>} />
          <Route path="/workspace"         element={<Guard roles={WORKSPACE_ROLES}><DoctorWorkspacePage /></Guard>} />
          <Route path="/nursing-station"   element={<Guard roles={NURSING_STATION_ROLES}><NursingStationPage /></Guard>} />
          <Route path="/pharmacy-queue"    element={<Guard roles={PHARMACY_ROLES}><PharmacyQueuePage /></Guard>} />
          <Route path="/lab-queue"         element={<Guard roles={LAB_ROLES}><LabQueuePage /></Guard>} />
          <Route path="/radiology-queue"   element={<Guard roles={RADIOLOGY_ROLES}><RadiologyQueuePage /></Guard>} />
          <Route path="/csr-queue"         element={<Guard roles={ALL_STAFF}><CSRQueuePage /></Guard>} />
          <Route path="/medical-records"   element={<Guard roles={MEDREC_ROLES}><MedicalRecordsPage /></Guard>} />
          <Route path="/or-dashboard"      element={<Guard roles={CLINICAL_ROLES}><ORDashboardPage /></Guard>} />
          <Route path="/icu-dashboard"     element={<Guard roles={CLINICAL_ROLES}><ICUDashboardPage /></Guard>} />
          <Route path="/ob-dashboard"      element={<Guard roles={CLINICAL_ROLES}><OBDashboardPage /></Guard>} />

          {/* ── Laboratory & Radiology ── */}
          <Route path="/lab/work-queue" element={<Guard roles={LAB_ROLES}><LabWorkQueuePage /></Guard>} />
          <Route path="/lab/requisitions" element={<Guard roles={LAB_ROLES}><LabRequisitionListPage /></Guard>} />
          <Route path="/lab/requisitions/new" element={<Guard roles={LAB_ROLES}><LabOrderFormPage /></Guard>} />
          <Route path="/lab/results" element={<Guard roles={LAB_ROLES}><LabResultViewPage /></Guard>} />
          <Route path="/lab/results/entry/:requisitionId" element={<Guard roles={LAB_ROLES}><LabResultEntryPage /></Guard>} />
          <Route path="/lab/radiology/new" element={<Guard roles={RADIOLOGY_ROLES}><RadiologyOrderFormPage /></Guard>} />

          {/* ── Pharmacy ── */}
          <Route path="/pharmacy/pos"             element={<Guard roles={PHARMACY_ROLES}><PharmacyPOSPage /></Guard>} />
          <Route path="/pharmacy/sales"           element={<Guard roles={PHARMACY_ROLES}><PharmacySalesPage /></Guard>} />
          <Route path="/pharmacy/medications"     element={<Guard roles={PHARMACY_ROLES}><MedicationCatalogPage /></Guard>} />
          <Route path="/pharmacy/inventory"       element={<Guard roles={PHARMACY_ROLES}><InventoryDashboardPage /></Guard>} />
          <Route path="/pharmacy/purchase-orders"     element={<Guard roles={PHARMACY_ROLES}><PurchaseOrdersListPage /></Guard>} />
          <Route path="/pharmacy/purchase-orders/new" element={<Guard roles={PHARMACY_ROLES}><PurchaseOrderFormPage /></Guard>} />
          <Route path="/pharmacy/suppliers"       element={<Guard roles={PHARMACY_ROLES}><PharmacySuppliersPage /></Guard>} />
          <Route path="/pharmacy/alerts"          element={<Guard roles={PHARMACY_ROLES}><StockAlertsPage /></Guard>} />

          {/* ── Queue ── */}
          <Route path="/queue/display" element={<Guard roles={CLINICAL_ROLES}><QueueDisplayPage /></Guard>} />
          <Route path="/queue/management" element={<Guard roles={CLINICAL_ROLES}><QueueManagementPage /></Guard>} />

          {/* ── HMO ── */}
          <Route path="/hmo/registrations" element={<Guard roles={BILLING_ROLES}><HMORegistrationPage /></Guard>} />
          <Route path="/hmo/claims" element={<Guard roles={BILLING_ROLES}><HMOClaimsPage /></Guard>} />
          <Route path="/hmo/claims/new" element={<Guard roles={BILLING_ROLES}><HMOClaimFormPage /></Guard>} />
          <Route path="/hmo/eligibility" element={<Guard roles={BILLING_ROLES}><EligibilityCheckPage /></Guard>} />
          <Route path="/hmo/direct-billing" element={<Guard roles={BILLING_ROLES}><HMODirectBillingPage /></Guard>} />

          {/* ── PhilHealth ── */}
          <Route path="/philhealth/claims" element={<Guard roles={BILLING_ROLES}><PhilHealthClaimsPage /></Guard>} />
          <Route path="/philhealth/claims/new" element={<Guard roles={BILLING_ROLES}><PhilHealthClaimFormPage /></Guard>} />
          <Route path="/philhealth/case-rates" element={<Guard roles={BILLING_ROLES}><CaseRatesPage /></Guard>} />
          <Route path="/philhealth/eclaims" element={<Guard roles={BILLING_ROLES}><EClaimsPage /></Guard>} />

          {/* ── Accounting ── */}
          <Route path="/accounting/chart-of-accounts" element={<Guard roles={ACCOUNTING_ROLES}><ChartOfAccountsPage /></Guard>} />
          <Route path="/accounting/journal-entry" element={<Guard roles={ACCOUNTING_ROLES}><GLEntryFormPage /></Guard>} />
          <Route path="/accounting/trial-balance" element={<Guard roles={ACCOUNTING_ROLES}><TrialBalancePage /></Guard>} />
          <Route path="/accounting/income-statement" element={<Guard roles={ACCOUNTING_ROLES}><IncomeStatementPage /></Guard>} />
          <Route path="/accounting/balance-sheet" element={<Guard roles={ACCOUNTING_ROLES}><BalanceSheetPage /></Guard>} />

          {/* ── Analytics ── */}
          <Route path="/analytics" element={<Guard roles={ACCOUNTING_ROLES}><AnalyticsDashboard /></Guard>} />
          <Route path="/analytics/revenue" element={<Guard roles={ACCOUNTING_ROLES}><RevenueReportPage /></Guard>} />
          <Route path="/analytics/patients" element={<Guard roles={ACCOUNTING_ROLES}><PatientMetricsPage /></Guard>} />
          <Route path="/analytics/doctors" element={<Guard roles={ACCOUNTING_ROLES}><DoctorPerformancePage /></Guard>} />

          {/* ── Admissions ── */}
          <Route path="/admitting"        element={<Guard roles={CLINICAL_ROLES}><AdmittingPage /></Guard>} />
          <Route path="/admissions/rooms" element={<Guard roles={CLINICAL_ROLES}><RoomsDashboardPage /></Guard>} />
          <Route path="/admissions/list" element={<Guard roles={CLINICAL_ROLES}><AdmissionsListPage /></Guard>} />
          <Route path="/admissions/new" element={<Guard roles={CLINICAL_ROLES}><AdmissionFormPage /></Guard>} />
          <Route path="/admissions/:id/discharge" element={<Guard roles={CLINICAL_ROLES}><DischargeFormPage /></Guard>} />
          <Route path="/admissions/:id/discharge-summary" element={<Guard roles={CLINICAL_ROLES}><DischargeSummaryPage /></Guard>} />

          {/* ── Operating Room ── */}
          <Route path="/or/schedule" element={<Guard roles={CLINICAL_ROLES}><ORSchedulePage /></Guard>} />
          <Route path="/or/schedule/new" element={<Guard roles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}><SurgeryFormPage /></Guard>} />
          <Route path="/or/checklist/:surgeryId" element={<Guard roles={CLINICAL_ROLES}><WHOChecklistPage /></Guard>} />

          {/* ── Blood Bank ── */}
          <Route path="/bloodbank/inventory" element={<Guard roles={CLINICAL_ROLES}><BloodInventoryPage /></Guard>} />
          <Route path="/bloodbank/donors" element={<Guard roles={CLINICAL_ROLES}><DonorDatabasePage /></Guard>} />
          <Route path="/bloodbank/transfusions" element={<Guard roles={CLINICAL_ROLES}><TransfusionRequestPage /></Guard>} />

          {/* ── Assets ── */}
          <Route path="/assets" element={<Guard roles={ADMIN_ROLES}><AssetInventoryPage /></Guard>} />
          <Route path="/assets/new" element={<Guard roles={ADMIN_ROLES}><AssetFormPage /></Guard>} />
          <Route path="/assets/:id/edit" element={<Guard roles={ADMIN_ROLES}><AssetFormPage /></Guard>} />
          <Route path="/assets/:assetId/maintenance" element={<Guard roles={ADMIN_ROLES}><MaintenanceFormPage /></Guard>} />
          <Route path="/assets/depreciation" element={<Guard roles={ADMIN_ROLES}><DepreciationReportPage /></Guard>} />

          {/* ── Dialysis ── */}
          <Route path="/dialysis/schedule" element={<Guard roles={CLINICAL_ROLES}><DialysisSchedulePage /></Guard>} />
          <Route path="/dialysis/sessions/new" element={<Guard roles={CLINICAL_ROLES}><SessionFormPage /></Guard>} />
          <Route path="/dialysis/active" element={<Guard roles={CLINICAL_ROLES}><ActiveSessionsPage /></Guard>} />
          <Route path="/dialysis/machines" element={<Guard roles={ADMIN_ROLES}><MachineManagementPage /></Guard>} />

          {/* ── Compliance ── */}
          <Route path="/doh/reporting" element={<Guard roles={ADMIN_ROLES}><DOHReportingPage /></Guard>} />
          <Route path="/barcode/scanner" element={<Guard roles={CLINICAL_ROLES}><BarcodeScannerPage /></Guard>} />
          <Route path="/barcode/wristband" element={<Guard roles={CLINICAL_ROLES}><PatientWristbandPage /></Guard>} />

          {/* ── Telemedicine ── */}
          <Route path="/telemedicine" element={<Guard roles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}><TelemedicineSchedulePage /></Guard>} />
          <Route path="/telemedicine/book" element={<Guard roles={CLINICAL_ROLES}><TelemedicineBookingPage /></Guard>} />
          <Route path="/telemedicine/call/:roomCode" element={<Guard roles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}><VideoConsultationPage /></Guard>} />
          <Route path="/telemedicine/notes" element={<Guard roles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}><ConsultationNotesPage /></Guard>} />

          {/* ── AI ── */}
          <Route path="/ai/clinical-support" element={<Guard roles={['SUPER_ADMIN', 'ADMIN', 'DOCTOR']}><AIClinicalSupportPage /></Guard>} />

          {/* ── Nursing ── */}
          <Route path="/nurses" element={<Guard roles={NURSING_ROLES}><NurseDashboardPage /></Guard>} />
          <Route path="/nurses/vitals" element={<Guard roles={NURSING_ROLES}><VitalsEntryPage /></Guard>} />
          <Route path="/nurses/care-plans" element={<Guard roles={NURSING_ROLES}><CarePlanPage /></Guard>} />
          <Route path="/nurses/handover" element={<Guard roles={NURSING_ROLES}><ShiftHandoverPage /></Guard>} />

          {/* ── SMS ── */}
          <Route path="/sms" element={<Guard roles={ADMIN_ROLES}><SMSDashboardPage /></Guard>} />

          {/* ── Payments ── */}
          <Route path="/payments/online" element={<Guard roles={BILLING_ROLES}><OnlinePaymentPage /></Guard>} />
          <Route path="/payments/transactions" element={<Guard roles={BILLING_ROLES}><TransactionHistoryPage /></Guard>} />

          {/* ── Appointments ── */}
          <Route path="/appointments" element={<Guard roles={CLINICAL_ROLES}><AppointmentListPage /></Guard>} />
          <Route path="/appointments/new" element={<Guard roles={CLINICAL_ROLES}><AppointmentFormPage /></Guard>} />
          <Route path="/appointments/availability" element={<Guard roles={CLINICAL_ROLES}><AvailabilityCalendarPage /></Guard>} />

          {/* ── HIE ── */}
          <Route path="/hie" element={<Guard roles={ADMIN_ROLES}><HIEDashboardPage /></Guard>} />

          {/* ── Profile (all authenticated users) ── */}
          <Route path="/profile" element={<ProfilePage />} />

          {/* ── Administration ── */}
          <Route path="/settings" element={<Guard roles={ADMIN_ROLES}><SettingsPage /></Guard>} />
          <Route path="/settings/backup" element={<Guard roles={ADMIN_ROLES}><BackupPage /></Guard>} />
          <Route path="/users" element={<Guard roles={ADMIN_ROLES}><UserManagementPage /></Guard>} />
          <Route path="/audit-log" element={<Guard roles={ADMIN_ROLES}><AuditLogPage /></Guard>} />

          {/* Help Center — accessible to all authenticated users */}
          <Route path="/help" element={<HelpCenterPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
    </ConfigProvider>
  );
};

export default App;
