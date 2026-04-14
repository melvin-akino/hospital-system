import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import MainLayout from './components/layout/MainLayout';
import PrivateRoute from './components/layout/PrivateRoute';

const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
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

// Phase 2: EMR
const EMRDashboard = lazy(() => import('./pages/emr/EMRDashboard'));

// Phase 2: Laboratory & Radiology
const LabOrderFormPage = lazy(() => import('./pages/lab/LabOrderFormPage'));
const LabRequisitionListPage = lazy(() => import('./pages/lab/LabRequisitionListPage'));
const LabResultEntryPage = lazy(() => import('./pages/lab/LabResultEntryPage'));
const LabResultViewPage = lazy(() => import('./pages/lab/LabResultViewPage'));
const RadiologyOrderFormPage = lazy(() => import('./pages/lab/RadiologyOrderFormPage'));

// Phase 2: Pharmacy & Inventory
const MedicationCatalogPage = lazy(() => import('./pages/pharmacy/MedicationCatalogPage'));
const InventoryDashboardPage = lazy(() => import('./pages/pharmacy/InventoryDashboardPage'));
const PurchaseOrderFormPage = lazy(() => import('./pages/pharmacy/PurchaseOrderFormPage'));
const StockAlertsPage = lazy(() => import('./pages/pharmacy/StockAlertsPage'));

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

