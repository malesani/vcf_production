import React, { useEffect, useState } from 'react';
import {
  MDBRow,
  MDBCol,
  MDBCard,
} from 'mdb-react-ui-kit';
import CustomerDataForm from '../components/CustomerDataForm';


const ExternCompanyInfo = () => {
    return (
        <MDBRow className="d-flex justify-content-center align-items-center">
            <MDBCol md="12">
            <MDBCard className="p-4">
                <CustomerDataForm />
            </MDBCard>
            </MDBCol>
        </MDBRow>
      );
    };
    
export default ExternCompanyInfo;