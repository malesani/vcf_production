import React, { useEffect, useMemo, useState } from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBValidation,
  MDBValidationItem,
  MDBInput,
  MDBBtn
} from "mdb-react-ui-kit";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth_module/AuthContext";
import {
  loginFunction,
  profileFunction,
  forgotPasswordFunction
} from "../auth_module/loginFunctions";
import useLoginFormValidation from "../hooks/LoginFormValidation";
import Loading from "../pages/Loading";
import { useLogos } from "../hooks/AssetsManager";

import { activateAccountRequest } from "../auth_module/SingupFunctions";

type Banner = { type: "success" | "error"; text: string } | null;

const LoginForm: React.FC = () => {
  const { logo_default } = useLogos();
  const { isAuthenticated, refreshAuth, companiesData } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { email, password } = useLoginFormValidation("login");

  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [rememberMe, setRememberMe] = useState(false);
  const [validated, setValidated] = useState(false);

  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const initialEmail = params.get("email") ?? "";
  const justActivated = params.get("activated") === "1";
  const pwdResetFlag = params.get("pwd_reset") === "1";

  const activationToken = params.get("activation_token") ?? "";

  // già autenticato con una sola azienda => dashboard
  useEffect(() => {
    if (isAuthenticated && companiesData.length <= 1) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, companiesData, navigate]);

  // Precompila email se arriva da query
  useEffect(() => {
    if (initialEmail) {
      email.handleEmailChange({
        target: {
          value: initialEmail,
          setCustomValidity: (_: string) => { }
        }
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [initialEmail]);

  // Auto-activate se arriva activation_token
  useEffect(() => {
    if (!activationToken) return;

    (async () => {
      try {
        setBusy(true);

        // ✅ payload corretto: token string
        const { response } = await activateAccountRequest({ token: activationToken });

        if (response.success) {
          // signup.activation.success / already_done ecc...
          const msg = response.message;

          if (msg === "signup.activation.already_done") {
            setBanner({ type: "success", text: "Account già attivato, effettua il login." });
          } else {
            setBanner({ type: "success", text: "Il tuo account è stato attivato: inserisci la password per accedere." });
          }

          // (opzionale ma consigliato) pulisci la query per non riattivare al refresh
          // navigate("/login", { replace: true });

        } else {
          setBanner({
            type: "error",
            text: response.message === "signup.activation.invalid"
              ? "Link di attivazione non valido o scaduto."
              : (response.message || "Errore durante l’attivazione account.")
          });
        }
      } catch (e) {
        console.error(e);
        setBanner({ type: "error", text: "Errore durante l’attivazione account." });
      } finally {
        setBusy(false);
      }
    })();
  }, [activationToken]);


  // Banner: error codes + pwd_reset + activated. Da mettere possibilmente in una gestione unica (to be decided)
  useEffect(() => {
    if (activationToken) return;
    const hasError = params.get("error") === "1";
    const errMsg = params.get("msg");
    const errCode = params.get("err_code");

    if (hasError) {
      let text: string;
      switch (errCode) {
        case "reset_invalid":
          text = "Link di reset non valido o scaduto. Richiedi un nuovo reset della password.";
          break;
        case "reset_used":
          text = "Il link per il reset della password è già stato utilizzato. Richiedi un nuovo link.";
          break;
        default:
          text = errMsg ?? "Sessione scaduta. Effettua nuovamente il login.";
          break;
      }
      setBanner({ type: "error", text });
      return;
    }

    if (pwdResetFlag) {
      setBanner({
        type: "success",
        text: "Password aggiornata correttamente, effettua l’accesso con le nuove credenziali."
      });
      return;
    }

    if (justActivated) {
      setBanner({
        type: "success",
        text: "Il tuo account è stato attivato: inserisci la password per accedere."
      });
      return;
    }

    if (activationToken) return;
    setBanner(null);
  }, [params, pwdResetFlag, justActivated]);

  const title = useMemo(
    () => (mode === "login" ? "Sign into your account" : "Recover your password"),
    [mode]
  );

  const resetMessages = () => setBanner(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidated(true);

    if (email.emailInvalid || password.passwordInvalid) return;

    resetMessages();
    setBusy(true);

    try {
      const loginResp = await loginFunction(email.value, password.value, rememberMe);
      if (!loginResp.success) {
        setBanner({ type: "error", text: loginResp.message || "Login failed." });
        return;
      }

      const profileResp = await profileFunction();
      if (!profileResp.response.success || !profileResp.data) {
        setBanner({
          type: "error",
          text: profileResp.response.message || "Could not load profile."
        });
        return;
      }

      const companies = profileResp.data.companies_data ?? [];
      await refreshAuth();

      const returnTo = params.get("return_to");
      if (returnTo && returnTo.startsWith("/")) {
        navigate(returnTo, { replace: true });
        return;
      }

      navigate(companies.length > 1 ? "/choose_company" : "/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setBanner({ type: "error", text: "An error occurred during login." });
    } finally {
      setBusy(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidated(true);
    if (email.emailInvalid) return;

    resetMessages();
    setBusy(true);

    try {
      const resp = await forgotPasswordFunction(email.value);

      if (!resp.success) {
        setBanner({ type: "error", text: "Something went wrong. Please try later." });
        return;
      }

      setBanner({
        type: "success",
        text: "If this email exists in our system, you’ll receive a password reset link shortly."
      });
    } catch (err) {
      console.error(err);
      setBanner({ type: "error", text: "Something went wrong. Please try later." });
    } finally {
      setBusy(false);
    }
  };

  if (busy) return <Loading />;

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
                <div className={`alert alert-${banner.type === "success" ? "success" : "danger"}`}>
                  {banner.text}
                </div>
              )}

              {mode === "login" ? (
                <MDBValidation noValidate isValidated={validated} onSubmit={handleLoginSubmit} className="row g-3">
                  <MDBValidationItem feedback={email.emailFeedback} invalid={email.emailInvalid}>
                    <MDBInput
                      wrapperClass="form-outline mb-4"
                      label="Email address"
                      id="login-email"
                      type="email"
                      size="lg"
                      value={email.value}
                      onChange={email.handleEmailChange}
                      disabled={!!initialEmail || !!activationToken}
                      required
                    />
                  </MDBValidationItem>

                  <MDBValidationItem feedback={password.passwordFeedback} invalid={password.passwordInvalid}>
                    <MDBInput
                      wrapperClass="form-outline mb-4"
                      label="Password"
                      id="login-password"
                      type="password"
                      size="lg"
                      value={password.value}
                      onChange={password.handlePasswordChange}
                      required
                    />
                  </MDBValidationItem>

                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="login-remember"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <label className="form-check-label" htmlFor="login-remember">
                        Remember me
                      </label>
                    </div>

                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => {
                        setMode("forgot");
                        resetMessages();
                        setValidated(false);
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <MDBBtn type="submit" className="btn btn-primary btn-lg btn-block">
                    Sign in
                  </MDBBtn>
                </MDBValidation>
              ) : (
                <MDBValidation noValidate isValidated={validated} onSubmit={handleForgotSubmit} className="row g-3">
                  <p className="text-muted text-center">
                    Enter your email. If it’s registered, we’ll send you a reset link.
                  </p>

                  <MDBValidationItem feedback={email.emailFeedback} invalid={email.emailInvalid}>
                    <MDBInput
                      wrapperClass="form-outline mb-4"
                      label="Email address"
                      id="forgot-email"
                      type="email"
                      size="lg"
                      value={email.value}
                      onChange={email.handleEmailChange}
                      required
                    />
                  </MDBValidationItem>

                  <div className="d-flex justify-content-between align-items-center">
                    <button
                      type="button"
                      className="btn btn-link p-0"
                      onClick={() => {
                        setMode("login");
                        resetMessages();
                        setValidated(false);
                      }}
                    >
                      ⬅ Back to login
                    </button>

                    <MDBBtn type="submit">Send reset link</MDBBtn>
                  </div>
                </MDBValidation>
              )}

              {mode === "login" && (
                <>
                  <div className="divider d-flex justify-content-center align-items-center my-2">
                    <p className="text-center fw-bold mx-3 mb-0 text-muted">OR</p>
                  </div>

                  <MDBBtn className="btn btn-primary btn-lg btn-block mb-2" color="secondary">
                    <i className="fab fa-google me-2"></i>
                    Continue with Google
                  </MDBBtn>

                  <hr className="my-4" />

                  <p className="text-center mb-0">
                    Don't have an account?{" "}
                    <a
                      onClick={() => navigate("/signup", { replace: true })}
                      className="link-info"
                      style={{ cursor: "pointer" }}
                    >
                      Register here
                    </a>
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

export default LoginForm;
