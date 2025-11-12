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

import { getUserInfo } from './api_module_v1/UserRequest';
import publicRoutes from './routes/PublicRoutes';
import { getDatabaseRoutes } from './routes/DatabaseRoutes';
import Dashboard from './pages/Dashboard';
import LoadingPage from './pages/Loading';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, authLoading } = useAuth();
  const [dynamicRoutes, setDynamicRoutes] = useState<RouteObject[]>([]);
  const [router, setRouter] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userName, setUserName] = useState<string>('');

  // Carica rotte dinamiche e info utente
  useEffect(() => {
    if (!authLoading) {
      const loadData = async () => {
        if (isAuthenticated) {
          const dbRoutes = await getDatabaseRoutes();
          setDynamicRoutes(dbRoutes);
          try {
            const result = await getUserInfo();
            if (!result.data) {
              console.error('getUserInfo returned no user_info');
            } else {
              const { first_name, last_name } = result.data;
              const name = `${first_name} ${last_name}`;
              setUserName(name);
            }

          } catch (e) {
            console.error('Errore getUserInfo:', e);
          }
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

  if (authLoading || isLoading || !router) {
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