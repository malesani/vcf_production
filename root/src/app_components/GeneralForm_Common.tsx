import React from "react";
import { ReactNode } from 'react';

import { DataResponse, requestResponse } from '../hooks/RequestFunction';
import { MDBSelect, MDBBtn } from "mdb-react-ui-kit";

import { AlertPosition } from './GeneralAlert';

// ----- Tipi comuni -----
export type SelectData = {
    disabled?: boolean;
    hidden?: boolean;
    text?: string;
    defaultSelected?: boolean;
    secondaryText?: React.ReactNode;
    renderCard?: (opts: { isSelected: boolean, onSelect: () => void }) => React.ReactNode;
    value: string | number;
    description?: string;
    adv_growthPercentFrom?: number,
    adv_growthPercentTo?: number,
    adv_timeRangeFrom?: number,
    adv_timeRangeTo?: number,
    icon?: string;
    active?: boolean;
    optgroup?: string;
};

// Wrapper semplificato per MDBSelect
// Include solo i props necessari
type SimpleSelectProps = {
    label?: string;
    data: SelectData[];
    getValue?: boolean;
    onChange: (values: any) => void;
    disabled?: boolean;
    style?: React.CSSProperties;
    [key: string]: any;
};
export const MDBSimpleSelect = MDBSelect as unknown as React.FC<SimpleSelectProps>;

export type Mode = "create" | "update" | "upsert";

export type InputType =
    | "repeater"        // subFormField Inpput che imposta un sotto form con repeater
    | "text"
    | "email"
    | "tel"
    | "number"
    | "password"
    | "input"
    | "text_area"
    | "date"
    | "datetime"
    | "checkbox"
    | "selectbox"
    | "file_input"
    | "file_upload"
    | "richtext";

export type BoolOp =
    | "FALSE"               // sempre 0
    | "NOR"                 // ¬(A ∨ B)
    | "NOT_A_AND_B"         // ¬A ∧ B
    | "NOT_A"               // ¬A
    | "A_AND_NOT_B"         // A ∧ ¬B
    | "XOR"                 // A ⊕ B
    | "B"                   // proiezione su B
    | "OR"                  // A ∨ B
    | "AND"                 // A ∧ B
    | "XNOR"                // ¬(A ⊕ B)
    | "A"                   // proiezione su A
    | "NAND"                // ¬(A ∧ B)
    | "NOT_B"               // ¬B
    | "REVERSE_IMPLIES"     // B → A  (¬B ∨ A)
    | "IMPLIES"             // A → B  (¬A ∨ B)
    | "TRUE"                // sempre 1

export function applyBooleanOperator(a: boolean, b: boolean, boolOp: BoolOp | undefined): boolean {
    switch (boolOp) {
        case 'FALSE': return false;
        case 'TRUE': return true;

        case 'A': return a;
        case 'B': return b;
        case 'NOT_A': return !a;
        case 'NOT_B': return !b;

        case 'AND': return a && b;
        case 'OR': return a || b;
        case 'XOR': return a !== b;
        case 'NAND': return !(a && b);
        case 'NOR': return !(a || b);
        case 'XNOR': return a === b;

        case 'IMPLIES': return !a || b;    // A → B
        case 'REVERSE_IMPLIES': return !b || a;    // B → A

        case 'NOT_A_AND_B': return !a && b;
        case 'A_AND_NOT_B': return a && !b;

        default:
            return a && b;
    }
}
function mergeFeedback(
    a: validationFeedbackInfoRelaxed,
    b: validationFeedbackInfoRelaxed,
    op: BoolOp
): validationFeedbackInfoRelaxed {
    const validA = a.isValid, txtA = a.feedbackText;
    const validB = b.isValid, txtB = b.feedbackText;
    const finalValid = applyBooleanOperator(validA, validB, op);

    // se è valido, non mostriamo feedback
    if (finalValid) return { isValid: true, feedbackText: undefined };

    // altrimenti scegliamo il testo giusto
    let finalText: string | undefined;

    switch (op) {
        case "AND":
            // AND fallisce se uno dei due è false
            if (!validA) finalText = txtA;
            else /* !validB */ finalText = txtB ?? txtA;
            break;

        case "OR":
            // OR fallisce solo se entrambi false
            if (!validA && !validB) {
                finalText = [txtA, txtB].filter(Boolean).join("; ");
            } else if (!validA) {
                finalText = txtA;
            } else /* !validB */ {
                finalText = txtB ?? txtA;
            }
            break;

        case "IMPLIES":
            // A→B fallisce solo se A=true e B=false
            finalText = !validB ? (txtB ?? txtA) : (txtA ?? txtB);
            break;

        case "XOR":
            // XOR fallisce se A===B
            if (validA && validB) {
                // entrambi true → magari un messaggio generico?
                finalText = txtA ?? txtB;
            } else /* entrambi false */ {
                finalText = txtA ?? txtB;
            }
            break;

        default:
            // fallback: se custom non c'è, prendo base
            finalText = txtB ?? txtA;
    }

    return { isValid: false, feedbackText: finalText };
}


