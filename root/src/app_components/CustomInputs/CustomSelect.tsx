import React, {
  forwardRef,
  useState,
  CSSProperties,
} from "react";
import { SelectData } from "../GeneralForm_Common";

export interface CustomSelectProps {
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  label: string;
  labelClass: string;
  options: SelectData[];
  value: string | number | Array<string | number>;
  isValid: boolean;
  onChange: (values: any) => void;
  style?: CSSProperties;
}

export const CustomSelect = forwardRef<HTMLDivElement, CustomSelectProps>(
  (
    {
      multiple,
      required,
      disabled,
      readOnly,
      label,
      labelClass,
      options,
      value,
      isValid,
      onChange,
      style,
    },
    ref
  ) => {
    const isMulti = Boolean(multiple);
    const [open, setOpen] = useState(false);

    // Utility: estrai il label da un option
    const getLabel = (opt: SelectData) =>
      opt.text ?? String(opt.value ?? "");

    // Raggruppa le option per optgroup, se presente
    const groups = options.reduce<Record<string, SelectData[]>>((g, opt) => {
      const grp = opt.optgroup ?? "";
      g[grp] = g[grp] || [];
      g[grp].push(opt);
      return g;
    }, {});

    // State display: testo o lista di testi nel multi
    const display = () => {
      if (isMulti) {
        const arr = Array.isArray(value) ? value : [];
        if (!arr.length) return "Seleziona…";
        return arr
          .map(v => {
            const opt = options.find(o => o.value === v);
            return opt ? getLabel(opt) : "";
          })
          .join(", ");
      } else {
        const opt = options.find(o => o.value === value);
        return opt ? getLabel(opt) : "Seleziona…";
      }
    };

    return (
      <div className="custom-select-wrapper" style={style}>
        <label className={labelClass}>
          {label}
        </label>

        <div
          className={`custom-select-display${disabled ? " disabled" : ""}`}
          ref={ref}
          onClick={() => {
            if (!disabled && !readOnly) setOpen(o => !o);
          }}
        >
          {display()}
        </div>

        {open && (
          <ul className="custom-select-list">
            {Object.entries(groups).map(([grp, opts]) =>
              grp ? (
                <React.Fragment key={grp}>
                  <li className="optgroup-label">{grp}</li>
                  {opts.map(opt => (
                    <OptionItem key={opt.value} opt={opt} />
                  ))}
                </React.Fragment>
              ) : (
                opts.map(opt => <OptionItem key={opt.value} opt={opt} />)
              )
            )}
          </ul>
        )}
      </div>
    );

    // Componente interno per ogni <li>
    function OptionItem({ opt }: { opt: SelectData }) {
      if (opt.hidden) return null;

      const selected = isMulti
        ? Array.isArray(value) && value.includes(opt.value)
        : value === opt.value;

      const handleClick = () => {
        if (disabled || readOnly) return;

        if (isMulti) {
          const arr = Array.isArray(value) ? [...value] : [];
          if (selected) {
            onChange(arr.filter(v => v !== opt.value));
          } else {
            onChange([...arr, opt.value]);
          }
        } else {
          onChange(opt.value);
          setOpen(false);
        }
      };

      return (
        <li
          className={`custom-select-item ${selected ? "selected" : ""}${opt.disabled ? " disabled" : ""
            }${opt.active ? " active" : ""}`}
          onClick={handleClick}
        >
          {opt.icon && <i className={opt.icon} />}
          <span>{getLabel(opt)}</span>
          {opt.secondaryText && (
            <small className="secondary-text">{opt.secondaryText}</small>
          )}
        </li>
      );
    }
  }
);

CustomSelect.displayName = "CustomSelect";
