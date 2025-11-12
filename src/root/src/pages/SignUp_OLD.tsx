import { useEffect, useState, useRef } from "react";
import {
  MDBContainer,
  MDBCard,
  MDBRow,
  MDBCol,
  MDBValidation,
  MDBValidationItem,
  MDBInput,
  MDBBtn,
  MDBSpinner
} from "mdb-react-ui-kit";
import { useNavigate, useSearchParams } from "react-router-dom";
import logoImg from "../assets/react.svg";

import { validateRInvitation, APIinviteCodeInfo } from "../auth_module/SingupFunctions";

const SignUp_OLD = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Stati generali
  const [validated, setValidated] = useState(false);
  const [signUpError, setSignUpError] = useState<string>("");
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Stati “invito”
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteValidated, setInviteValidated] = useState(false);

  // Campi del form
  const [signupFName, setSignupFName] = useState("");
  const [signupLName, setSignupLName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPw, setSignupPw] = useState("");
  const [signupRePw, setSignupRePw] = useState("");

  // Stati di validazione dinamica per ogni campo
  const [fNameInvalid, setFNameInvalid] = useState(true);
  const [fNameFeedback, setFNameFeedback] = useState("First name is required.");

  const [lNameInvalid, setLNameInvalid] = useState(true);
  const [lNameFeedback, setLNameFeedback] = useState("Last name is required.");

  const [emailInvalid, setEmailInvalid] = useState(true);
  const [emailFeedback, setEmailFeedback] = useState("A valid email is required.");

  const [passwordInvalid, setPasswordInvalid] = useState(true);
  const [passwordFeedback, setPasswordFeedback] = useState("Please choose a secure password (min 8 characters).");

  const [repeatPasswordInvalid, setRepeatPasswordInvalid] = useState(true);
  const [repeatPasswordFeedback, setRepeatPasswordFeedback] = useState("Passwords must match.");

  // Ref per il campo Repeat Password
  const repeatPwRef = useRef<HTMLInputElement>(null);

  // --- Effettua validazione token all'avvio ---
  useEffect(() => {
    const token = searchParams.get("t");
    if (!token) {
      // nessun token → salto validazione e mostro subito form
      setInviteValidated(true);
      return;
    }

    setInviteLoading(true);
    validateRInvitation({ token })
      .then(({ response, data }) => {
        if (response.success && data) {
          // popola i campi con i dati dell’invito
          setSignupFName(data.metadata.first_name || "");
          setSignupLName(data.metadata.last_name || "");
          setSignupEmail(data.metadata.email || data.sendToEmail || "");
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
  }, [searchParams]);

  // Handler per il Change del First Name
  const handleFNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.validity.valid) {
      setFNameInvalid(false);
      setFNameFeedback("Looks good!");
    } else {
      setFNameInvalid(true);
      setFNameFeedback("First name is required.");
    }
  };

  // Handler per il Change del Last Name
  const handleLNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.validity.valid) {
      setLNameInvalid(false);
      setLNameFeedback("Looks good!");
    } else {
      setLNameInvalid(true);
      setLNameFeedback("Last name is required.");
    }
  };

  // Handler per il Change dell'Email
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(e.target.value)) {
      e.target.setCustomValidity("Invalid email");
      setEmailInvalid(true);
      setEmailFeedback("Please enter a valid email address (e.g., user@example.com)");
    } else {
      e.target.setCustomValidity("");
      setEmailInvalid(false);
      setEmailFeedback("Looks good!");
    }
  };

  // Handler per il Change della Password
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.validity.valid) {
      setPasswordInvalid(false);
      setPasswordFeedback("Looks good!");
    } else {
      setPasswordInvalid(true);
      setPasswordFeedback("Please choose a secure password (min 8 characters).");
    }
  };

  // Utilizziamo useEffect per sincronizzare la validazione della Repeat Password
  useEffect(() => {
    if (signupRePw === "") {
      setRepeatPasswordInvalid(true);
      setRepeatPasswordFeedback("Passwords must match.");
      if (repeatPwRef.current) {
        repeatPwRef.current.setCustomValidity("Passwords do not match");
      }
    } else if (signupRePw.length < 8) {
      setRepeatPasswordInvalid(true);
      setRepeatPasswordFeedback("Repeat password must be at least 8 characters.");
      if (repeatPwRef.current) {
        repeatPwRef.current.setCustomValidity("Repeat password must be at least 8 characters.");
      }
    } else if (signupRePw === signupPw) {
      setRepeatPasswordInvalid(false);
      setRepeatPasswordFeedback("Looks good!");
      if (repeatPwRef.current) {
        repeatPwRef.current.setCustomValidity("");
      }
    } else {
      setRepeatPasswordInvalid(true);
      setRepeatPasswordFeedback("Passwords must match.");
      if (repeatPwRef.current) {
        repeatPwRef.current.setCustomValidity("Passwords do not match");
      }
    }
  }, [signupPw, signupRePw]);

  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidated(true);
    setSignUpError("");
    const form = e.currentTarget;

    // Controllo finale della Repeat Password
    if (signupPw !== signupRePw && repeatPwRef.current) {
      repeatPwRef.current.setCustomValidity("Passwords do not match");
      setRepeatPasswordInvalid(true);
      setRepeatPasswordFeedback("Passwords must match.");
    } else if (repeatPwRef.current) {
      repeatPwRef.current.setCustomValidity("");
    }

    // Se il form non è valido, interrompi l'invio
    if (!form.checkValidity()) {
      return;
    }

    setIsSubscribing(true);
    try {
      // Inserisci qui la chiamata API per la registrazione
      // Esempio: navigate("/login", { replace: true });
    } catch (err) {
      setSignUpError("An error occurred during signup");
    }
    setIsSubscribing(false);
  };

  if (inviteLoading) {
    return (
      <MDBContainer className="d-flex justify-content-center align-items-center vh-100">
        <MDBSpinner role="status">
          <span className="visually-hidden">Loading...</span>
        </MDBSpinner>
      </MDBContainer>
    );
  }

  return (
    <MDBContainer fluid className="pt-4">
      <MDBRow className="d-flex justify-content-center align-items-center h-100">
        <MDBCol md="6" className="text-center text-md-start d-flex flex-column justify-content-center">
          <MDBCard md="7" lg="5" xl="5" className="p-4">
            <div className="text-center mb-3">
              <img src={logoImg} style={{ width: 120 }} alt="logo" />
              <h4 className="my-3">Sign up</h4>
            </div>

            <MDBValidation
              noValidate
              isValidated={validated}
              onSubmit={handleSignupSubmit}
              className="row g-3 mb-3"
            >
              <MDBValidationItem
                className="col-md-6"
                feedback={fNameFeedback}
                invalid={fNameInvalid}
              >
                <MDBInput
                  value={signupFName}
                  name="first_name"
                  onChange={(e) => {
                    setSignupFName(e.target.value);
                    handleFNameChange(e);
                  }}
                  id="signup-inputFName"
                  required
                  label="First name"
                  size="lg"
                  pattern=".{4,}"
                  title="At least 4 characters required"
                />
              </MDBValidationItem>

              <MDBValidationItem
                className="col-md-6"
                feedback={lNameFeedback}
                invalid={lNameInvalid}
              >
                <MDBInput
                  value={signupLName}
                  name="last_name"
                  onChange={(e) => {
                    setSignupLName(e.target.value);
                    handleLNameChange(e);
                  }}
                  id="signup-inputLName"
                  required
                  label="Last name"
                  size="lg"
                  pattern=".{4,}"
                  title="At least 4 characters required"
                />
              </MDBValidationItem>

              <MDBValidationItem
                className="col-md-12"
                feedback={emailFeedback}
                invalid={emailInvalid}
              >
                <MDBInput
                  type="email"
                  value={signupEmail}
                  name="email"
                  onChange={(e) => {
                    setSignupEmail(e.target.value);
                    handleEmailChange(e);
                  }}
                  id="signup-inputEmail"
                  required
                  label="Email address"
                  size="lg"
                  pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                  title="Please enter a valid email address (e.g., user@example.com)"
                />
              </MDBValidationItem>

              <MDBValidationItem
                className="col-md-12"
                feedback={passwordFeedback}
                invalid={passwordInvalid}
              >
                <MDBInput
                  value={signupPw}
                  name="password"
                  type="password"
                  onChange={(e) => {
                    setSignupPw(e.target.value);
                    handlePasswordChange(e);
                  }}  
                  id="signup-inputPw"
                  required
                  label="Password"
                  size="lg"
                  pattern=".{8,}"
                  title="Min 8 characters, must include uppercase, lowercase, number and special character."
                />
              </MDBValidationItem>

              <MDBValidationItem
                className="col-md-12 mb-3"
                feedback={repeatPasswordFeedback}
                invalid={repeatPasswordInvalid}
              >
                <MDBInput
                  value={signupRePw}
                  name="re_password"
                  type="password"
                  onChange={(e) => {
                    setSignupRePw(e.target.value);
                    // La validazione per questo campo avviene tramite useEffect
                  }}
                  id="signup-inputRePw"
                  required
                  label="Repeat Password"
                  size="lg"
                  ref={repeatPwRef}
                />
              </MDBValidationItem>

              {signUpError && (
                <div className="text-danger mb-3">
                  {signUpError}
                </div>
              )}

              <div className="col-md-12 mt-2">
                <MDBBtn type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubscribing}>
                  {isSubscribing ? "Subscribing ..." : "Sign up"}
                </MDBBtn>
              </div>
            </MDBValidation>

            <div className="divider d-flex justify-content-center align-items-center my-2">
              <p className="text-center fw-bold mx-3 mb-0 text-muted">OR</p>
            </div>

            <MDBBtn className="btn btn-primary btn-lg btn-block mb-2" color="secondary">
              <i className="fab fa-google me-2"></i>
              Sign up with Google
            </MDBBtn>

            <hr className="my-4" />

            <p className="text-center">
              Already have an account?{" "}
              <a
                onClick={() => navigate("/login", { replace: true })}
                className="link-info"
                style={{ cursor: "pointer" }}
              >
                Login here
              </a>
            </p>
          </MDBCard>
        </MDBCol>
      </MDBRow>
    </MDBContainer>
  );
};

export default SignUp_OLD;
