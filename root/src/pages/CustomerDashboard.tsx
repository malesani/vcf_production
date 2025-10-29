import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import {
  MDBRow,
  MDBCol,
  MDBCard,
} from 'mdb-react-ui-kit';

import CustomerDataForm from "../components/CustomerDataForm";

const CustomerDashboard: React.FC = () => {
  const { customer_uid: customer_uid } = useParams<{ customer_uid: string }>();
  if (!customer_uid) {
    return (<div className="alert alert-danger">
      UID del cliente mancante in URL!
    </div>);  // o qualsiasi fallback
  }
  return (
    <MDBRow className="d-flex justify-content-center align-items-center">
      <MDBCol className="mb-3" md="12">
        <MDBCard className="p-4 pb-2">
          <h3>Dashboard Cliente</h3>
        </MDBCard>
      </MDBCol>
      <MDBCol className="mb-3" md="12">
        <MDBCard className="p-4 pb-2">
          <CustomerDataForm />
        </MDBCard>
      </MDBCol>
    </MDBRow>
  );
};

export default CustomerDashboard;
