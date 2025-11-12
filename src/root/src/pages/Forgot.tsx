import { useState } from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBInput,
  MDBBtn
} from "mdb-react-ui-kit";

import { forgotPasswordFunction, ForgotPasswordResponse } from "../auth_module/loginFunctions";
import { useLogos } from '../hooks/AssetsManager';

const ForgotPasswordForm = () => {
  const {logo_default} = useLogos();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const response: ForgotPasswordResponse = await forgotPasswordFunction(email);
      if (response.success) {
        setSuccess("Password reset instructions have been sent to your email.");
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError("An error occurred while attempting to reset your password.");
    }
    setIsSubmitting(false);
  };

  return (
    <section className="vh-100">
      <MDBContainer fluid className="py-5">
        <MDBRow className="d-flex align-items-center justify-content-center gap-5">
          <MDBCol md="8" lg="7" xl="6">
            <img
              src="https://mdbcdn.b-cdn.net/img/Photos/new-templates/bootstrap-login-form/draw2.svg"
              className="img-fluid"
              alt="Forgot password illustration"
            />
          </MDBCol>
          <MDBCol md="7" lg="5" xl="5">
            <div className="text-center mb-3">
              <img src={logo_default} style={{ width: 120 }} alt="logo" />
              <h4 className="mt-1 mt-3 pb-1">Forgot your password?</h4>
              <p className="mb-4">
                Enter your email address and we'll send you instructions to reset your password.
              </p>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleForgotSubmit}>
              <MDBInput
                wrapperClass="form-outline mb-4"
                label="Email address"
                id="formForgotEmail"
                type="email"
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <MDBBtn type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Reset Password"}
              </MDBBtn>
            </form>

            <div className="mt-3 text-center">
              <a href="/login">Back to Login</a>
            </div>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </section>
  );
};

export default ForgotPasswordForm;