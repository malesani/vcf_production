import React, { forwardRef, useState, useEffect, useRef, CSSProperties } from "react";
import { SelectData } from "../GeneralForm_Common";
import {
  MDBRow,
  MDBCol,
  MDBBadge,
  MDBCard,
  MDBCardHeader,
  MDBCardBody,
  MDBBtn,
  MDBIcon
} from "mdb-react-ui-kit";

export interface CustomSelectProps {
  multiple?: boolean;
  hideLabel?: boolean;
  labelInvalid?: string;
  showSummaryPills?: boolean;
  hideChoseSomething?: boolean;
  labelChoseSomething?: string;
  gridConfig?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  cardProps?: {
    size: "sm" | "md" | "lg" | "xl";
    clearBtn: boolean;
  };
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  label: string;
  labelClass: string;
  options: SelectData[];
  value: string | number | Array<string | number>;
  isValid: boolean;
  onChange: (values: (string | number) | Array<string | number>) => void;
  style?: CSSProperties;
}

export const Selectbox_Cards = forwardRef<HTMLDivElement, CustomSelectProps>(
  (
    {
      disabled,
      readOnly,
      label,
      labelClass,
      options,
      value,
      isValid,
      onChange,
      style,
      // Custom Props
      multiple,
      hideLabel = true,
      labelInvalid = "Seleziona almeno un elemento",
      showSummaryPills = true,
      hideChoseSomething = false,
      labelChoseSomething = 'Seleziona un elemento ...',
      gridConfig = { md: 2 },
      cardProps = {
        size: "md",
        clearBtn: false,
      },
    },
    ref
  ) => {
    const sizeStyles = {
      sm: {
        badge: "fs-6",
        cardTitle: "fs-6 fw-bold",
        cardPadding: "p-1",
      },
      md: {
        badge: "fs-5",
        cardTitle: "fs-6 fw-bold",
        cardPadding: "p-2",
      },
      lg: {
        badge: "fs-4",
        cardTitle: "fs-4 fw-bold",
        cardPadding: "p-3",
      },
      xl: {
        badge: "fs-3",
        cardTitle: "fs-3 fw-bold",
        cardPadding: "p-4",
      },
    } as const;
    const size = cardProps.size ?? "md";
    const styles = sizeStyles[size];

    const colProps = Object.entries(gridConfig).reduce((acc, [bp, cols]) => {
      if (!cols) return acc;
      const width = Math.floor(12 / cols);
      // es: acc.md = 4, acc.lg = 3, ...
      return { ...acc, [bp]: width };
    }, {} as Record<string, number>);

    const isMulti = Boolean(multiple);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const [formValidated, setFormValidated] = useState(false);

    useEffect(() => {     // Attacchiamo un MutationObserver al form per intercettare subito i cambi di classe
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const form = wrapper.closest("form");

      if (!form) return;

      // Imposta valore iniziale
      setFormValidated(form.classList.contains("was-validated"));

      const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.attributeName === "class") {
            setFormValidated(form.classList.contains("was-validated"));
          }
        }
      });

      observer.observe(form, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => {
        observer.disconnect();
      };
    }, []);

    const getLabel = (opt: SelectData) => {
      const badgeContent = opt.text ?? String(opt.value);
      const showClearBtn = isMulti || cardProps.clearBtn;

      return (
        <p key={opt.value} className={`m-0 ${styles.badge}`}>
          <MDBBadge
            pill
            light
            key={opt.value}
            className="d-flex flex-row flex-nowrap align-items-center justify-content-between p-1 ps-3"
          >
            {!isMulti && <span></span>}
            <span className="my-1">{badgeContent}</span>
            <span>
              {showClearBtn && (
                <MDBBtn
                  type="button"
                  floating
                  color="link"
                  size="sm"
                  className="ms-2"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => toggleValue(opt), 0);
                  }}
                >
                  <MDBIcon fas icon="times" size="lg" />
                </MDBBtn>
              )}
            </span>
          </MDBBadge>
        </p>
      );
    };

    // Cosa mostrare nell’header del select
    const displaySelected = (): React.ReactNode => {
      if (isMulti) {
        const arr = Array.isArray(value) ? value : [];
        if (!arr.length) {
          if (formValidated && !isValid) {    // validato e non valido → messaggio d’errore
            return <div className=""><span className="text-danger">{labelInvalid}</span></div>;
          }

          if (hideChoseSomething) {     // se hideChoseSomething è true, non mostro nulla
            return null;
          }

          return <span className="text-muted">{labelChoseSomething}</span>;   // altrimenti placeholder muted
        }

        if (showSummaryPills) {
          // restituire array di badge
          return (
            <div className="d-flex flex-wrap gap-1">
              {arr.map(v => {
                const opt = options.find(o => o.value === v);
                return opt ? getLabel(opt) : null;
              })}
            </div>
          );
        }


      } else {
        const opt = options.find(o => o.value === value);
        if (opt) {
          if (showSummaryPills) {
            return getLabel(opt);
          }
        }

        // singolo select senza valore
        if (formValidated && !isValid) {
          return <span className="text-danger">{labelInvalid}</span>;
        }
        if (hideChoseSomething) {
          return null;
        }

        return <span className="text-muted">{labelChoseSomething}</span>;
      }
    };

    // clic su un’opzione (valori o card)
    const toggleValue = (opt: SelectData) => {
      if (disabled || readOnly) return;

      if (isMulti) {
        const arr = Array.isArray(value) ? [...value] : [];
        if (arr.includes(opt.value)) {
          onChange(arr.filter(v => v !== opt.value));
        } else {
          onChange([...arr, opt.value]);
        }
      } else {
        const current = value === opt.value;
        onChange(current ? '' : opt.value);
      }
    };

    return (
      <div className="custom-select-wrapper" ref={wrapperRef} >
        {hideLabel || (
          <label className={'mb-3 ' + labelClass}>
            {label}
          </label>
        )}

        <MDBRow className="g-3">
          {options.map(opt => {
            if (opt.hidden) return null;
            const isSelected = isMulti
              ? Array.isArray(value) && value.includes(opt.value)
              : value === opt.value;

            const onSelect = () => toggleValue(opt);

            const fallBackCard = (opt: SelectData) => {
              return <MDBCard
                border={isSelected ? 'primary' : 'light'}
                className={`flex-fill`}
                style={isSelected ? { backgroundColor: '#dfe7f6' } : undefined}
                onClick={onSelect}
              >
                {opt.secondaryText ? (<>
                  <MDBCardHeader
                    className="d-flex justify-content-between align-items-center"
                    role="button"
                  >
                    <div className="d-flex flex-row align-items-center">
                      <p className={`mb-0 ${styles.cardTitle}`}>{opt.text}</p>
                    </div>
                    <MDBIcon icon={opt.icon} ></MDBIcon>
                  </MDBCardHeader>
                  <MDBCardBody className="py-2">
                    <p className="mb-0 text-muted">
                      {opt.secondaryText}
                    </p>
                  </MDBCardBody>
                </>) : (<>
                  <MDBCardBody
                    className={`d-flex justify-content-between align-items-center ${styles.cardPadding}`}
                    role="button"
                  >
                    <div className="d-flex flex-row align-items-center">
                      <MDBIcon icon={opt.icon} className="me-2"></MDBIcon>
                      <p className={`mb-0 fw-bold ${styles.cardTitle}`}>{opt.text}</p>
                    </div>
                  </MDBCardBody>
                </>)}
              </MDBCard>
            };

            return (
              <MDBCol key={opt.value} {...colProps} className="d-flex">
                <div
                  className={`
                    flex-fill       /* riempie orizzontalmente e verticalmente */
                    h-100           /* fallback per assicurarsi 100% height */
                    d-flex
                    flex-column
                    justify-content-center
                    card-option 
                    hover-shadow
                    rounded rounded-4
                    ${isSelected ? "selected" : ""} 
                    ${opt.disabled ? "disabled" : ""}
                  `}
                >
                  {/* Rendiamo l’elemento custom */}
                  {opt.renderCard
                    ? opt.renderCard({ isSelected, onSelect })
                    : fallBackCard(opt) /* null as fallback */}
                </div>
              </MDBCol>
            );
          })}
        </MDBRow>

        <div
          className={`mt-3 custom-select-display${disabled ? " disabled" : ""}`}
          ref={ref}
        >
          {displaySelected()}
        </div>
      </div >
    );
  }
);

Selectbox_Cards.displayName = "Selectbox_Cards";
