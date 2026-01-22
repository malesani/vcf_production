import React from "react";
import {
  MDBNavbar,
  MDBNavbarBrand,
  MDBBtn,
  MDBIcon
} from "mdb-react-ui-kit";
import { useIsMobile } from "../app_components/ResponsiveModule";

interface TopBarSimpleProps {
  logoImg?: string;
  toggleSidebar?: () => void;
}

const TopBarSimple: React.FC<TopBarSimpleProps> = ({ logoImg = "", toggleSidebar }) => {
  const isMobile = useIsMobile(992);

  return (
    <MDBNavbar light className="px-3">
      <div className="d-flex align-items-center justify-content-between w-100">

        {/* Left: toggle sidebar (solo mobile, opzionale) */}
        <div style={{ width: 40 }}>
          {isMobile && toggleSidebar && (
            <MDBBtn
              color="link"
              className="p-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar();
              }}
            >
              <MDBIcon fas icon="bars" size="lg" />
            </MDBBtn>
          )}
        </div>

        {/* Center: logo */}
        <MDBNavbarBrand
          href="/dashboard"
          className="mx-auto d-flex justify-content-center"
          style={{ pointerEvents: "auto" }}
        >
          <img src={logoImg} height="45" alt="Logo" loading="lazy" />
        </MDBNavbarBrand>

        {/* Right: placeholder vuoto per mantenere il centro perfetto */}
        <div style={{ width: 40 }} />
      </div>
    </MDBNavbar>
  );
};

export default TopBarSimple;
