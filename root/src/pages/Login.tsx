import { useState, useEffect } from "react";
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
import { useAuth } from "../auth_module/AuthContext";
import { useNavigate } from "react-router-dom";
import { loginFunction, profileFunction } from "../auth_module/loginFunctions";
import { useLogos } from '../hooks/AssetsManager';

import useLoginFormValidation from "../hooks/LoginFormValidation";
import Loading from '../pages/Loading';

const LoginForm: React.FC = () => {
  const {logo_default} = useLogos();

  const { isAuthenticated, refreshAuth, companiesData } = useAuth();
  const navigate = useNavigate();

  const { email, password } = useLoginFormValidation("login");

  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validated, setValidated] = useState<boolean>(false);

  // Se già autenticato con una sola azienda, vai subito in dashboard
  useEffect(() => {
    if (isAuthenticated && companiesData.length <= 1) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, companiesData, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidated(true);
    if (email.emailInvalid || password.passwordInvalid) return;
  
    setLoginError("");
    setIsSubmitting(true);
  
    try {
      // 1) fai il login
      const loginResp = await loginFunction(email.value, password.value, rememberMe);
      if (!loginResp.success) {
        setLoginError(loginResp.message);
        return;
      }
  
      // 2) chiami profileFunction() per avere subito il companies_data
      const profileResp = await profileFunction();
            console.log('profileResp', profileResp);

      if (!profileResp.response.success || !profileResp.data) {
        setLoginError(profileResp.response.message);
        return;
      }
  
      const companies = profileResp.data.companies_data ?? [];
  
      // 3) aggiorni il context
      await refreshAuth();
  
      // 4) nav a seconda del numero di companies
      if (companies.length > 1) {
        navigate("/choose_company", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
  
    } catch (err) {
      console.error(err);
      setLoginError("An error occurred during login");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mostra la pagina di loading a schermo intero durante l'invio
  if (isSubmitting) {
    return <Loading />;
  }

  return (
    <section className="vh-100">
      <MDBContainer fluid className="py-5">
        <MDBRow className="d-flex align-items-center justify-content-center gap-5">
          <MDBCol md="8" lg="7" xl="6">
            <img
              src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.svg"
              className="img-fluid"
              alt="Phone image"
            />
          </MDBCol>
          <MDBCol md="7" lg="5" xl="5">
            <MDBCard className="p-4">
              <div className="text-center mb-3">
                <img src={logo_default} style={{ width: 120 }} alt="logo" />
                <h4 className="mt-1 mt-3 pb-1">Sign into your account</h4>
              </div>
              {loginError && <div className="alert alert-danger">{loginError}</div>}
              <MDBValidation
                noValidate
                isValidated={validated}
                onSubmit={handleLoginSubmit}
                className="row g-3"
              >
                <MDBValidationItem
                  feedback={email.emailFeedback}
                  invalid={email.emailInvalid}
                >
                  <MDBInput
                    wrapperClass="form-outline mb-4"
                    label="Email address"
                    id="login-email"
                    type="email"
                    size="lg"
                    value={email.value}
                    onChange={email.handleEmailChange}
                    required
                  />
                </MDBValidationItem>
                <MDBValidationItem
                  feedback={password.passwordFeedback}
                  invalid={password.passwordInvalid}
                >
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
                  <a href="#!">Forgot password?</a>
                </div>
                <MDBBtn
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={isSubmitting}
                >
                  Sign in
                </MDBBtn>
              </MDBValidation>

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
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </section>
  );
};

export default LoginForm;
