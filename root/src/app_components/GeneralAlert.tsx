import { useState } from "react";
import { MDBAlert, MDBIcon, MDBSpinner } from "mdb-react-ui-kit";
import type { Variants } from "framer-motion"; // dependency of mdb-react-ui-kit

export type AlertPosition = undefined | "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"

export type AlertInfo = {
  visible: boolean;
  message: string;
  color: "success" | "danger" | "warning" | "light" | "info";
  position: AlertPosition
};


/** Hook per gestire lo stato e il rendering dell’alert */
export function useFormAlert() {
  const [alert, setAlert] = useState<AlertInfo>({
    visible: false,
    message: "",
    color: "success",
    position: undefined,
  });

  const showAlertSuccess = (message: string, position?: AlertPosition) =>
    setAlert({
      visible: true, message, color: "success",
      position: position ?? undefined
    });

  const showAlertError = (message: string, position?: AlertPosition) =>
    setAlert({
      visible: true, message, color: "danger",
      position: position ?? undefined
    });

  const showAlertWarning = (message: string, position?: AlertPosition) =>
    setAlert({
      visible: true, message, color: "warning",
      position: position ?? undefined
    });

  const showAlertLoading = (message: string, position?: AlertPosition) =>
    setAlert({
      visible: true, message, color: "light",
      position: position ?? undefined
    });

  const showAlertInfo = (message: string, position?: AlertPosition) =>
    setAlert({
      visible: true, message, color: "info",
      position: position ?? undefined
    });

  const hideAlert = () =>
    setAlert({
      visible: false, message: "", color: "success",
      position: undefined
    });

  // Framer-motion variants (usati internamente da MDBAlert)
  const variants: Variants = {
    open: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
    closed: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3, ease: "easeIn" },
    },
  };

  const icons: Record<AlertInfo["color"], string> = {
    success: "fas fa-check-circle",
    danger: "fas fa-times-circle",
    warning: "fas fa-exclamation-triangle",
    light: "spinner",
    info: "info-circle"
  };

  /** Componente che renderizza l’alert corrente */
  function FormAlert() {
    return (
      <MDBAlert
        open={alert.visible}
        color={alert.color}
        autohide={alert.color === "success"}
        delay={5000}
        dismissBtn
        onClose={hideAlert}
        animationVariants={variants}
        position={alert.position}
        appendToBody={alert.position != undefined}
        className="mb-3"
      >
        {icons[alert.color] && (
          icons[alert.color] == "spinner" ?
            <MDBSpinner role='status' className='me-2' size='sm'>
              <span className='visually-hidden'>Loading...</span>
            </MDBSpinner> :
            <MDBIcon fas icon={icons[alert.color]} className="me-2" />
        )}
        {alert.message}
      </MDBAlert>
    );
  }

  return { alert, showAlertInfo, showAlertLoading, showAlertSuccess, showAlertError, showAlertWarning, hideAlert, FormAlert };
}