type ExtraElement<T> = {
    position: "before" | "after";
    element?: ReactNode | ((formData: T) => ReactNode);
    grid?: { size?: number; sm?: number; md?: number; lg?: number };
    class_name?: string;
    visible?: (formData: T) => boolean;    // funzione che parametrizza il render, true/undefined => not rendered
}

type CustomKeyMap = {
    selectbox: "simple" | "custom" | "cards" | "dual_switch";
    // per gli altri tipi non ci sono chiavi custom
    text: never;
    number: never;
    text_area: never;
    checkbox: never;
    date: never;
    file_input: never;
    file_upload: never;
    richtext: never;
    email: never;
    password: never;
};

interface BaseFieldConfig<T, K extends InputType> {
    name: keyof T;
    label: string;
    labelClass?: string;
    type?: K;
    equalTo?: keyof T;    // nome del campo con cui fare l’uguaglianza */
    required?: boolean;
    readOnly?: (formData: T) => boolean;
    validationFeedback?: {
        invalid?: string;
        valid?: string;
    };
    grid?: { size?: number; sm?: number; md?: number; lg?: number, xl?: number, xxl?: number };
    class_name?: string;
    hrBefore?: boolean;
    hrAfter?: boolean;
    extraElements?: ExtraElement<T>[];

    visible?: (formData: T) => boolean;    // funzione che parametrizza il render, true/undefined => not rendered

    validation?: (field: FieldConfig<T>, value: any, formData: T, fields?: FieldConfig<T>[]) => validationFeedbackInfoRelaxed;    // Custom validation function.
    validationBoolOp?: BoolOp;      // [Default B] | A = standard isValid / B = custom isValid => BoolOp describe boolean logic to compute validation.
}

export type RepeaterFieldConfig<T, U> =
    BaseFieldConfig<T, "repeater"> & {
        subFields: FieldConfig<U>[];
        properties?: {
            minItems?: number;
            maxItems?: number;
            defaultItem?: () => U;
        };
    };

// Dependet Select
export type SelectBoxConfigDependent<T> = BaseFieldConfig<T, "selectbox"> & {  // Dependet Select
    dependencies: Array<keyof T>;                  // select dipendente: ricalcola options quando uno di questi cambia
    getOptions: (formData: T) => SelectData[];     // data= formData corrente → restituisci le nuove options
    options?: never;

    properties?: Record<string, any>;
    customElementKey?: CustomKeyMap["selectbox"];
}
// Autonomous
export type SelectBoxConfigAutonomous<T> = BaseFieldConfig<T, "selectbox"> & {  // Dependet Select
    dependencies?: never;
    getOptions?: never;
    options: SelectData[];

    properties?: Record<string, any>;
    customElementKey?: CustomKeyMap["selectbox"];
}

type SelectBoxConfig<T> = (SelectBoxConfigAutonomous<T> | SelectBoxConfigDependent<T>);

type NumberConfig<T> = BaseFieldConfig<T, "number"> & {
    properties?: {
        defaultValue?: number;
        minValue?: number;
        maxValue?: number;
        stepValue?: number;
    };
    customElementKey?: CustomKeyMap["number"];
};

export type FieldConfig<T> = (BaseFieldConfig<T, Exclude<InputType, "repeater" | "selectbox" | "number">> & { properties?: Record<string, any>; })
    | NumberConfig<T>
    | SelectBoxConfig<T>
    | RepeaterFieldConfig<T, any>;


