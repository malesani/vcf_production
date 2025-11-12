import React, { useEffect, useState } from "react";
import {
  MDBNavbar,
  MDBBtn,
  MDBIcon,
  MDBNavbarNav,
  MDBNavbarItem,
  MDBNavbarLink,
  MDBDropdown,
  MDBDropdownToggle,
  MDBDropdownMenu,
  MDBDropdownItem,
} from "mdb-react-ui-kit";
import { useNavigate } from 'react-router-dom';

import { useIsMobile } from "../app_components/ResponsiveModule";

import { MenuItem, getNavBarMenuItems } from "../auth_module/pagesManager";

interface NavBarProps {
  logoImg?: string;
  appState: string;
  setAppState: React.Dispatch<React.SetStateAction<string>>;
  drawerOpen: boolean;
  setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const NavBar: React.FC<NavBarProps> = ({ appState, setAppState, drawerOpen, setDrawerOpen }) => {
  const isMobile = useIsMobile(768);

  const navigate = useNavigate();
  const [navItems, setNavItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  useEffect(() => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [appState, pendingNavigation]);

  useEffect(() => {
    async function fetchNavItems(appState: string) {
      try {
        const response = await getNavBarMenuItems(appState);
        if (response.response.success && response.menuItems) {
          setNavItems(response.menuItems);
        }
      } catch (error) {
        console.error("Error fetching navBar menu items:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNavItems(appState);
  }, [appState]);

  // Funzione per renderizzare dinamicamente i menu items della navbar
  const renderNavItems = (items: MenuItem[]) => {
    return items.map((item) => {

      const onClickChangeAppState = (newAppState: string | undefined, path: string) => {
        if (newAppState) {
          setAppState(newAppState);
        }
        if (path) {
          setPendingNavigation(path);
        }
      };


      if (item.childrens && item.childrens.length > 0) {
        return (
          <MDBNavbarItem key={item.name}>
            <MDBDropdown>
              <MDBDropdownToggle tag="a" href="#!" className="hidden-arrow nav-link">
                {item.icon && <MDBIcon fas icon={item.icon} className="me-2" />}
                {item.name}
              </MDBDropdownToggle>
              <MDBDropdownMenu>
                {item.childrens.map((child) => (
                  <MDBDropdownItem key={child.name} onClick={() => {
                    onClickChangeAppState(child.newAppState, child.path);
                  }}>
                    {child.name}
                  </MDBDropdownItem>
                ))}
              </MDBDropdownMenu>
            </MDBDropdown>
          </MDBNavbarItem>
        );
      } else {
        return (
          <MDBNavbarItem key={item.name}>
            <MDBNavbarLink onClick={() => {
              onClickChangeAppState(item.newAppState, item.path);
            }}>
              {item.icon && <MDBIcon fas icon={item.icon} className="me-2" />}
              {item.name}
            </MDBNavbarLink>
          </MDBNavbarItem>
        );
      }
    });
  };

  const shouldShow = drawerOpen || (!loading && navItems.length > 0);

  if (shouldShow) {
    return (<MDBNavbar expand="lg" light style={{ backgroundColor: "#EEF3FC" }} className="d-flex flex-column p-0 px-3">
      {/* Second Row: Navigation Menu */}
      <MDBNavbarNav className="w-100" style={{ textTransform: "uppercase", fontFamily: "Calibri", fontSize: "16px", color: "#000", gap: "20px" }}>
        {loading ? (
          <MDBNavbarItem>
            <MDBIcon fas icon="spinner" spin size="sm" />
          </MDBNavbarItem>
        ) : (
          renderNavItems(navItems)
        )}
      </MDBNavbarNav>
    </MDBNavbar>
    );
  } else {
    return (<></>);
  }
};

export default NavBar;
