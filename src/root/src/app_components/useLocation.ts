import provinceList from 'comuni-province-regioni-italia/assets/json/province.json';
import { Country, State } from 'country-state-city';

import type { SelectData } from './GeneralForm_Common';

/**
 * Restituisce la lista di tutti i paesi
 */
export function getCountryOptions(): SelectData[] {
  return Country.getAllCountries().map(c => ({
    value: c.isoCode, // es. "IT"
    text: c.name     // es. "Italy"
  }));
}

/**
 * Dato un ISO country code, restituisce gli stati/province
 */
export function getStateOptions(countryCode: string): SelectData[] {
  if (!countryCode) return [];

  if (countryCode == "IT") {
    return provinceList.map(p => ({
      value: p.sigla,                     // es. "RM"
      text:  `${p.nome} (${p.sigla})`     // es. "Roma (RM)"
    }));
  } else {
    return State.getStatesOfCountry(countryCode).map(s => ({
      value: s.name,
      text: s.name
    }));
  }

}
