import { useState } from "react";

export interface LoginFormValidation {
  email: {
    value: string;
    setEmail: React.Dispatch<React.SetStateAction<string>>;
    emailInvalid: boolean;
    emailFeedback: string;
    handleEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
  password: {
    value: string;
    setPassword: React.Dispatch<React.SetStateAction<string>>;
    passwordInvalid: boolean;
    passwordFeedback: string;
    handlePasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  };
}

const useLoginFormValidation = (formType: "login"): LoginFormValidation => {
  // State and validation for - Email
  const [email, setEmail] = useState<string>("");
  const [emailInvalid, setEmailInvalid] = useState<boolean>(true);
  const [emailFeedback, setEmailFeedback] = useState<string>("A valid email is required.");

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(value)) {
      e.target.setCustomValidity("Invalid email");
      setEmailInvalid(true);
      setEmailFeedback("Please enter a valid email address.");
    } else {
      e.target.setCustomValidity("");
      setEmailInvalid(false);
      setEmailFeedback("Valid email.");
    }
  };

  // State and validation for - Password (Between 8-20 chars)
  const [password, setPassword] = useState<string>("");
  const [passwordInvalid, setPasswordInvalid] = useState<boolean>(true);
  const [passwordFeedback, setPasswordFeedback] = useState<string>("Password must be between 8 and 20 chars.");

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value.length < 8 || value.length > 20) {
      e.target.setCustomValidity("Password must be between 8 and 20 chars.");
      setPasswordInvalid(true);
      setPasswordFeedback("Password must be between 8 and 20 chars.");
    } else {
      e.target.setCustomValidity("");
      setPasswordInvalid(false);
      setPasswordFeedback("Valid Password");
    }
  };

  return {
    email: {
      value: email,
      setEmail,
      emailInvalid,
      emailFeedback,
      handleEmailChange,
    },
    password: {
      value: password,
      setPassword,
      passwordInvalid,
      passwordFeedback,
      handlePasswordChange,
    },
  };
};

export default useLoginFormValidation;