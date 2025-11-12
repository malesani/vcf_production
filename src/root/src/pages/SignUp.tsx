import React, { useEffect, useState, useRef } from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBSpinner
} from "mdb-react-ui-kit";
import { useNavigate, useSearchParams } from "react-router-dom";

import { validateRInvitation, APIinviteCodeInfo } from "../auth_module/SingupFunctions";

import SignupForm_Invitation from '../app_components/SignupForm_Invitation';

import SignUp_OLD from '../pages/SignUp_OLD';

const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") || "";

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteValidated, setInviteValidated] = useState(false);
  const [signUpError, setSignUpError] = useState<string>("");

  // --- VALIDAZIONE INVITO (simile al tuo useEffect) ---
  useEffect(() => {
    if (!token) {
      setInviteValidated(true);
      return;
    }
    setInviteLoading(true);
    validateRInvitation({ token })
      .then(({ response, data }) => {
        if (response.success && data) {
          setInviteValidated(true);
        } else {
          setSignUpError("Link di invito non valido o scaduto.");
        }
      })
      .catch(() => {
        setSignUpError("Errore durante la validazione dell’invito.");
      })
      .finally(() => {
        setInviteLoading(false);
      });
  }, [token]);

  return (
    <MDBContainer fluid className="pt-4">
      <MDBRow className="d-flex justify-content-center align-items-center h-100">
        <MDBCol md="6" lg="5" xl="4">
          <MDBCard className="p-4">
            {inviteLoading ? (
              <div className="d-flex justify-content-center align-items-center vh-100">
                <MDBSpinner role="status">
                  <span className="visually-hidden">Loading...</span>
                </MDBSpinner>
              </div>
            ) : inviteValidated ? (
              // === qui mostri la tua form di invito ===
              <SignupForm_Invitation
                token={token}
              />
            ) : (
              <>
                {signUpError && (
                  <div className="text-danger mb-3">{signUpError}</div>
                )}
                <SignUp_OLD />
              </>
            )}
          </MDBCard>
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
};

export default SignUp;
