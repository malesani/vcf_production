import { useEffect, useMemo, useState } from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBValidation,
  MDBValidationItem,
  MDBInput,
  MDBBtn,
  MDBIcon
} from "mdb-react-ui-kit";
import { useNavigate, useLocation } from "react-router-dom";
import { resetPasswordFunction } from "../auth_module/loginFunctions";
import Loading from "../pages/Loading";
import { useLogos } from "../hooks/AssetsManager";

type TokenState = "checking" | "valid" | "invalid";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logo_default } = useLogos();

  const token = useMemo(() => {
    const search = new URLSearchParams(location.search);
    return search.get("token") ?? "";
  }, [location.search]);

  const [tokenState, setTokenState] = useState<TokenState>("checking");

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  const [validated, setValidated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const pwTooShort = pw.length > 0 && pw.length < 8;
  const pwInvalid = (validated && pw.length === 0) || pwTooShort;

  const pw2Invalid =
    (validated && pw2.length === 0) || (validated && pw.length > 0 && pw2 !== pw);

  const pwFeedback =
    validated && pw.length === 0
      ? "Inserisci una nuova password."
      : pwTooShort
      ? "La password deve contenere almeno 8 caratteri."
      : "";

  const pw2Feedback =
    validated && pw2.length === 0
      ? "Conferma la nuova password."
      : validated && pw.length > 0 && pw2 !== pw
      ? "Le password non coincidono."
      : "";

  useEffect(() => {
    if (!token) {
      navigate(`/login?error=1&err_code=reset_invalid`, { replace: true });
      return;
    }

    (async () => {
      try {
        const resp = await fetch(
          `/auth/api/reset.php?token=${encodeURIComponent(token)}`,
          { method: "GET", headers: { "Content-Type": "application/json" } }
        );
        const data = await resp.json().catch(() => null);

        if (!resp.ok || !data || !data.success) {
          const errCode = data?.code === "used" ? "reset_used" : "reset_invalid";
          navigate(`/login?error=1&err_code=${errCode}`, { replace: true });
          return;
        }

        setTokenState("valid");
      } catch (e) {
        console.error(e);
        navigate(
          `/login?error=1&msg=${encodeURIComponent(
            "Impossibile verificare il link di reset. Ripeti l’operazione."
          )}`,
          { replace: true }
        );
      } finally {
        setTokenState((s) => (s === "valid" ? "valid" : "invalid"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidated(true);
    setBannerError(null);

    if (!token) {
      setBannerError("Link di reset non valido o mancante.");
      return;
    }
    if (pwInvalid || pw2Invalid) return;

    setSubmitting(true);
    try {
      const resp = await resetPasswordFunction(token, pw, pw2);

      if (!resp.success) {
        setBannerError(resp.message || "Errore durante il reset della password.");
        return;
      }

      const targetEmail = resp.email ? encodeURIComponent(resp.email) : "";
      const qp: string[] = ["pwd_reset=1"];
      if (targetEmail) qp.unshift(`email=${targetEmail}`);

      navigate(`/login?${qp.join("&")}`, { replace: true });
    } catch (err) {
      console.error(err);
      setBannerError("Si è verificato un errore imprevisto durante il reset della password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitting || tokenState === "checking") return <Loading />;
  if (tokenState !== "valid") return null;

  return (
    <section className="vh-100">
      <MDBContainer fluid className="py-5 h-100">
        <MDBRow className="d-flex align-items-center justify-content-center gap-5 h-100">
          {/* Colonna sinistra: stessa del login */}
          <MDBCol md="8" lg="7" xl="6">
            <img
              src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.svg"
              className="img-fluid"
              alt="Illustration"
            />
          </MDBCol>

          {/* Colonna destra: card con logo come login */}
          <MDBCol md="7" lg="5" xl="5">
            <MDBCard className="p-4">
              <div className="text-center mb-3">
                <img src={logo_default} style={{ width: 120 }} alt="logo" />
                <h4 className="mt-1 mt-3 pb-1">Reset your password</h4>
              </div>

              {bannerError && <div className="alert alert-danger">{bannerError}</div>}

              <MDBValidation noValidate isValidated={validated} onSubmit={handleSubmit} className="row g-3">
                <MDBValidationItem feedback={pwFeedback} invalid={pwInvalid}>
                  <div className="position-relative">
                    <MDBInput
                      wrapperClass="form-outline mb-4"
                      label="New password"
                      id="reset-password"
                      type={showPw ? "text" : "password"}
                      size="lg"
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      required
                    />
                    <MDBIcon
                      fas
                      icon={showPw ? "eye-slash" : "eye"}
                      onClick={() => setShowPw(!showPw)}
                      style={{
                        position: "absolute",
                        right: "15px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#6c757d"
                      }}
                    />
                  </div>
                </MDBValidationItem>

                <MDBValidationItem feedback={pw2Feedback} invalid={pw2Invalid}>
                  <div className="position-relative">
                    <MDBInput
                      wrapperClass="form-outline mb-4"
                      label="Confirm new password"
                      id="reset-password-confirm"
                      type={showPw2 ? "text" : "password"}
                      size="lg"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      required
                    />
                    <MDBIcon
                      fas
                      icon={showPw2 ? "eye-slash" : "eye"}
                      onClick={() => setShowPw2(!showPw2)}
                      style={{
                        position: "absolute",
                        right: "15px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#6c757d"
                      }}
                    />
                  </div>
                </MDBValidationItem>

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <small className="text-muted">Password must be at least 8 characters.</small>
                </div>

                <MDBBtn type="submit" className="btn btn-primary btn-lg btn-block mb-2" disabled={submitting}>
                  Update password
                </MDBBtn>

                <MDBBtn
                  type="button"
                  outline
                  color="secondary"
                  className="btn btn-lg btn-block"
                  onClick={() => navigate("/login", { replace: true })}
                >
                  Back to login
                </MDBBtn>
              </MDBValidation>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </section>
  );
};

export default ResetPassword;
