import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBSpinner } from "mdb-react-ui-kit";
import { useNavigate, useSearchParams } from "react-router-dom";

import { validateRInvitation, APIinviteCodeInfo } from "../auth_module/SingupFunctions";
import SignupForm_Invitation from "../app_components/SignupForm_Invitation";
import { useLogos } from "../hooks/AssetsManager";

type Banner = { type: "success" | "error"; text: string } | null;

const SignUp: React.FC = () => {

  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const signupEmail = params.get("email") ?? "";
  const fromQuiz = params.get("from_quiz") === "1";

  const [banner, setBanner] = useState<Banner>(null);

  const { logo_default } = useLogos();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t") || "";

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteValidated, setInviteValidated] = useState(false);
  const [signUpError, setSignUpError] = useState<string>("");
  const [inviteInfo, setInviteInfo] = useState<APIinviteCodeInfo | null>(null);

  useEffect(() => {
    if (fromQuiz) {
      setBanner({
        type: "success",
        text: "Grazie per aver compilato il quiz — completa la registrazione per salvare i risultati."
      });
    } else {
      setBanner(null);
    }
  }, [fromQuiz]);

  // --- VALIDAZIONE TOKEN SOLO SE PRESENTE ---
  useEffect(() => {
    if (!token) {
      setInviteValidated(true);
      setInviteInfo(null);
      setSignUpError("");
      return;
    }

    setInviteLoading(true);
    validateRInvitation({ token })
      .then(({ response, data }) => {
        if (response.success && data) {
          setInviteInfo(data);
          setInviteValidated(true);
          setSignUpError("");
        } else {
          setSignUpError("Link non valido o scaduto.");
          setInviteValidated(false);
        }
      })
      .catch(() => {
        setSignUpError("Errore durante la validazione del link.");
        setInviteValidated(false);
      })
      .finally(() => {
        setInviteLoading(false);
      });
  }, [token]);

  const title = useMemo(() => {
    if (token) return "Completa la registrazione";
    return "Crea il tuo account";
  }, [token]);

  const prefilledEmail = useMemo(() => {
    // priorità: invito -> quiz -> undefined
    return (
      inviteInfo?.sendToEmail ||
      inviteInfo?.metadata?.email ||
      (signupEmail ? signupEmail : undefined)
    );
  }, [inviteInfo, signupEmail]);

  return (
    <section className="vh-100">
      <MDBContainer fluid className="py-5 h-100">
        <MDBRow className="d-flex align-items-center justify-content-center gap-5 h-100">
          <MDBCol md="8" lg="7" xl="6">
            <img
              src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.svg"
              className="img-fluid"
              alt="Illustration"
            />
          </MDBCol>

          <MDBCol md="7" lg="5" xl="5">
            <MDBCard className="p-4">
              <div className="text-center mb-3">
                <img src={logo_default} style={{ width: 120 }} alt="logo" />
                <h4 className="mt-1 mt-3 pb-1">{title}</h4>
              </div>

              {banner && (
                <div className={`alert alert-${banner.type === "success" ? "success" : "danger"} mb-3`}>
                  {banner.text}
                </div>
              )}

              {inviteLoading ? (
                <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 220 }}>
                  <MDBSpinner role="status">
                    <span className="visually-hidden">Loading...</span>
                  </MDBSpinner>
                </div>
              ) : (
                <>
                  {signUpError && <div className="alert alert-danger mb-3">{signUpError}</div>}

                  {/* Se token presente ma non valido -> non mostro form */}
                  {token && !inviteValidated ? null : (
                    <SignupForm_Invitation token={token} email={prefilledEmail} />
                  )}

                  <hr className="my-4" />

                  <p className="text-center mb-0">
                    Hai già un account?{" "}
                    <span
                      className="link-info"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate("/login", { replace: true })}
                    >
                      Vai al login
                    </span>
                  </p>
                </>
              )}
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </section>
  );
};

export default SignUp;
