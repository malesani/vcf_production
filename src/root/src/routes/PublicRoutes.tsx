// src/routes/PublicRoutes.tsx
import LoginForm from '../pages/Login';
import SignUp from '../pages/SignUp';
import CmsPagesManager from '../cms_pages/CmsPagesManager';
import Skeleton from '../page_structure/Skeleton';
import ProtectedRoute from '../auth_module/ProtectedRoute';
import UserProfile from '../pages/UserProfile';
import ChooseCompany from '../pages/ChooseCompany';

const publicRoutes = [
  // PUBLIC PAGES (no auth)
  { path: '/login', element: <LoginForm /> },
  { path: '/signup', element: <SignUp /> },

  // NEW PAGE
  {
    path: '/choose_company',
    element: (
      <ProtectedRoute>
        <Skeleton noNavbar>
          <ChooseCompany />
        </Skeleton>
      </ProtectedRoute>
    )
  },

  // CMS PAGES - accessible only by GOD (protette da superadmin)
  {
    path: '/cms_pages_manager',
    element: (
      <ProtectedRoute>
        <Skeleton>
          <CmsPagesManager />
        </Skeleton>
      </ProtectedRoute>
    )
  },

  // USER PROFILE PAGES
  {
    path: '/user_profile',
    element: (
      <ProtectedRoute>
        <Skeleton def_appState='init' noNavbar>
          <UserProfile />
        </Skeleton>
      </ProtectedRoute>
    )
  }
];

export default publicRoutes;
