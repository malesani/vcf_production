// src/auth_module/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import Loading from "../pages/Loading";

const EXEMPT_PATHS = [
  "/choose_company",
  "/logout",
  "/user_profile",
  "/login",
  "/signup",
  "/quiz",
];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, authLoading, selectedCompany, userInfo } = useAuth();
  const location = useLocation();
  const { pathname, search } = location;

  if (authLoading) return <Loading />;

  // 1) non loggato -> login (✅ porta dietro i parametri)
  if (!isAuthenticated) {
    return <Navigate to={`/login${search}`} replace />;
  }

  // ✅ se sei loggato ma userInfo non è ancora pronto, aspetta
  if (!userInfo) return <Loading />;

  // 2) loggato ma quiz NON completato -> /quiz (qui puoi decidere se preservare search o no)
  if (userInfo.quiz === 0 && !EXEMPT_PATHS.includes(pathname)) {
    return <Navigate to="/quiz" replace />;
  }

  // 3) scelta company
  if (!selectedCompany && !EXEMPT_PATHS.includes(pathname)) {
    return <Navigate to="/choose_company" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
