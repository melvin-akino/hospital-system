import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { usePatientAuthStore } from './store/authStore';
import PatientLoginPage from './pages/PatientLoginPage';
import PatientDashboardPage from './pages/PatientDashboardPage';
import MedicalRecordsPage from './pages/MedicalRecordsPage';
import LabResultsPage from './pages/LabResultsPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import MyBillsPage from './pages/MyBillsPage';
import PatientLayout from './components/PatientLayout';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = usePatientAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<PatientLoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <PatientLayout>
              <PatientDashboardPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/medical-records"
        element={
          <ProtectedRoute>
            <PatientLayout>
              <MedicalRecordsPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/lab-results"
        element={
          <ProtectedRoute>
            <PatientLayout>
              <LabResultsPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <PatientLayout>
              <MyAppointmentsPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bills"
        element={
          <ProtectedRoute>
            <PatientLayout>
              <MyBillsPage />
            </PatientLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
