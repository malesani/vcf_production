import React, { useRef, useEffect, useState, useMemo } from "react";
import {
  MDBInput,
  MDBTextArea,
  MDBCheckbox,
  MDBFile,
  MDBDatepicker,
} from "mdb-react-ui-kit";
import { MDBFileUpload } from 'mdb-react-file-upload';

import { RichEditor } from './RichEditor';

import { CustomSelect } from './CustomInputs/CustomSelect';
import { Selectbox_Cards } from './CustomInputs/Selectbox_Cards';

import {
  MDBSimpleSelect,
  FieldConfig,
  SelectData,
  computeValidation
} from "./GeneralForm_Common";

export type InputOrTextAreaChangeEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.ChangeEvent<HTMLTextAreaElement>;

export interface GeneralInputProps<T> {
  field: FieldConfig<T>;                                            /** Configurazione del campo */
  formData: T;                                                      /** Stato corrente di tutti i dati del form */
  first?: boolean;                                                  /** Riferimento al primo input per autofocus */
  style?: React.CSSProperties | undefined;
  onChange: (name: keyof T, value: any, isValid: boolean, feedbackText?: string) => void;  /** Funzione esterna per gestire cambi e validazione */
}

export function GeneralInput<T extends Record<string, any>>(
  {
    field,
    formData,
    first = false,
    style,
    onChange
  }: GeneralInputProps<T>
) {
  const [isValid, setValidity] = useState(!field.required);
  const key = field.name as string;
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus sul primo campo
  useEffect(() => {
    if (first) inputRef.current?.focus();
  }, [first]);


  // Proprietà comuni a tutti i controlli
  const common = {
    ...field.properties,
    required: field.required,
    disabled: field.readOnly,
    readOnly: field.readOnly,
    ref: inputRef
  };

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    if (field.equalTo) {
      const myVal = (formData as any)[field.name];
      const otherVal = (formData as any)[field.equalTo];

      // only validate if both fields non-empty (opzionale)
      const isValid = myVal !== undefined && myVal !== ""
        ? myVal === otherVal
        : false;

      el.setCustomValidity(isValid ? "" : "INVALID");
    }

  }, [formData]);

  // Funzione di change che invoca il callback esterno
  const triggerChange = (e: InputOrTextAreaChangeEvent | null, val: any, isValid: boolean, feedbackText?: string) => {
    setValidity(isValid);
    e?.target.setCustomValidity(isValid ? "" : "INVALID");
    onChange(field.name as keyof T, val, isValid, feedbackText);
  };


  // SETUP INPUT INFO
  let field_labelClass = field.labelClass ?? '';
  var field_label = field.label + (field.required ? ' *' : '');
  var label_class = (field.required ? ('fw-bold ') : field_labelClass);

  // Seleziona il controllo in base al tipo
  let control: React.ReactNode;
  switch (field.type) {
    case "text_area":
      control = (
        <MDBTextArea
          label={field_label}
          labelClass={label_class}
          value={(formData as any)[key] || ""}
          onChange={e => {
            const val = e.target.value;

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(e, val, isValid, feedbackText);
          }}
          style={style}
          rows={field.type === "text_area" ? 4 : undefined}
        />
      );
      break;

    case "checkbox":
      control = (
        <MDBCheckbox
          {...common}
          label={field_label}
          labelClass={label_class}
          checked={Boolean((formData as any)[key])}
          onChange={e => {
            const val = (e.target.checked ? 1 : 0) as unknown as T[typeof key];

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(e, val, isValid, feedbackText);
          }}
        />
      );
      break;

    case "date":
      control = (
        <MDBDatepicker
          {...common}
          label={field_label}
          labelClass={label_class}
          value={(formData as any)[key] || ""}
          onChange={(date: string) => {
            const computedValidation = computeValidation<T>(field, date, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(null, date, isValid, feedbackText);
          }}
          inputStyle={style}
        />
      );
      break;

    case "file_input":
      control = (
        <div>
          <MDBFile
            {...common}
            label={field.label}
            onChange={e => {
              const file = e.target.files?.[0] ?? null;
              const filename = file ? file.name : "";

              const computedValidation = computeValidation<T>(field, file, formData);
              const isValid = computedValidation.isValid;
              const feedbackText = computedValidation.feedbackText;

              triggerChange(e, filename, isValid, feedbackText);
            }}
            style={style}
          />
        </div>
      );
      break;

    case "file_upload":
      control = (
        <MDBFileUpload
          {...common}
          label={field.label}
          className="rounded border border-secondary"
          onChange={(files) => {
            console.log("files", files);
            const filesVal = files ?? [];
            console.log("filesVal", filesVal);

            const computedValidation = computeValidation<T>(field, filesVal, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(null, filesVal, isValid, feedbackText);
          }}
          style={style}
        />
      );
      break;

    case "selectbox":
      const isMulti = Boolean(field.properties?.multiple);
      const preventFirstSelection = field.properties?.preventFirstSelection !== false;

      const currentValue = (formData as any)[key] ?? (isMulti ? [] : undefined);

      const handleChange = (values: (string | number) | Array<string | number>) => {
        if (isMulti) {
          const selectedArray = Array.isArray(values) ? values : [values];
          const valArray = selectedArray.map(item =>
            typeof item === "object" && "value" in item
              ? (item as any).value
              : item
          );

          const computedValidation = computeValidation<T>(field, valArray, formData);
          const isValid = computedValidation.isValid;
          const feedbackText = computedValidation.feedbackText;

          triggerChange(null, valArray, isValid, feedbackText);
        } else {
          const raw = Array.isArray(values)
            ? values[0]
            : values;
          const val = raw && typeof raw === "object" && "value" in raw
            ? (raw as any).value
            : raw;

          const computedValidation = computeValidation<T>(field, val, formData);
          const isValid = computedValidation.isValid;
          const feedbackText = computedValidation.feedbackText;

          triggerChange(null, val, isValid, feedbackText);
        }
      };

      switch (field.customElementKey) {
        case "custom":
          control = (
            <CustomSelect
              {...common}
              label={field_label}
              labelClass={label_class}
              options={field.options || []}
              value={currentValue}
              isValid={isValid}
              onChange={handleChange}
              style={style}
            />
          );
          break;
        case "cards":
          control = (
            <Selectbox_Cards
              {...common}
              label={field_label}
              labelClass={label_class}
              options={field.options || []}
              value={currentValue}
              isValid={isValid}
              onChange={handleChange}
              style={style}
            />
          );
          break;

        case "dual_switch":
          let switchOptions;
          const fallbackOptions = [
            { value: "not_set_1", text: "-" },
            { value: "not_set_2", text: "-" }
          ];
          if (Array.isArray(field.options)) {
            if (field.options.length >= 2) {
              switchOptions = [field.options[0], field.options[1]];
            } else if (field.options.length === 1) {
              switchOptions = [field.options[0], fallbackOptions[1]];
            } else {
              switchOptions = fallbackOptions;
            }
          } else {
            switchOptions = fallbackOptions;
          }

          const colorVariant: string = field.properties?.color ?? "primary";
          const extraClass: string = field.properties?.className ?? "";

          useEffect(() => {
            if (currentValue != switchOptions[0].value && currentValue != switchOptions[1].value) {
              handleChange(switchOptions[0].value);
            }
          }, []);

          const toggle = () => {
            const next = currentValue === switchOptions[0].value ? switchOptions[1].value : switchOptions[0].value;
            handleChange(next);
          };

          control = (
            <div style={{ width: '100%', height: '38px' }}>
              {/* PILL-SWITCH */}
              <div
                onClick={toggle}
                className={`position-relative rounded-pill p-1 align-items-center ${extraClass}`}
                style={{
                  display: 'flex',
                  backgroundColor: '#e9ecef',
                  cursor: 'pointer',
                  userSelect: 'none',
                  width: '100%',
                  height: '38px'
                }}
              >
                {/* SLIDER */}
                <div
                  className={`position-absolute rounded-pill bg-${colorVariant}`}
                  style={{
                    top: 2,
                    bottom: 2,
                    left: currentValue === switchOptions[0].value ? 2 : `calc(50% + 2px)`,
                    width: `calc(50% - 4px)`,
                    transition: 'left 0.2s ease'
                  }}
                />

                {/* ETICHETTE */}
                {switchOptions.map((option) => (
                  <div
                    key={option.value}
                    className="position-relative text-center"
                    style={{
                      zIndex: 1,
                      color: currentValue === option.value ? '#fff' : '#000',
                      fontWeight: 500,
                      flex: 1,
                      padding: '0.5rem 0'
                    }}
                  >
                    {option.text || option.value}
                  </div>
                ))}
              </div>
            </div>
          );
          break;

        default:
          const [searchTerm, setSearchTerm] = useState("");

          const isSearchable = Boolean(field.properties?.search || field.properties?.largeDataSearch);
          const isLargeData = Boolean(field.properties?.largeDataSearch);
          const originalOptions = field.options || [];

          const computeSelectData = (term: string): SelectData[] => {
            const cleanedTerm = term.trim().toLowerCase();
            const selectedSet = new Set(
              isMulti
                ? (Array.isArray(currentValue) ? currentValue : [])
                : (currentValue != null ? [currentValue] : [])
            );

            if (!cleanedTerm && selectedSet.size === 0) {
              return [{ value: '', text: "Ricerca qualcosa", disabled: true }];
            }

            const enriched = originalOptions.map(opt => ({
              ...opt,
              _label: opt.text ?? String(opt.value),
              _labelLower: (opt.text ?? String(opt.value)).toLowerCase(),
              _valueLower: String(opt.value).toLowerCase(),
            }));

            const matches = enriched.filter(opt =>
              opt._labelLower.includes(cleanedTerm) || opt._valueLower.includes(cleanedTerm)
            );

            const stripLead = (s: string) => s.replace(/^[^a-z0-9]+/i, "");
            matches.sort((a, b) => {
              const rank = (o: typeof a) => {
                if (o._valueLower === cleanedTerm) return 0;
                if (o._labelLower.startsWith(cleanedTerm)) return 1;
                if (o._valueLower.startsWith(cleanedTerm)) return 2;
                return 3;
              };
              const ra = rank(a), rb = rank(b);
              return ra !== rb
                ? ra - rb
                : stripLead(a._labelLower).localeCompare(stripLead(b._labelLower));
            });

            const filtered = matches.slice(0, 15).map(({ _label, _labelLower, _valueLower, ...opt }) => opt);
            const missing = originalOptions.filter(opt =>
              selectedSet.has(opt.value) && !filtered.some(f => f.value === opt.value)
            );

            const result = [...filtered, ...missing];
            return result.length > 0 ? result : [{ value: '', text: "Nessun risultato", disabled: true }];
          };

          const searchFn = isLargeData
            ? (query: string, data: SelectData[]) => {
              setSearchTerm(query);
              return data;
            }
            : field.properties?.searchFn ?? null;

          const selectData = isLargeData
            ? useMemo(() => computeSelectData(searchTerm), [originalOptions, searchTerm, currentValue, isMulti])
            : originalOptions;

          control = (
            <MDBSimpleSelect
              {...common}
              search={isSearchable}
              searchFn={searchFn}
              preventFirstSelection={preventFirstSelection}
              label={field_label}
              labelClass={label_class}
              data={selectData}
              value={currentValue}
              onChange={handleChange}
              style={style}
            />
          );
          break;
      }
      break;

    case "richtext":
      control = (
        <RichEditor
          value={formData[key] || ''}
          onChange={html => {
            const val = html;

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(null, val, isValid, feedbackText);
          }}
        />
      );
      break;

    case "email":
      control = (
        <MDBInput
          {...common}
          type={"email"}
          label={field_label}
          labelClass={label_class}
          value={(formData as any)[key] || ""}
          onChange={e => {
            const val = e.target.value;

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(e, val, isValid, feedbackText);
          }}
          style={style}
        />
      );
      break;

    case "password":
      control = (
        <MDBInput
          {...common}
          type={"password"}
          label={field_label}
          labelClass={label_class}
          value={(formData as any)[key] || ""}
          onChange={e => {
            const val = e.target.value;

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(e, val, isValid, feedbackText);
          }}
          style={style}
        />
      );
      break;

    case "number":
      const defaultValue =
        field.properties?.defaultValue != null
          ? String(field.properties.defaultValue)
          : undefined;

      const minValue = field.properties?.minValue ?? null;
      const maxValue = field.properties?.maxValue ?? null;
      const stepValue = field.properties?.stepValue ?? null;

      control = (
        <MDBInput
          {...common}
          type={"number"}
          label={field_label}
          labelClass={label_class}
          value={
            (formData as any)[key] != null
              ? String((formData as any)[key])
              : defaultValue ?? ""
          }
          min={minValue ?? undefined}
          max={maxValue ?? undefined}
          step={stepValue ?? undefined}
          onChange={e => {
            const val = e.target.value;

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(e, val, isValid, feedbackText);
          }}
          onBlur={e => {
            let val = e.target.value;
            if (val !== "") {
              let num = Number(val);
              // se fuori bound lo clampi
              if (minValue !== null && num < minValue) num = minValue;
              if (maxValue !== null && num > maxValue) num = maxValue;

              const clamped = String(num);
              // evita doppie chiamate se non serve
              if (clamped !== val) {
                const computedValidation = computeValidation<T>(field, clamped, formData);
                const isValid = computedValidation.isValid;
                const feedbackText = computedValidation.feedbackText;

                triggerChange(e, clamped, isValid, feedbackText);
              }
            }
          }}
          style={style}
        />
      );
      break;

    default:
      control = (
        <MDBInput
          {...common}
          type={field.type || "text"}
          label={field_label}
          labelClass={label_class}
          value={(formData as any)[key] || ""}
          onChange={e => {
            const val = e.target.value;

            const computedValidation = computeValidation<T>(field, val, formData);
            const isValid = computedValidation.isValid;
            const feedbackText = computedValidation.feedbackText;

            triggerChange(e, val, isValid, feedbackText);
          }}
          style={style}
        />
      );
  }

  return <>{control}</>;
}