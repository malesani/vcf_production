import { FieldConfig, validationFeedbackInfoRelaxed } from './GeneralForm_Common';

export function validateCAP<T>(
  field: FieldConfig<T>,
  value: any,
  formData: T,
): validationFeedbackInfoRelaxed {
  const cap = String(value ?? "").trim();
  const isValid = /^[0-9]{5}$/.test(cap);

  return {
    isValid,
    feedbackText: isValid
      ? undefined
      : "Inserisci un CAP valido (5 cifre)"
  };
}

import { checkVAT, countries, VatCheckResult } from "jsvat";

export function validateVAT<T>(
  f: FieldConfig<T>,
  value: any
): validationFeedbackInfoRelaxed {

  // 1) normalizzo la stringa
  let raw = String(value ?? "")
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, "");

  if (/^[0-9]{11}$/.test(raw)) {
    raw = "IT" + raw;
  }

  // 2) passo anche `countries`:
  const result: VatCheckResult = checkVAT(raw, countries);

  return {
    isValid: result.isValid,
    feedbackText: result.isValid
      ? undefined
      : `Partita IVA non valida${result.country?.isoCode?.short ? ` (${result.country.isoCode.short})` : ""}`
  };
}
