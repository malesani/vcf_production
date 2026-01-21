import React, { ReactNode, useState, useEffect } from 'react';
import {
  MDBSideNav,
  MDBSideNavMenu,
  MDBSideNavItem,
  MDBSideNavLink,
  MDBSideNavCollapse,
  MDBIcon
} from 'mdb-react-ui-kit';
import { useNavigate } from 'react-router-dom';
import { useParams } from 'react-router-dom';

import { useIsMobile } from "../app_components/ResponsiveModule";

import { MenuItem, getSideBarMenuItems } from "../auth_module/pagesManager";

export interface SidebarProps {
  contentRef: HTMLElement | undefined;
  appState: string;
  setAppState?: React.Dispatch<React.SetStateAction<string>>;
  /** Render prop for header content inside sidenav on mobile, receives onClose callback */
  mobileHeader?: (onClose: () => void) => ReactNode;
  /** Controllo esterno di open/close */
  open?: boolean;
  onOpenChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

const SideNav: React.FC<SidebarProps> = ({
  contentRef,
  appState = "init",
  setAppState,
  mobileHeader,
  open: openProp,
  onOpenChange
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile(992);

  const urlParams = useParams<Record<string, string>>();

  const [sideItems, setSideItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [openCollapses, setOpenCollapses] = useState<{ [key: string]: boolean }>({});
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  const buildPath = (item: MenuItem) => {
    if (item.url_param && urlParams[item.url_param]) {
      return `${item.path}/${urlParams[item.url_param]}`;
    }
    return item.path;
  };

  // Sidebar open state based on device
  const [basicOpenInternal, setBasicOpenInternal] = useState(true);
  // se openProp è definito, lo usiamo, altrimenti lo stato interno
  const basicOpen = openProp !== undefined ? openProp : basicOpenInternal;
  // idem per il setter
  const setBasicOpen = onOpenChange ?? setBasicOpenInternal;
  const [slimMode, setSlimMode] = useState(false);

  // Sync open state when switching between mobile and desktop
  useEffect(() => {
    setBasicOpen(!isMobile);
  }, [isMobile]);

  const isNavCollapsed = slimMode && Object.values(openCollapses).every(v => !v);

  const toggleCollapse = (key: string) => {
    setOpenCollapses(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Fetch menu items
  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const response = await getSideBarMenuItems(appState);
        if (response.response.success) setSideItems(response.menuItems || []);
      } catch (err) {
        console.error("Error fetching sidebar menu items:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [appState]);

  // Adjust content padding for desktop
  useEffect(() => {
    if (!contentRef) return;
    if (isMobile) {
      contentRef.style.padding = '20px';
    } else {
      const paddingLeft = !basicOpen
        ? '0px'
        : isNavCollapsed
          ? '97px'
          : '260px';
      contentRef.style.padding = `20px 20px 20px ${paddingLeft}`;
    }
  }, [contentRef, isMobile, basicOpen, isNavCollapsed]);

  // Handle navigation after state update
  useEffect(() => {
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, navigate]);

  const onClickChangeAppState = (newState?: string, path?: string) => {
    if (newState && setAppState) setAppState(newState);
    if (path) setPendingNavigation(path);
  };

  const renderMenuItems = (items: MenuItem[]) => items.map(item => {
    const hasChildren = item.childrens && item.childrens.length > 0;
    if (!hasChildren) {
      return (
        <MDBSideNavItem key={item.name}>
          <MDBSideNavLink onClick={() => onClickChangeAppState(item.newAppState, buildPath(item))}>
            {item.icon && <MDBIcon fas icon={item.icon} className="fa-fw me-3" style={{color:"white"}}/>}
            <span className="sidenav-non-slim">{item.name}</span>
          </MDBSideNavLink>
        </MDBSideNavItem>
      );
    }
    return (
      <MDBSideNavItem key={item.name}>
        <MDBSideNavLink
          icon="angle-down"
          shouldBeExpanded={!!openCollapses[item.name]}
          onClick={e => { e.preventDefault(); toggleCollapse(item.name); }}
        >
          {item.icon && <MDBIcon fas icon={item.icon} className="fa-fw me-3" />}
          <span className="sidenav-non-slim">{item.name}</span>
        </MDBSideNavLink>
        <MDBSideNavCollapse open={!!openCollapses[item.name]}>
          {renderMenuItems(item.childrens!)}
        </MDBSideNavCollapse>
      </MDBSideNavItem>
    );

  });

  return (
    <>
      <MDBSideNav
        mode={isMobile ? 'over' : 'side'}
        open={basicOpen}
        getOpenState={setBasicOpen}
        absolute
        contentRef={contentRef}
        slim={!isMobile && slimMode}
        slimCollapsed={isNavCollapsed}
        closeOnEsc={isMobile}
        style={{background:"rgba(33, 56, 74, 1)", color:"white"}}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <MDBIcon fas icon="spinner" spin size="2x" />
          </div>
        ) : (


          <MDBSideNavMenu>
            {/* Se siamo su mobile, inietta qui i link custom (senza wrappare in un altro MDBSideNavItem) */}
            {isMobile && mobileHeader && (
              mobileHeader(() => setBasicOpen(false))
            )}

            {/* Desktop: toggle slim mode */}
            {!isMobile && (
              <MDBSideNavItem>
                <MDBSideNavLink onClick={() => { setSlimMode(s => !s); setOpenCollapses({}); }}>
                  <MDBIcon fas icon="bars" className="fa-fw me-3" style={{color:"white"}}/>
                </MDBSideNavLink>
              </MDBSideNavItem>
            )}

            {/* Voci standard */}
            {renderMenuItems(sideItems)}
          </MDBSideNavMenu>
        )}
      </MDBSideNav>
      </>
  );
};

export default SideNav;
