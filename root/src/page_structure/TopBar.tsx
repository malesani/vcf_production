import React from "react";
import {
  MDBNavbar,
  MDBNavbarBrand,
  MDBBtn,
  MDBIcon,
  MDBNavbarNav,
  MDBNavbarItem,
  MDBDropdown,
  MDBDropdownToggle,
  MDBDropdownMenu,
  MDBDropdownItem,
  MDBBadge
} from "mdb-react-ui-kit";
import { useNavigate } from "react-router-dom";
import { logoutFunction } from '../auth_module/loginFunctions';
import { useAuth } from '../auth_module/AuthContext';

import { useIsMobile } from "../app_components/ResponsiveModule";


interface TopBarProps {
  logoImg?: string;
  toggleSidebar?: () => void;
  appState: string;
  setAppState: React.Dispatch<React.SetStateAction<string>>;
}

const TopBar: React.FC<TopBarProps> = ({ logoImg = '', appState, setAppState, toggleSidebar }) => {

  const { refreshAuth, userData, companiesData } = useAuth();
  const navigate = useNavigate();

  const isMobile = useIsMobile(992);

  const handleLogout = async () => {
    const result = await logoutFunction();
    if (result.success) {
      await refreshAuth();
      navigate('/login', { replace: true });
    } else {
      console.error('Logout failed:', result.error);
    }
  };

  // Trova l’azienda selezionata
  const currentCompany = companiesData.find(
    (c) => c.company_uid === userData?.company_uid
  );
  const companyName = currentCompany?.name ?? "Seleziona azienda";

  return (
    <MDBNavbar expand="lg" light className="d-flex flex-column">
      <MDBNavbarNav className="d-flex justify-content-between w-100">

        {/* Wrapper per logo + toggle */}
        <div className="d-flex align-items-center ms-3 me-3 justify-content-between">
          <MDBNavbarBrand href="/dashboard">
            <img src={logoImg} height="45" alt="Logo" loading="lazy" />
          </MDBNavbarBrand>

          {/* su mobile, toggle fuori dall’anchor */}
          {isMobile && toggleSidebar && (
            <MDBBtn
              tag="button"

              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar();
              }}
            >
              <MDBIcon fas icon="bars" />
            </MDBBtn>
          )}
        </div>
        {!isMobile && (

          <div className="d-flex align-items-center">
            <MDBNavbarItem className="me-3">
              <MDBDropdown>
                <MDBDropdownToggle tag="a" href="#!" className="hidden-arrow nav-link">
                  <MDBIcon fas icon="bell" />
                  <MDBBadge color="danger" notification pill>
                    2
                  </MDBBadge>
                </MDBDropdownToggle>
                <MDBDropdownMenu>
                  <MDBDropdownItem link href="#">
                    Completa i dati Aziendali
                  </MDBDropdownItem>
                  <MDBDropdownItem link href="#">
                    Nuove attività assegnate <MDBBadge color="primary">3</MDBBadge>
                  </MDBDropdownItem>
                </MDBDropdownMenu>
              </MDBDropdown>
            </MDBNavbarItem>

            <MDBNavbarItem>
              <MDBDropdown>
                <MDBDropdownToggle tag="a" href="#!" className="hidden-arrow nav-link">
                  <MDBBtn color="secondary" size="sm" rounded>
                    Account
                    <MDBIcon fas icon="user" className="ms-2" />
                  </MDBBtn>
                </MDBDropdownToggle>
                <MDBDropdownMenu className="z-index: 2000;">
                  <MDBDropdownItem header>Gestione Utente</MDBDropdownItem>
                  <MDBDropdownItem link onClick={() => navigate('/user_profile', { replace: true })}>
                    My profile
                  </MDBDropdownItem>
                  <MDBDropdownItem link className="bg-warning" onClick={handleLogout}>
                    Logout
                  </MDBDropdownItem>
                </MDBDropdownMenu>
              </MDBDropdown>
            </MDBNavbarItem>
          </div>
        )}
      </MDBNavbarNav>
    </MDBNavbar>
  );
};

export default TopBar;
