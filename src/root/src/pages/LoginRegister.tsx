import { useState, useEffect } from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCard,
  MDBCol,
  MDBCardBody,
  MDBTabs,
  MDBTabsItem,
  MDBTabsLink,
  MDBTabsPane,
  MDBTabsContent,
  MDBCheckbox,
  MDBInput,
  MDBBtn,
} from "mdb-react-ui-kit";
import { useNavigate } from 'react-router-dom';
import { loginFunction, LoginResponse } from "../auth_module/loginFunctions";
import { useAuth } from '../auth_module/AuthContext';

const LoginRegister = () => {
  const [fillActive, setFillActive] = useState("tab-login");
  const { isAuthenticated, refreshAuth } = useAuth();
  const navigate = useNavigate();

  // Stati per il form di login
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFillClick = (value: string) => {
    if (value === fillActive) return;
    setFillActive(value);
  };

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!loginName || !loginPassword) {
      setLoginError("Please fill in all fields");
      return;
    }
    setLoginError("");
    setIsSubmitting(true);

    try {
      const response: LoginResponse = await loginFunction(loginName, loginPassword, rememberMe);
      // Modifica qui: controlla solo il campo success
      if (response.success) {
        await refreshAuth();
        navigate('/dashboard', { replace: true });
      } else {
        setLoginError(response.message);
      }
    } catch (err: any) {
      setLoginError("An error occurred during login");
    }
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <MDBContainer className="pt-5">
      <MDBRow className="d-flex justify-content-center">
        <MDBCol md="6">
          <MDBCard>
            <MDBCardBody className="p-4">
              <MDBTabs pills fill className="mb-3">
                <MDBTabsItem>
                  <MDBTabsLink
                    onClick={() => handleFillClick("tab-login")}
                    active={fillActive === "tab-login"}
                  >
                    Login
                  </MDBTabsLink>
                </MDBTabsItem>
                <MDBTabsItem>
                  <MDBTabsLink
                    onClick={() => handleFillClick("tab-register")}
                    active={fillActive === "tab-register"}
                  >
                    Register
                  </MDBTabsLink>
                </MDBTabsItem>
              </MDBTabs>

              <MDBTabsContent>
                <MDBTabsPane
                  className={fillActive === "tab-login" ? "show active" : "fade"}
                  aria-labelledby="tab-login"
                >
                  <form onSubmit={handleLoginSubmit}>
                    <h5 className="text-center mb-3">Insert username and password</h5>

                    {loginError && <div className="alert alert-danger">{loginError}</div>}

                    <MDBInput
                      className="mb-4"
                      type="email"
                      id="loginName"
                      label="Email or username"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      required
                    />

                    <MDBInput
                      className="mb-4"
                      type="password"
                      id="loginPassword"
                      label="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />

                    <MDBRow className="mb-4">
                      <MDBCol md="6" className="d-flex justify-content-center">
                        <MDBCheckbox
                          className="mb-3 mb-md-0"
                          checked={rememberMe}
                          label=" Remember me"
                          onChange={(e) => setRememberMe(e.target.checked)}
                        />
                      </MDBCol>

                      <MDBCol md="6" className="d-flex justify-content-center">
                        <a href="#!">Forgot password?</a>
                      </MDBCol>
                    </MDBRow>

                    <MDBBtn type="submit" block className="mb-4" disabled={isSubmitting}>
                      {isSubmitting ? "Signing in..." : "Sign in"}
                    </MDBBtn>
                  </form>
                </MDBTabsPane>
                {/* Sezione registrazione, se necessaria */}
              </MDBTabsContent>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
};

export default LoginRegister;
