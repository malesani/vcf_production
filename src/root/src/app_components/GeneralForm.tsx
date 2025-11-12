import React, { useRef, useState, useMemo, useEffect } from "react";
import {
  MDBRow,
  MDBCol,
  MDBValidation,
  MDBValidationItem,
  MDBBtn,
  MDBIcon
} from "mdb-react-ui-kit";

import { RepeaterField } from './GeneralForm_Repeater'

import { requestResponse } from '../hooks/RequestFunction';

import {
  FieldConfig,
  FormCommonProps,
  CreateFlow,
  UpdateFlow,
  UpsertFlow,
  FormAction,
  presetLayoutInfo,
  handleVisibleChange,
  SelectBoxConfigDependent,
  computeValidation,
  SelectData,
  RepeaterFieldConfig
} from './GeneralForm_Common';

import { useDependentOptions, DependentConfig } from './useDependentOptions';

import { useCreateFlow, useUpdateFlow, useUpsertFlow } from "./GeneralForm_Hooks";

import { useFormAlert } from './GeneralAlert';
import { GeneralInput } from './GeneralInput';
import { General_Loading } from './General_Loading';

import { useIsMobile } from "./ResponsiveModule";

export type { FieldConfig, SelectData } from './GeneralForm_Common';

export type GeneralFormProps<T, P> =
  FormCommonProps<T, P> &
  (CreateFlow<T, P> | UpdateFlow<T, P> | UpsertFlow<T, P>);


