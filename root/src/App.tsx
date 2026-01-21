import React, { useState, useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  RouteObject,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './auth_module/AuthContext';
import ProtectedRoute from './auth_module/ProtectedRoute';
import './App.css';
import Skeleton from './page_structure/Skeleton';

import publicRoutes from './routes/PublicRoutes';
import { getDatabaseRoutes } from './routes/DatabaseRoutes';
import Dashboard from './pages/Dashboard';
import LoadingPage from './pages/Loading';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, authLoading, userInfo } = useAuth();
  const [dynamicRoutes, setDynamicRoutes] = useState<RouteObject[]>([]);
  const [router, setRouter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const userName = userInfo ? `${userInfo.first_name} ${userInfo.last_name}` : '';

  // Carica rotte dinamiche (userInfo è già nel context)
  useEffect(() => {
    if (!authLoading) {
      const loadData = async () => {
        if (isAuthenticated) {
          const dbRoutes = await getDatabaseRoutes();
          setDynamicRoutes(dbRoutes);
        } else {
          setDynamicRoutes([]);
        }
        setIsLoading(false);
      };
      loadData();
    }
  }, [authLoading, isAuthenticated]);

  // Crea router quando tutto è pronto
  useEffect(() => {
    if (!isLoading) {
      const staticProtectedRoutes: RouteObject[] = [
        {
          path: '/',
          element: (
            <ProtectedRoute>
              <Skeleton>
                <Dashboard userName={userName} pageName="Dashboard" />
              </Skeleton>
            </ProtectedRoute>
          ),
        },
        {
          path: '/dashboard',
          element: (
            <ProtectedRoute>
              <Skeleton>
                <Dashboard userName={userName} pageName="Dashboard" />
              </Skeleton>
            </ProtectedRoute>
          ),
        },
      ];

      const all: RouteObject[] = [
        ...publicRoutes,
        ...staticProtectedRoutes,
        ...dynamicRoutes,
      ];

      const r = createBrowserRouter(all);
      setRouter(r);
    }
  }, [dynamicRoutes, isLoading, userName]);

  if (authLoading || (isAuthenticated && !userInfo) || isLoading || !router) {
    return <LoadingPage />;
  }

  return <RouterProvider router={router} />;
};

const App: React.FC = () => (
  <AuthProvider>
    <AppRoutes />
  </AuthProvider>
);

export default App;