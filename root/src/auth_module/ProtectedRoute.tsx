// src/auth_module/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Loading from '../pages/Loading';

const EXEMPT_PATHS = [
  '/choose_company',
  '/logout',
  '/user_profile',
  '/login',
  '/signup'
];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, authLoading, selectedCompany } = useAuth();  // :contentReference[oaicite:0]{index=0}&#8203;:contentReference[oaicite:1]{index=1}
  const { pathname } = useLocation();

  if (authLoading) {
    return <Loading />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Se non hai scelto company e non sei su un path esente, vai a /choose_company
  if (!selectedCompany && !EXEMPT_PATHS.includes(pathname)) {
    return <Navigate to="/choose_company" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
