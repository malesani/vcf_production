import React, { ReactNode, useState, useEffect, useRef } from "react";
import { MDBContainer, MDBBtn, MDBIcon } from "mdb-react-ui-kit";
import { useLogos } from '../hooks/AssetsManager';
import NavBar from "./NavBar";
import TopBar from "./TopBar";
import SideNav from "./SideNav";
import MobileNavLinks from "./MobileNavLinks";

import CmsNavBar from "./CmsNavBar";
import { useAuth } from "../auth_module/AuthContext";

import { useIsMobile } from "../app_components/ResponsiveModule";
import General_Loading from "../app_components/General_Loading";

interface SkeletonProps {
  children: ReactNode;
  def_appState?: string;
  noNavbar?: boolean;
  noTopBar?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ children, def_appState, noNavbar, noTopBar }) => {
  const isMobile = useIsMobile(768);
  const {logo_small, logo_large} = useLogos();
  const logo = (isMobile ? logo_small : logo_large);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const { isSuperadmin, loading } = useAuth();
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  const [appState, setAppState] = useState<string>(def_appState ? def_appState : "init");

  // stato di apertura sidenav liftato
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);


  useEffect(() => {
    if (def_appState) {
      setAppState(def_appState);
    }
  }, [def_appState]);

  // come nell'esempio MDB, dopo il primo render salvo contentRef.current
  useEffect(() => {
    if (contentRef.current) {
      setContainer(contentRef.current);
    }
  }, []);

  //debug
  console.log('appstate: ', appState);

  if (loading) {
    return <General_Loading theme="appLoading" />;
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%" }}>

      { /* HERE ALL SUPERADMIN CONTENT */}
      {isSuperadmin && <CmsNavBar isGod={true} />}
      {!noTopBar && (
        <TopBar
          logoImg={logo}
          toggleSidebar={() => setSidebarOpen(o => !o)}
          appState={appState} setAppState={setAppState}
        />
      )}
      {!noNavbar && <NavBar logoImg={logo} appState={appState} setAppState={setAppState} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />}

      <div style={{ minHeight: "100vh", position: "relative" }}>
        {container && (
          <SideNav
            contentRef={container}
            appState={appState}
            setAppState={setAppState}
            mobileHeader={onClose => <MobileNavLinks onClose={onClose} />}
            open={sidebarOpen}
            onOpenChange={setSidebarOpen} />
        )}
        <div
          // il ref vero e proprio
          ref={contentRef}
          // opzionale: se vuoi che il data-mdb-content punti ad ID
          id="slim-content"
        >
          <MDBContainer fluid>{children}</MDBContainer>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
