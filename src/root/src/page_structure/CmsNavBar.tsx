import React from "react";
import { MDBNavbar, MDBContainer, MDBNavbarNav, MDBNavbarItem, MDBNavbarLink } from "mdb-react-ui-kit";

interface GodNavProps {
  isGod: boolean;
}

const GodNav: React.FC<GodNavProps> = ({ isGod }) => {
  
  if (!isGod) {
    return null;
  }

  return (
    <MDBNavbar light bgColor="warning" className="py-2">
      <MDBContainer fluid>
        <MDBNavbarNav>
          <MDBNavbarItem>
            <MDBNavbarLink href="/cms-pages-manager">
              Pages Manager
            </MDBNavbarLink>
          </MDBNavbarItem>
        </MDBNavbarNav>
      </MDBContainer>
    </MDBNavbar>
  );
};

export default GodNav;
