import React, { useState } from 'react';
import {
  MDBSideNavItem,
  MDBSideNavLink,
  MDBSideNavCollapse,
  MDBIcon,
  MDBBadge,
  MDBDropdown,
  MDBDropdownToggle,
  MDBDropdownMenu,
  MDBDropdownItem,
  MDBBtn,
} from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import { logoutFunction } from '../auth_module/loginFunctions';
import { useAuth } from '../auth_module/AuthContext';

interface MobileNavLinksProps {
  onClose?: () => void;
}

const MobileNavLinks: React.FC<MobileNavLinksProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { refreshAuth, userData, companiesData = [] } = useAuth();
  const [openPlans, setOpenPlans] = useState(false);
  const [openCompany, setOpenCompany] = useState(false);

  const handleLogout = async () => {
    const result = await logoutFunction();
    if (result.success) {
      await refreshAuth();
      navigate('/login', { replace: true });
    } else {
      console.error('Logout failed:', result.error);
    }
  };

  const companyName = companiesData.find(c => c.company_uid === userData?.company_uid)?.name
    ?? 'Seleziona azienda';

  return (
    <>
      {/* Gestione Utente */}
      <MDBSideNavItem>
        <MDBSideNavLink
          icon="angle-down"
          shouldBeExpanded={openCompany}
          onClick={e => { e.preventDefault(); setOpenCompany(prev => !prev); }}
        >
          <span className="sidenav-non-slim ms-2">Gestione Utente</span>
        </MDBSideNavLink>
        <MDBSideNavCollapse open={openCompany}>
          <MDBSideNavItem>
            <MDBSideNavLink onClick={() => { navigate('/user_profile', { replace: true }); onClose?.(); }}>
              <MDBIcon fas icon="user" className="fa-fw me-3" />
              <span className="sidenav-non-slim">Profilo</span>
            </MDBSideNavLink>
          </MDBSideNavItem>
          <MDBSideNavItem>
            <MDBSideNavLink className="bg-warning" onClick={() => { handleLogout(); }}>
              <MDBIcon fas icon="sign-out-alt" className="fa-fw me-3" />
              <span className="sidenav-non-slim">Logout</span>
            </MDBSideNavLink>
          </MDBSideNavItem>
        </MDBSideNavCollapse>
      </MDBSideNavItem>
    </>
  );
};

export default MobileNavLinks;