export function GeneralForm<T extends Record<string, any>, P extends Record<string, any> = {}>(props: GeneralFormProps<T, P>) {
  const isTablet = useIsMobile(992);
  // const isMobile = useIsMobile(768);

  // External Submith - setup
  const formRef = useRef<HTMLFormElement>(null);
  const externalResolve = useRef<(ok: boolean) => void>();

  const submitExternal = (): Promise<boolean> => {
    if (externalResolve.current) {      // se c'è già un submit in corso, blocchiamo
      return Promise.resolve(false);
    }

    return new Promise(resolve => {
      externalResolve.current = resolve;
      formRef.current?.requestSubmit();
    });
  };

  useEffect(() => {
    props.registerSubmit?.(submitExternal);
    return () => { externalResolve.current = undefined; };
  }, []);
  // end

  const { showAlertSuccess, showAlertError, showAlertWarning, showAlertLoading, hideAlert, FormAlert } = useFormAlert();
  const [newMessage, setNewMessage] = useState<requestResponse | null>(null);

  const {
    mode,
    formActions,
    onNewMessage: externalOnNewMessage,
    onNotValidated: propsOnNotValidated,
    onChangeGetDataState: externalOnChangeGetDataState,
    disableSubmit = false
  } = props;

  const flowProps = {
    ...props,
    onNewMessage: setNewMessage,
    onNotValidated: () => {
      {
        (props.alertProps?.show?.warning ?? true) &&
          showAlertWarning("Verifica di aver inserito i dati in modo corretto.", props.alertProps?.position?.warning);
      }
      propsOnNotValidated?.();  // chiamiamo la callback originale, se presente
      if (externalResolve.current) {  // risolviamo la Promise esterna con false e puliamo
        externalResolve.current(false);
        externalResolve.current = undefined;
      }
    }
  } as GeneralFormProps<T, P>;

  let flow;
  if (mode === "create") {
    flow = useCreateFlow<T, P>(flowProps as CreateFlow<T, P> & FormCommonProps<T, P>);
  } else if (mode === "update") {
    flow = useUpdateFlow<T, P>(flowProps as UpdateFlow<T, P> & FormCommonProps<T, P>);
  } else {
    // NOTA | flow.isCreateMode ti dirà se sei ancora in "create" o ormai in "update"
    flow = useUpsertFlow<T, P>(flowProps as UpsertFlow<T, P> & FormCommonProps<T, P>);
  }

  // SELECTBOX DEPENDENT FIELDS
  const selectConfigs = useMemo<DependentConfig<T>[]>(() =>
    flow.fields
      .filter((f): f is SelectBoxConfigDependent<T> =>
        f.type === "selectbox" && !!f.getOptions && !!f.dependencies
      )
      .map(f => ({
        field: f.name,
        dependencies: f.dependencies!,
        getOptions: f.getOptions!
      }))
    , [flow.fields]);

  const dependentOptions = useDependentOptions(flow.formData, selectConfigs);

  useEffect(() => {
    selectConfigs.forEach((selectConf) => {
      const field = selectConf.field;

      // Assicuriamoci di avere sempre un array
      const rawOpts = dependentOptions[field];
      const opts: SelectData[] = Array.isArray(rawOpts) ? rawOpts : [];

      const cfg = flow.fields.find(f => f.name === field)! as SelectBoxConfigDependent<T>;
      const current = flow.formData[field];

      // controlla se current è ancora nelle options effettive
      const validValues = opts.map(o => o.value);
      const inOptions = validValues.includes(current);

      if (!inOptions) {
        let newValue: any;

        if (opts.length === 0) {
          newValue = "unset";
        } else {
          newValue = opts[0].value;
        }

        if (current != newValue) {
          const computedValidation = computeValidation<T>(cfg, newValue, flow.formData);
          const isValid = computedValidation.isValid;
          const feedbackText = computedValidation.feedbackText;

          flow.handleChange(field, newValue, isValid, feedbackText);
        }
      }
    });
  }, [dependentOptions]);
  // END

  // VISIBILITY FIELDS
  const conditionalFields = useMemo(
    () => flow.fields.filter(f => typeof f.visible === 'function'),
    [flow.fields]
  );

  const visibilityMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    for (const f of conditionalFields) {
      m[String(f.name)] = f.visible!(flow.formData);
    }
    return m;
  }, [conditionalFields, flow.formData]);
  // END

  // LAYOUT PRESET: se upsert, usa flow.isCreateMode per
  // scegliere "create" o "update"
  const effectiveMode: "create" | "update" =
    mode === "upsert"
      ? (flow as any).isCreateMode ? "create" : "update"
      : mode;
  const flowLoading = ('loading' in flow) ? (flow as any).loading : false;
  const layout = presetLayoutInfo({ ...props, mode: effectiveMode });

  const { icon, title, hideHeader, atTop, submitBtn, showHeaderDivider } = layout;
  const { label, labelSaving, icon: propIcon, iconPosition, className, color } = submitBtn;
  const defaultIcon = mode === "update" ? "save" : "plus";
  const btnIcon = propIcon ?? defaultIcon;
  // end

  const modifiedStyle = ('modifiedStyle' in flow && typeof flow.modifiedStyle === 'function')
    ? flow.modifiedStyle
    : (_: keyof T) => ({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    flow.handleSubmit(e);
  };

  useEffect(() => {
    if (!newMessage) return;
    externalOnNewMessage?.(newMessage);

    // risolvo resolver…
    externalResolve.current?.(newMessage.success);
    externalResolve.current = undefined;

    // mostro alert…
    newMessage.success
      ? ((props.alertProps?.show?.success ?? true) ?
        showAlertSuccess(newMessage.message, props.alertProps?.position?.success) : hideAlert())
      : ((props.alertProps?.show?.error ?? true) &&
        showAlertError(newMessage.message, props.alertProps?.position?.error));

    // **resetto** lo stato, così il vecchio messaggio non tornerà  
    setNewMessage(null);
  }, [newMessage]);


  useEffect(() => {
    if (!flowLoading) {
      console.log("FORM CARCATO", flow.formData)
    }
    externalOnChangeGetDataState?.(flowLoading);
  }, [flowLoading]);

  const subIsBlock = ((!hideHeader && !atTop) || hideHeader);
  const subIsFloating = isTablet && !subIsBlock;
  const submitButtonElement =
    <MDBBtn
      type="submit"
      block={subIsBlock}
      floating={subIsFloating}
      color={color}
      className={(color == "success" ? 'text-white' : '') + (className ?? '')}
      disabled={!flow.isModified || flow.isSaving}
    >
      {iconPosition === "left" && btnIcon && <MDBIcon icon={flow.isSaving ? "spinner" : btnIcon} spin={flow.isSaving} className={subIsFloating ? '' : "me-2"} />}
      {flow.isSaving && !btnIcon && <MDBIcon icon="spinner" spin={flow.isSaving} className={subIsFloating ? '' : "me-2"} />}
      {(!btnIcon || !subIsFloating) && (flow.isSaving ? labelSaving : label)}
      {iconPosition === "right" && btnIcon && <MDBIcon icon={flow.isSaving ? "spinner" : btnIcon} spin={flow.isSaving} className={subIsFloating ? '' : "me-2"} />}
    </MDBBtn>;

  useEffect(() => {
    if (conditionalFields.length > 0) {
      handleVisibleChange(
        flow.fields,
        flow.formData,
        flow.handleChange,
        flow.validationFeedback,
        flow.setValidationFeedback
      );
    }
  }, [visibilityMap]);

  useEffect(() => {
    if (flow.isSaving) {
      {
        (props.alertProps?.show?.loading ?? true) ?
          showAlertLoading("Operazione in corso ...", props.alertProps?.position?.loading) : hideAlert();
      }
    }
  }, [flow.isSaving])

  return (
    <MDBValidation
      noValidate
      isValidated={flow.validated}
      onSubmit={handleSubmit}
      className={layout.className}
      ref={formRef}
    >

      {/* Header */}
      {!hideHeader && (<>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="text-start mb-0">
            {icon && <MDBIcon icon={icon} size="sm" className="me-2" />}
            {title}
          </h5>
          <div className="d-flex flex-row gap-2">
            {formActions?.map((act: FormAction<T>, i) => {
              if (act.visible && !act.visible(flow.formData)) return null;
              const forceFloating = isTablet && !!act.icon;

              return (
                <MDBBtn
                  type="button"
                  key={i}
                  {...act.buttonProps}
                  floating={forceFloating}
                  onClick={() => { act.onClick(flow.formData) }}
                >
                  {act.icon && <MDBIcon icon={act.icon} className={(act.label && !isTablet) ? "me-2" : ""} />}
                  {(!isTablet || !act.icon) && act.label}
                </MDBBtn>
              );
            })}
            {(atTop && !disableSubmit) && submitButtonElement}
          </div>
        </div>

        {atTop && <FormAlert />}

        {showHeaderDivider && <div className="m-0"><hr className="mt-0" /></div>}

      </>)}

      {flowLoading ?
        <General_Loading theme="formLoading" />
        : <MDBRow>
          {flow.fields
            .filter(f => {
              return !(f.visible && !f.visible(flow.formData));
            }).map((field) => {
              const key = field.name as keyof T;
              const info = flow.validationFeedback[field.name];

              const beforeElems = field.extraElements?.filter(e => (e.position === "before") && (typeof e.visible !== "function" || e.visible(flow.formData))) ?? [];
              const afterElems = field.extraElements?.filter(e => (e.position === "after") && (typeof e.visible !== "function" || e.visible(flow.formData))) ?? [];

              let effectiveField = field;
              if (field.type === "selectbox" && key in dependentOptions && !!field.dependencies) {
                const opts = dependentOptions[key] ?? undefined;

                const preventFirst = field.properties?.preventFirstSelection !== false;

                let depsValid = true;
                if (preventFirst) {
                  depsValid = field.dependencies
                    .every(depName => {
                      const val = (flow.formData as any)[depName];
                      // restituisce true solo se val non è undefined, null o stringa vuota
                      return val !== undefined && val !== null && val !== "";
                    });
                  console.log("depsValid", depsValid);
                }

                const placeholder: SelectData = { value: "unset", text: "-", hidden: (opts.length > 0) };
                const safeOptions: SelectData[] = depsValid ? [placeholder, ...opts] : opts;

                effectiveField = {
                  ...field,
                  options: safeOptions
                } as FieldConfig<T>;
              }

              return (
                <React.Fragment key={String(key)}>
                  {field.hrBefore && <div className="m-0"><hr className="mt-0" /></div>}

                  {/* extraElements position="before" */}
                  {beforeElems.map((e, idx) => {
                    const content =
                      typeof e.element === 'function'
                        ? (e.element as (fd: T) => React.ReactNode)(flow.formData)
                        : e.element;

                    return (
                      <MDBCol
                        key={`before-${String(key)}-${idx}`}
                        size={e.grid?.size}
                        sm={e.grid?.sm}
                        md={e.grid?.md}
                        lg={e.grid?.lg}
                        className={"mb-3 " + (e.class_name || '')}
                      >
                        {content}
                      </MDBCol>
                    );
                  })}

                  <MDBCol
                    className={"mb-4 " + (field.class_name || '')}
                    size={field.grid?.size}
                    sm={field.grid?.sm}
                    md={field.grid?.md}
                    lg={field.grid?.lg}
                  >
                    <MDBValidationItem
                      feedback={info.feedbackText}
                      invalid={flow.validated && !info.isValid}
                    >
                      {effectiveField.type === "repeater" ?
                        <RepeaterField<T, any>
                          field={effectiveField as RepeaterFieldConfig<T, any>}
                          items={flow.formData[key] || []}
                          onChange={(newItems: any[]) => {
                            const validation = computeValidation<T>(effectiveField, newItems, flow.formData);
                            flow.handleChange(key, newItems, validation.isValid, validation.feedbackText);
                          }}
                          validated={flow.validated}
                        />
                        :
                        <GeneralInput<T>
                          field={effectiveField}
                          formData={flow.formData}
                          style={modifiedStyle(key)}
                          onChange={flow.handleChange}
                        />
                      }

                    </MDBValidationItem>
                  </MDBCol>

                  {/* extraElements position="after" */}
                  {afterElems.map((e, i) => {
                    const content =
                      typeof e.element === 'function'
                        ? (e.element as (fd: T) => React.ReactNode)(flow.formData)
                        : e.element;

                    return (
                      <MDBCol
                        key={`after-${String(key)}-${i}`}
                        size={e.grid?.size}
                        sm={e.grid?.sm}
                        md={e.grid?.md}
                        lg={e.grid?.lg}
                        className={"mb-3 " + (e.class_name || '')}
                      >
                        {content}
                      </MDBCol>
                    );
                  })}

                  {field.hrAfter && <div className="m-0"><hr className="mt-0" /></div>}

                </React.Fragment>
              );

            })}
        </MDBRow>}

      {/* Bottom submit */}
      {((!hideHeader && !atTop) || hideHeader) && (
        <>
          <div className="m-0"><hr className="mt-0" /></div>
          <FormAlert />
          {!disableSubmit && submitButtonElement}
        </>
      )}
    </MDBValidation>
  );
}

export default GeneralForm;
