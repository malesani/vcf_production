import { ReactNode } from "react";
import { MDBTypography, MDBIcon } from "mdb-react-ui-kit";

type InfoBlockCommon = {
  blockMode?: "alert" | "note";
  icon?: string;
  badgeIcon?: boolean;
  title?: string;
  message?: string;
  className?: string;
  children?: ReactNode;
};

type InfoBlockControlled = {
  color:
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "light"
  | "dark";
};

type InfoBlockPreset = {
  presetMode: "info" | "suggestion";
};

export type InfoBlockProps = InfoBlockCommon &
  (InfoBlockControlled | InfoBlockPreset);

// Componente unico, normale o preset
export function General_InfoBlock(props: InfoBlockProps) {
  const {
    // blockMode
    blockMode = "alert",

    // campi comuni
    icon: controlledIcon,
    badgeIcon = false,
    title,
    message,
    className,
    children,

    // preset
    presetMode,

    // controllo manuale
    color: controlledColor,
  } = props as InfoBlockCommon & Partial<InfoBlockControlled> & Partial<InfoBlockPreset>;

  // Risolvo colore in base al presetMode o al colore controllato
  const color: InfoBlockControlled["color"] =
    presetMode === "suggestion"
      ? "light"
      : presetMode === "info"
        ? "info"
        : // cast perché TS non capisce statica
        (controlledColor as InfoBlockControlled["color"]);

  const icon = controlledIcon ?? (presetMode === "suggestion" ? "paperclip" : "info");

  switch (blockMode) {
    case "alert":
      const iconElem =
        <MDBIcon
          fas
          icon={icon}
          size={badgeIcon ? "xl" : "lg"}
        />;

      return (
        <MDBTypography note noteColor={color} className={`${(className ?? "m-0")}`}>
          <div className={`d-flex align-items-start ${(badgeIcon ? "gap-4" : "gap-3")}`}>
            {(icon && badgeIcon) ? (
              <div className="badge badge-secondary p-3 rounded-4">{iconElem}</div>
            ) : (
              <div>{icon && iconElem}</div>
            )}
            <div>
              {title && <h5 className="mb-1">{title}</h5>}
              {message && <p className="text-muted mb-0">{message}</p>}
              {children}
            </div>
          </div>
        </MDBTypography>
      );
      break;

    case "note":
      return (
        <MDBTypography note noteColor={color} className={`${(className ?? "m-0")}`}>
          <div className="d-flex flex-nowrap gap-2">
            {icon && <div className={`${icon === "info" ? 'mx-1' : ''}`} >
              <MDBIcon icon={icon}
              />
            </div>}
            <div>
              {title && <strong>{`${title}: `}</strong>}{message}
              {children}
            </div>
          </div>
        </MDBTypography>
      );
      break;
  }
}