export interface validationFeedbackInfo {
    isValid: boolean;
    feedbackText: string;
}

export type validationFeedbackInfoRelaxed =
    Omit<validationFeedbackInfo, "feedbackText"> & {
        feedbackText?: validationFeedbackInfo["feedbackText"];
    };

// Props del componente generic form
export interface FormProps<T, P> {
    fields: FieldConfig<T>[];
    params?: P;
    onSuccess?: (data: T) => void;
    onChange?: (data: T) => void;
    onNewMessage?: (response: requestResponse) => void;
    onNotValidated?: () => void;
    onChangeGetDataState?: (loadingStatus: boolean) => void;

    disableSubmit?: boolean;
    registerSubmit?: (submit: () => Promise<boolean>) => void;
}

export interface FormAction<T> {
    icon?: string;
    label?: React.ReactNode;
    buttonProps?: Omit<React.ComponentProps<typeof MDBBtn>, 'onClick'>;
    onClick: (formData: T) => void;
    visible?: (formData: T) => boolean;    // funzione che parametrizza il render, true/undefined => not rendered
}

// Layout Props
export interface LayoutProps {
    className?: string;
    icon?: string;
    title?: string;
    hideHeader?: boolean;
    showHeaderDivider?: boolean;
    createBtnProps?: {
        icon?: string;
        label?: string;
        labelSaving?: string;
        btnPosition?: "top" | "bottom";
        iconPosition?: "left" | "right";
        className?: string;
    } & Omit<React.ComponentProps<typeof MDBBtn>, 'onClick'>;
    updateBtnProps?: {
        icon?: string;
        label?: string;
        labelSaving?: string;
        btnPosition?: "top" | "bottom";
        iconPosition?: "left" | "right";
        className?: string;
    } & Omit<React.ComponentProps<typeof MDBBtn>, 'onClick'>;
}

export interface FormAlertProps {
    alertProps?: {
        show?: {
            success?: boolean;
            error?: boolean;
            warning?: boolean;
            loading?: boolean;
        };
        position?: {
            success?: AlertPosition;
            error?: AlertPosition;
            warning?: AlertPosition;
            loading?: AlertPosition;
        }
    }
}

export type FormCommonProps<T, P> = LayoutProps & FormAlertProps & { formActions?: FormAction<T>[] } & FormProps<T, P>;

// Get data Props
export interface FetchProps<T, P> {
    getData: (args: P) => Promise<DataResponse<T>>;
    onLoad?: (data: T) => void;
    response?: never;
    data?: never;
}

export interface InitialProps<T> {
    response?: requestResponse;
    data: T;
    getData?: never;
    onLoad?: never;
}
// end

// Update Flow
export type UpdateFlow<T, P> = (FetchProps<T, P> | InitialProps<T>) & {
    mode: "update";
    updateData: (payload: T & P) => Promise<DataResponse<T>>;
};

// Create Flow
export interface CreateFlow<T, P> {
    mode: "create";
    createData: (payload: T & P) => Promise<DataResponse<T>>;
}

// Upsert Flow
export type UpsertFlow<T, P> = (FetchProps<T, P> | InitialProps<T>) & {
    mode: "upsert";
    updateData: (payload: T & P) => Promise<DataResponse<T>>;
    createData: (payload: T & P) => Promise<DataResponse<T>>;
}

type BtnColor = React.ComponentProps<typeof MDBBtn>["color"];
export interface LayoutInfo {
    className?: string;
    icon?: string;
    title?: string;
    hideHeader: boolean;
    atTop: boolean;
    showHeaderDivider: boolean;
    submitBtn: {
        icon?: string;
        label: string;
        labelSaving: string;
        btnPosition: "top" | "bottom";
        iconPosition: "left" | "right";
        className?: string;
        color: BtnColor;
    };
}
// LAYOUT PRESET - Functions
export function presetLayoutInfo(props: LayoutProps & { mode: Mode }): LayoutInfo {
    const {
        className,
        icon,
        title,
        hideHeader = false,
        createBtnProps,
        updateBtnProps,
        showHeaderDivider = false,
        mode
    } = props;

    const submitBtnProps = mode === "create"
        ? createBtnProps
        : updateBtnProps;

    // fallback position
    const defaultPos = mode === "update" ? "top" : "bottom";
    const btnPosition = submitBtnProps?.btnPosition ?? defaultPos;
    const atTop = btnPosition === "top";

    // fallback label & colore
    const defaultLabel =
        mode === "update" ? "Salva modifiche" : "Crea";
    const defaultLabelSaving =
        mode === "update" ? "Salvataggio in corso..." : "Creazione...";

    const defaultColor: BtnColor = mode === "update" ? "primary" : "success";

    return {
        className,
        icon,
        title,
        hideHeader,
        atTop,
        showHeaderDivider,
        submitBtn: {
            icon: submitBtnProps?.icon,
            label: submitBtnProps?.label ?? defaultLabel,
            labelSaving: submitBtnProps?.labelSaving ?? defaultLabelSaving,
            btnPosition,
            iconPosition: submitBtnProps?.iconPosition ?? "left",
            className: submitBtnProps?.className,
            color: submitBtnProps?.color ?? defaultColor
        }
    };
}
// end


