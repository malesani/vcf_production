// src/api_module/ProjectCommunicationRequest.ts

import { DataResponse, requestResponse } from '../hooks/RequestFunction';
import { DefaultFilters } from '../app_components/GeneralTable';

export interface APICommunicationInfo {
  communication_uid: string;
  project_uid: string;
  contact_date: string;       // ISO yyyy-MM-dd
  contact_type: string;       // es. "email", "phone", …
  teamMember_uid?: string;
  note?: string;
}

// Storage in-memory
let _store: APICommunicationInfo[] = [];

// Helpers
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * getData: supporta anche i filtri di paginazione, ma qui li ignoriamo
 */
export async function getProjectCommunicationsList(
  args: { project_uid: string } & DefaultFilters
): Promise<DataResponse<APICommunicationInfo[]>> {
  await wait(200);
  // filtro per progetto
  const list = _store.filter(c => c.project_uid === args.project_uid);
  
  // metadati
  const total = list.length;
  const perPage = args.per_page ?? total;
  // (facoltativo: potresti calcolare page da args.page)
  
  const resp: requestResponse = {
    success: true,
    message: 'Elenco comunicazioni recuperato',
    data: { total, per_page: perPage }
  };
  return { response: resp, data: clone(list) };
}

export async function createProjectCommunication(
  payload: APICommunicationInfo & { project_uid: string }
): Promise<DataResponse<APICommunicationInfo>> {
  await wait(200);
  const newItem: APICommunicationInfo = {
    ...payload,
    communication_uid: Date.now().toString()
  };
  _store.unshift(newItem);
  const resp: requestResponse = {
    success: true,
    message: 'Comunicazione creata.',
  };
  return { response: resp, data: clone(newItem) };
}

export async function updateProjectCommunication(
  payload: APICommunicationInfo & { project_uid: string }
): Promise<DataResponse<APICommunicationInfo>> {
  await wait(200);
  const idx = _store.findIndex(c => c.communication_uid === payload.communication_uid);
  if (idx === -1) {
    return {
      response: { success: false, message: 'Elemento non trovato.' },
      data: clone(payload)
    };
  }
  _store[idx] = { ...payload };
  const resp: requestResponse = {
    success: true,
    message: 'Comunicazione aggiornata.',
  };
  return { response: resp, data: clone(_store[idx]) };
}

export async function deleteProjectCommunication(
  params: { communication_uid: string; project_uid?: string }
): Promise<DataResponse<null>> {
  await wait(200);
  const before = _store.length;
  _store = _store.filter(c => c.communication_uid !== params.communication_uid);
  if (_store.length === before) {
    return {
      response: { success: false, message: 'Elemento non trovato.' },
      data: null
    };
  }
  return {
    response: { success: true, message: 'Comunicazione eliminata.' },
    data: null
  };
}