const App: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route
          element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Patients */}
          <Route path="/patients" element={<PatientListPage />} />
          <Route path="/patients/new" element={<PatientFormPage />} />
          <Route path="/patients/:id/edit" element={<PatientFormPage />} />
          <Route path="/patients/:id" element={<PatientDetailPage />} />

          {/* Doctors */}
          <Route path="/doctors" element={<DoctorListPage />} />
          <Route path="/doctors/new" element={<DoctorFormPage />} />
          <Route path="/doctors/:id/edit" element={<DoctorFormPage />} />
          <Route path="/doctors/:id" element={<DoctorProfilePage />} />

          {/* Services */}
          <Route path="/services" element={<ServiceListPage />} />
          <Route path="/services/new" element={<ServiceFormPage />} />
          <Route path="/services/:id/edit" element={<ServiceFormPage />} />

          {/* Consultations */}
          <Route path="/consultations" element={<ConsultationListPage />} />
          <Route path="/consultations/new" element={<ConsultationFormPage />} />
          <Route path="/consultations/:id" element={<ConsultationDetailPage />} />
          <Route path="/consultations/:id/edit" element={<ConsultationFormPage />} />

          {/* Billing */}
          <Route path="/billing" element={<BillingListPage />} />
          <Route path="/billing/new" element={<BillingFormPage />} />
          <Route path="/billing/:id" element={<BillingDetailPage />} />

          {/* Phase 2: EMR */}
          <Route path="/emr/:patientId" element={<EMRDashboard />} />

          {/* Phase 2: Laboratory & Radiology */}
          <Route path="/lab/requisitions" element={<LabRequisitionListPage />} />
          <Route path="/lab/requisitions/new" element={<LabOrderFormPage />} />
          <Route path="/lab/results" element={<LabResultViewPage />} />
          <Route path="/lab/results/entry/:requisitionId" element={<LabResultEntryPage />} />
          <Route path="/lab/radiology/new" element={<RadiologyOrderFormPage />} />

          {/* Phase 2: Pharmacy & Inventory */}
          <Route path="/pharmacy/medications" element={<MedicationCatalogPage />} />
          <Route path="/pharmacy/inventory" element={<InventoryDashboardPage />} />
          <Route path="/pharmacy/purchase-orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="/pharmacy/alerts" element={<StockAlertsPage />} />

          {/* Phase 2: Queue Management */}
          <Route path="/queue/display" element={<QueueDisplayPage />} />
          <Route path="/queue/management" element={<QueueManagementPage />} />

          {/* Phase 2: HMO Processing */}
          <Route path="/hmo/registrations" element={<HMORegistrationPage />} />
          <Route path="/hmo/claims" element={<HMOClaimsPage />} />
          <Route path="/hmo/claims/new" element={<HMOClaimFormPage />} />
          <Route path="/hmo/eligibility" element={<EligibilityCheckPage />} />

          {/* Phase 3: PhilHealth Claims */}
          <Route path="/philhealth/claims" element={<PhilHealthClaimsPage />} />
          <Route path="/philhealth/claims/new" element={<PhilHealthClaimFormPage />} />
          <Route path="/philhealth/case-rates" element={<CaseRatesPage />} />

          {/* Phase 3: Accounting / GL */}
          <Route path="/accounting/chart-of-accounts" element={<ChartOfAccountsPage />} />
          <Route path="/accounting/journal-entry" element={<GLEntryFormPage />} />
          <Route path="/accounting/trial-balance" element={<TrialBalancePage />} />
          <Route path="/accounting/income-statement" element={<IncomeStatementPage />} />
          <Route path="/accounting/balance-sheet" element={<BalanceSheetPage />} />

          {/* Phase 3: Analytics & BI */}
          <Route path="/analytics" element={<AnalyticsDashboard />} />
          <Route path="/analytics/revenue" element={<RevenueReportPage />} />
          <Route path="/analytics/patients" element={<PatientMetricsPage />} />
          <Route path="/analytics/doctors" element={<DoctorPerformancePage />} />

          {/* Phase 4: Rooms & Admissions */}
          <Route path="/admissions/rooms" element={<RoomsDashboardPage />} />
          <Route path="/admissions/list" element={<AdmissionsListPage />} />
          <Route path="/admissions/new" element={<AdmissionFormPage />} />
          <Route path="/admissions/:id/discharge" element={<DischargeFormPage />} />

          {/* Phase 4: OR Scheduler */}
          <Route path="/or/schedule" element={<ORSchedulePage />} />
          <Route path="/or/schedule/new" element={<SurgeryFormPage />} />
          <Route path="/or/checklist/:surgeryId" element={<WHOChecklistPage />} />

          {/* Phase 4: Blood Bank */}
          <Route path="/bloodbank/inventory" element={<BloodInventoryPage />} />
          <Route path="/bloodbank/donors" element={<DonorDatabasePage />} />
          <Route path="/bloodbank/transfusions" element={<TransfusionRequestPage />} />

          {/* Phase 4: Asset Management */}
          <Route path="/assets" element={<AssetInventoryPage />} />
          <Route path="/assets/new" element={<AssetFormPage />} />
          <Route path="/assets/:id/edit" element={<AssetFormPage />} />
          <Route path="/assets/:assetId/maintenance" element={<MaintenanceFormPage />} />
          <Route path="/assets/depreciation" element={<DepreciationReportPage />} />

          {/* Phase 4: Dialysis Center */}
          <Route path="/dialysis/schedule" element={<DialysisSchedulePage />} />
          <Route path="/dialysis/sessions/new" element={<SessionFormPage />} />
          <Route path="/dialysis/active" element={<ActiveSessionsPage />} />
          <Route path="/dialysis/machines" element={<MachineManagementPage />} />

          {/* Phase 5: Integration & Compliance */}
          <Route path="/philhealth/eclaims" element={<EClaimsPage />} />
          <Route path="/hmo/direct-billing" element={<HMODirectBillingPage />} />
          <Route path="/doh/reporting" element={<DOHReportingPage />} />
          <Route path="/barcode/scanner" element={<BarcodeScannerPage />} />
          <Route path="/barcode/wristband" element={<PatientWristbandPage />} />

          {/* Phase 6: Telemedicine */}
          <Route path="/telemedicine" element={<TelemedicineSchedulePage />} />
          <Route path="/telemedicine/book" element={<TelemedicineBookingPage />} />
          <Route path="/telemedicine/call/:roomCode" element={<VideoConsultationPage />} />
          <Route path="/telemedicine/notes" element={<ConsultationNotesPage />} />

          {/* Phase 6: AI */}
          <Route path="/ai/clinical-support" element={<AIClinicalSupportPage />} />

          {/* Phase 6: Nursing */}
          <Route path="/nurses" element={<NurseDashboardPage />} />
          <Route path="/nurses/vitals" element={<VitalsEntryPage />} />
          <Route path="/nurses/care-plans" element={<CarePlanPage />} />
          <Route path="/nurses/handover" element={<ShiftHandoverPage />} />

          {/* Departments */}
          <Route path="/departments" element={<DepartmentListPage />} />

          {/* Phase 7: SMS */}
          <Route path="/sms" element={<SMSDashboardPage />} />

          {/* Phase 7: Online Payments */}
          <Route path="/payments/online" element={<OnlinePaymentPage />} />
          <Route path="/payments/transactions" element={<TransactionHistoryPage />} />

          {/* Phase 7: Appointments */}
          <Route path="/appointments" element={<AppointmentListPage />} />
          <Route path="/appointments/new" element={<AppointmentFormPage />} />
          <Route path="/appointments/availability" element={<AvailabilityCalendarPage />} />

          {/* Phase 7: HIE */}
          <Route path="/hie" element={<HIEDashboardPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;