// VALIDATION - Functions
export function defaultValidationFeedback<T>(
    f: FieldConfig<T>,
    isValid: boolean,
    customFeedbackText?: string
): validationFeedbackInfo {

    let fieldText = undefined
    let defaultText: string;
    if (isValid) {
        fieldText = f.validationFeedback?.valid ?? undefined;
        switch (f.type) {
            case "email":
                defaultText = `${f.label} è valida.`;
                break;
            default:
                defaultText = `${f.label} è valido.`;
                break;
        }
    } else {
        fieldText = f.validationFeedback?.invalid ?? undefined;
        switch (f.type) {
            case "email":
                defaultText = `${f.label} non è un'email valida.`;
                break;
            case "password":
                defaultText = `Richiesti 8-20 caratteri.`;
                break;
            case "selectbox":
                defaultText = `${f.label} richiede selezione.`;
                break;
            default:
                defaultText = `${f.label} è obbligatorio.`;
                break;
        }
    }

    const showText = f.required || !isValid;
    const textToShow = customFeedbackText ?? (fieldText ?? defaultText);
    const feedbackText = showText ? textToShow : "";

    return { isValid, feedbackText };
}

export function computeValidation<T>(f: FieldConfig<T>, value: any, formData: T): validationFeedbackInfoRelaxed {

    // validazione per campi non visibili
    if (f.visible && !f.visible(formData)) {
        return { isValid: true, feedbackText: undefined };
    }

    // Compute standard validation
    let isValid: boolean;
    let feedbackText = undefined;

    switch (f.type) {
        case "text":
            isValid = f.required ? (value ?? '').trim().length > 0 : true;
            break;

        case "text_area":
            isValid = f.required ? (value ?? '').trim().length > 0 : true;
            break;

        case "richtext":
            isValid = true;
            break;

        case "email":
            if (value == '' || !value) {
                isValid = !f.required;
            } else {
                isValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
            }
            break;

        case "selectbox":
            const multiple = f.properties?.multiple ?? null;

            if (multiple) {
                // validazione multi-select: se required serve almeno un elemento
                isValid = f.required
                    ? Array.isArray(value) && value.length > 0
                    : true;
            } else {
                // validazione single-select come prima
                isValid = f.required
                    ? Boolean(value)
                    : true;
            }
            break;

        case "password": {
            const pwRegex = /^.{8,20}$/;
            if (value == null || value === "") {
                isValid = !f.required;   // se required => false
            } else {
                isValid = pwRegex.test(String(value)); // e qui va bene
            }
            break;
        }

        case "number":
            const minValue = f.properties?.minValue ?? null;
            const maxValue = f.properties?.maxValue ?? null;
            const stepValue = f.properties?.stepValue ?? null;

            if (!value) {
                isValid = !f.required;    // vuoto → valido solo se non required
            } else {
                const num = Number(value);

                isValid = !isNaN(num)
                if (!isValid) {
                    feedbackText = "Valore non numerico";
                }

                if (isValid && (!(minValue === null) && (num < minValue))) {
                    isValid = false;
                    feedbackText = "Minimo " + minValue;
                }

                if (isValid && (!(maxValue === null) && (num > maxValue))) {
                    isValid = false;
                    feedbackText = "Massimo " + maxValue;
                }

                if (isValid && stepValue) {
                    const diff = num - (minValue ?? 0);
                    const eps = 1e-8;
                    const q = diff / stepValue;

                    if (!(Math.abs(Math.round(q) - q) < eps)) {
                        isValid = false;
                        if (minValue === null) {
                            feedbackText = "Step " + stepValue + " richiesto";
                        } else {
                            feedbackText = "Step " + stepValue + " base " + minValue;
                        }

                    }
                }
            }
            break;

        case "checkbox":
            isValid = f.required ? Boolean(value) : true;
            break;

        case "file_upload":
            isValid = f.required ? (value.length > 0) : true;
            break;

        default:
            isValid = f.required ? Boolean(value) : true;
    }

    // equalTo validation
    if (isValid && f.equalTo) {
        let otherValue = (formData as any)[f.equalTo];
        isValid = isValid && value === otherValue;
        feedbackText = `${f.label} non corrisponde a ${(f.equalTo as string)}`;
    }

    const standard_validationInfo: validationFeedbackInfoRelaxed = { isValid: isValid, feedbackText: feedbackText }

    // Custom Validation
    if (f.validation) {
        const validationBoolOp: BoolOp = f.validationBoolOp ?? 'AND';
        const cust_validationInfo = f.validation(f, value, formData);
        return mergeFeedback(standard_validationInfo, cust_validationInfo, validationBoolOp)
    } else {
        return standard_validationInfo;
    }


}

