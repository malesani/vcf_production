import React, { createContext, useContext, useState, useEffect } from 'react';
import { profileFunction, UserData, CompaniesData } from './loginFunctions';
import { requestFunction, requestResponse } from '../hooks/RequestFunction';

import { getUserInfo } from '../api_module_v1/UserRequest';

// Permissions Manage - Tipi per i permessi restituiti da profile.php con opt="permContext"
export interface PermissionInfo {
  key: string;
  isValid: boolean;
}

export interface PermissionGroupInfo {
  key: string;
  isValid: boolean;
  paywalled: boolean;
}
// end

// Auth Manage
interface AuthContextType {
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  authLoading: boolean;
  permLoading: boolean;

  // dati utente e company
  userData?: UserData;
  companiesData: CompaniesData[];
  selectedCompany?: string;

  // user info (permette una sola chiamata e non due)
  userInfo?: {
    user_uid: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    quiz: 0 | 1;
  };

  // helper permessi
  hasPerm: (permKey: string) => boolean;
  hasPermGroup: (groupKey: string) => boolean;

  // funzioni
  refreshAuth: () => Promise<void>;
  selectCompany: (uid: string) => Promise<void>;
}

export interface selectCompanyResponse {
  response: requestResponse;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isSuperadmin: false,
  authLoading: true,
  permLoading: true,
  userData: undefined,
  companiesData: [],
  selectedCompany: undefined,
  userInfo: undefined,
  hasPerm: () => false,
  hasPermGroup: () => false,
  refreshAuth: async () => { },
  selectCompany: async () => { }
});
// end


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Stato Autenticazione
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [companiesData, setCompaniesData] = useState<CompaniesData[]>([]);
  const [userData, setUserData] = useState<UserData | undefined>(undefined);
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined);
  const [userInfo, setUserInfo] = useState<AuthContextType["userInfo"]>(undefined);
  const [authLoading, setAuthLoading] = useState(true);

  // Stato Permessi
  const [permLoading, setPermLoading] = useState(false);
  const [permissions, setPermissions] = useState<PermissionInfo[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroupInfo[]>([]);

  // Funzione per ricaricare i permessi
  const refreshPermissions = async () => {
    setPermLoading(true);
    try {
      const response = await requestFunction(
        '/auth/api/profile.php',
        'POST',
        undefined,
        {}
      );
      if (response.success && response.data) {
        setPermissions(response.data.permissionsInfo as PermissionInfo[]);
        setPermissionGroups(response.data.permGroupsInfo as PermissionGroupInfo[]);
      } else {
        console.error('refreshPermissions error:', response.error || response.message);
        setPermissions([]);
        setPermissionGroups([]);
      }
    } catch (e) {
      console.error('refreshPermissions exception:', e);
      setPermissions([]);
      setPermissionGroups([]);
    } finally {
      setPermLoading(false);
    }
  };

  useEffect(() => {
    console.log("permissions", permissions);
  }, [permissions]);

  useEffect(() => {
    console.log("permissionGroups", permissionGroups);
  }, [permissionGroups]);

  // Helper del context per permessi: false se non single-company
  const hasPerm = (permKey: string): boolean => {
    const perm = permissions.find(p => p.key === permKey);
    return perm ? perm.isValid : false;
  };

  const hasPermGroup = (groupKey: string): boolean => {
    const group = permissionGroups.find(g => g.key === groupKey);
    return group ? group.isValid : false;
  };

  // Helper: carica quiz da user
  const fetchQuizFromUser = async (): Promise<0 | 1> => {
    try {
      const r = await requestFunction('/users/api/user.php', 'GET', "user_info", {});
      const q = (r as any)?.data?.user_info?.quiz;
      return q === 1 ? 1 : 0;
    } catch (e) {
      console.error('fetchQuizFromUser error:', e);
      return 0;
    }
  };


  // Ricarica il profilo, sincronizza selectedCompany e permessi
  const refreshAuth = async () => {
    setAuthLoading(true);
    try {
      const resp = await profileFunction();
      if (resp.response.success && resp.data?.user_data) {
        setIsAuthenticated(true);
        setIsSuperadmin((resp.data.user_data as any).super_admin as boolean);

        const comps = resp.data.companies_data ?? [];
        setCompaniesData(comps);

        setUserData(resp.data.user_data as UserData);

        // ✅ UNA SOLA chiamata a /users/api/user.php
        try {
          const ui = await getUserInfo();
          if (ui.data) {
            setUserInfo({
              user_uid: ui.data.user_uid,
              email: ui.data.email,
              first_name: ui.data.first_name,
              last_name: ui.data.last_name,
              phone: ui.data.phone ?? "",
              quiz: ui.data.quiz === 1 ? 1 : 0,
            });
          } else {
            setUserInfo(undefined);
          }
        } catch (e) {
          console.error("getUserInfo error:", e);
          setUserInfo(undefined);
        }

        const companyFromToken = (resp.data.user_data as any).company_uid as string | undefined;
        setSelectedCompany(companyFromToken);

        if (comps.length === 1) {
          await refreshPermissions();
        }
      } else {
        setIsAuthenticated(false);
        setIsSuperadmin(false);
        setCompaniesData([]);
        setUserData(undefined);
        setSelectedCompany(undefined);
        setUserInfo(undefined);
      }
    } catch (e) {
      console.error('refreshAuth error:', e);
      setIsAuthenticated(false);
      setIsSuperadmin(false);
      setCompaniesData([]);
      setUserData(undefined);
      setSelectedCompany(undefined);
    }
    setAuthLoading(false);
  };

  // Seleziona azienda: chiama backend e ricarica JWT
  const selectCompany = async (company_uid: string) => {
    try {
      const response = await requestFunction('/auth/api/select_company.php', 'POST', undefined, { 'company_uid': company_uid });

      if (response.success) {
        // 1) ricarica profilo + selectedCompany
        await refreshAuth();
        // 2) carica i permessi per la nuova company
        await refreshPermissions();
      } else {
        throw new Error(response.error || response.message || 'Request failed');
      }
    } catch (e) {
      console.error('selectCompany error:', e);
    }
  };

  // al mount, effettua primo caricamento
  useEffect(() => {
    refreshAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isSuperadmin,
        authLoading,
        permLoading,
        userData,
        companiesData,
        selectedCompany,
        userInfo,
        hasPerm,
        hasPermGroup,
        refreshAuth,
        selectCompany
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
