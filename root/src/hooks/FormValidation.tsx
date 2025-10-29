// FormValidationForm.tsx
import { useState, useEffect, useRef } from "react";

export interface FormValidation {
  email_utility: {
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
  rePassword: {
    repeatPassword: string;
    setRepeatPassword: React.Dispatch<React.SetStateAction<string>>;
    repeatPasswordInvalid: boolean;
    repeatPasswordFeedback: string;
    repeatPwRef: React.RefObject<HTMLInputElement | null>;
  };
  formType: "signup";
}

const useFormValidation = (): FormValidation => {
  // Stato e handler per la validazione dell'email
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
      setEmailFeedback("Please enter a valid email address (e.g., user@example.com)");
    } else {
      e.target.setCustomValidity("");
      setEmailInvalid(false);
      setEmailFeedback("Looks good!");
    }
  };

  // Stato e handler per la validazione della password
  const [password, setPassword] = useState<string>("");
  const [passwordInvalid, setPasswordInvalid] = useState<boolean>(true);
  const [passwordFeedback, setPasswordFeedback] = useState<string>(
    "Please choose a secure password (min 8 characters)."
  );

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (value.length < 8) {
      setPasswordInvalid(true);
      setPasswordFeedback("Please choose a secure password (min 8 characters).");
    } else {
      setPasswordInvalid(false);
      setPasswordFeedback("Looks good!");
    }
  };

  // Stato e validazione per la conferma della password (rePassword)
  const [repeatPassword, setRepeatPassword] = useState<string>("");
  const [repeatPasswordInvalid, setRepeatPasswordInvalid] = useState<boolean>(true);
  const [repeatPasswordFeedback, setRepeatPasswordFeedback] = useState<string>("Passwords must match.");
  const repeatPwRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (repeatPassword === "") {
      setRepeatPasswordInvalid(true);
      setRepeatPasswordFeedback("Passwords must match.");
      if (repeatPwRef.current) {
        repeatPwRef.current.setCustomValidity("Passwords do not match");
      }
    } else if (repeatPassword.length < 8) {
      setRepeatPasswordInvalid(true);
      setRepeatPasswordFeedback("Repeat password must be at least 8 characters.");
      if (repeatPwRef.current) {
        repeatPwRef.current.setCustomValidity("Repeat password must be at least 8 characters.");
      }
    } else if (repeatPassword === password) {
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
  }, [password, repeatPassword]);

  return {
    email_utility: {
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
    rePassword: {
      repeatPassword,
      setRepeatPassword,
      repeatPasswordInvalid,
      repeatPasswordFeedback,
      repeatPwRef,
    },
    formType: "signup",
  };
};

export default useFormValidation;