export function initValidationFeedback<T>(
    fields: FieldConfig<T>[],
    formData: T
): Record<keyof T, validationFeedbackInfo> {
    return fields.reduce(
        (acc: Record<keyof T, validationFeedbackInfo>, f) => {
            const rawValue = (formData as any)[f.name];

            const computedValidation = computeValidation<T>(f, rawValue, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            acc[f.name] = defaultValidationFeedback(f, isValid, feedbackText);
            return acc;
        }, {} as Record<keyof T, validationFeedbackInfo>
    );
}

export function handleInputChange<T>(
    key: keyof T,
    value: any,
    valid: boolean,
    fields: FieldConfig<T>[],
    setFormData: React.Dispatch<React.SetStateAction<T>>,
    setValidationFeedback: React.Dispatch<
        React.SetStateAction<Record<keyof T, validationFeedbackInfo>>
    >,
    feedbackText?: string
) {
    console.log("handleInputChange", key, value);

    setFormData(prev => {
        const next = { ...prev, [key]: value };

        setValidationFeedback(prevFb => {
            const fb = { ...prevFb };
            const cfg = fields.find(f => f.name === key)!;

            let thisValid: boolean;
            if (cfg.equalTo) {
                const otherVal = (next as any)[cfg.equalTo];
                thisValid = value === otherVal;
            } else {
                thisValid = valid;
            }

            fb[key] = defaultValidationFeedback(cfg, thisValid, feedbackText);

            fields
                .filter(f => f.equalTo === key)
                .forEach(dep => {
                    const depRaw = (next as any)[dep.name];
                    const depValid =
                        Boolean(depRaw) && depRaw === (next as any)[dep.equalTo!];
                    fb[dep.name] = defaultValidationFeedback(dep, depValid, feedbackText);
                });

            return fb;
        });

        return next;
    });
}

export function handleVisibleChange<T>(
    fields: FieldConfig<T>[],
    formData: T,
    handleChange: (key: keyof T, value: any, valid: boolean) => void,
    validationFeedback: Record<keyof T, validationFeedbackInfo>,
    setValidationFeedback: React.Dispatch<
        React.SetStateAction<Record<keyof T, validationFeedbackInfo>>
    >
): void {

    fields.forEach(field => {
        const isVisible = field.visible ? field.visible(formData) : true;
        const name = field.name as keyof T;
        const currentValue = formData[name];

        if (!isVisible) {
            // if there’s a “real” value, clear it; otherwise just reset its validation
            if (currentValue !== undefined && currentValue !== null && currentValue !== '') {
                handleChange(name, null, true);
            } else {
                if (!validationFeedback[name].isValid) {
                    setValidationFeedback(prev => {
                        const fb = { ...prev };
                        fb[name] = defaultValidationFeedback(field, true);
                        return fb;
                    });
                }
            }
        } else {
            setValidationFeedback(initValidationFeedback(fields, formData));
        }
    });
}
// end