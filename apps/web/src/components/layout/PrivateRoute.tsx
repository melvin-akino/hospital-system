import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
  roles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, roles }) => {
  const { isAuthenticated, user, logout } = useAuthStore();
  const location = useLocation();

  // Sync guard: if Zustand says authenticated but the token is gone (e.g. cleared by
  // the 401 interceptor or another tab's logout), force a clean logout immediately.
  const tokenPresent = !!localStorage.getItem('pibs_token');

  useEffect(() => {
    if (isAuthenticated && !tokenPresent) {
      logout();
    }
  }, [isAuthenticated, tokenPresent, logout]);

  if (!isAuthenticated || !tokenPresent) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && user && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
