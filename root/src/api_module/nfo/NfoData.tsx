import { requestResponse, requestFunction, DataResponse, TableDataResponse } from '../../hooks/RequestFunction';
import { TableFilters } from '../../app_components/TableData/interfaces';

/* ===========================
 * TYPES
 * =========================== */

export interface NfoAsset {
  nfo_uid: string;
  symbol: string;
  percentage: number;
}

export type NfoStatus = 'draft' | 'active' | 'deleted';

export type NfoInfoBase = {
  nfo_uid: string;
  managed_uid: string;
  title: string;
  description: string;
  html_body: string;
  status: NfoStatus;
  scheduled_at?: string;   // preferibile string (ISO / 'YYYY-MM-DD HH:mm:ss')
  month_num?: number;
  year?: number;
  assets?: NfoAsset[];
};

export type NfoInfo =
  | (NfoInfoBase & {
    type: 'report';
    month_num: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    year: number;
    assets?: NfoAsset[];
  })
  | (NfoInfoBase & {
    type: 'alert';
  });

/* ===========================
 * UTILS
 * =========================== */

// Normalizza Date/string verso il formato backend (YYYY-MM-DD HH:MM:SS)
const toBackendDate = (d?: string | Date) =>
  !d
    ? undefined
    : d instanceof Date
      ? d.toISOString().slice(0, 19).replace('T', ' ')
      : d;

// ✅ NEW: default scheduled_at
const normalizeScheduledAtForCreate = (payload: any) => {
  const s = payload?.scheduled_at;

  // se non specificato => NOW
  if (s === null || s === undefined || (typeof s === "string" && s.trim() === "")) {
    return { ...payload, scheduled_at: toBackendDateTime(new Date()) };
  }

  // se specificato => normalizza SEMPRE
  return { ...payload, scheduled_at: toBackendDateTime(s) };
};

const normalizeScheduledAtIfPresent = (payload: any) => {
  if (!payload || !("scheduled_at" in payload)) return payload;

  const s = payload.scheduled_at;

  // se in update arriva "" o null, decidi tu:
  // - o lo lasci null (sblocchi scheduled)
  // - o lo converti a NOW
  // Io qui lo lascio null/undefined se vuoto:
  if (s === null || s === undefined || (typeof s === "string" && s.trim() === "")) {
    return { ...payload, scheduled_at: null };
  }

  return { ...payload, scheduled_at: toBackendDateTime(s) };
};


const pad2 = (n: number) => String(n).padStart(2, "0");

// accetta:
// - "YYYY-MM-DD HH:mm:ss" (ok)
// - "YYYY-MM-DD HH:mm"    (aggiunge :00)
// - "DD/MM/YYYY, HH:mm AM/PM" (MDB datetime picker)
// - Date (lo gestiamo a monte)
const toBackendDateTime = (raw?: string | Date) => {
  if (!raw) return undefined;

  // Date -> sql
  if (raw instanceof Date) {
    return raw.toISOString().slice(0, 19).replace("T", " ");
  }

  const s0 = String(raw).trim();
  if (!s0) return undefined;

  // già MySQL pieno
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s0)) return s0;

  // MySQL senza secondi
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s0)) return `${s0}:00`;

  // MDB: "13/01/2026, 05:00 AM"
  const m = s0.match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    const dd = m[1], mm = m[2], yyyy = m[3];
    let hh = parseInt(m[4], 10);
    const min = m[5];
    const ap = m[6].toUpperCase();
    if (ap === "PM" && hh < 12) hh += 12;
    if (ap === "AM" && hh === 12) hh = 0;
    return `${yyyy}-${mm}-${dd} ${pad2(hh)}:${min}:00`;
  }

  // fallback (se vuoi essere super safe): provo Date.parse
  const d = new Date(s0);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  // se arriva roba strana, meglio mandare com'è e far fallire con errore visibile
  return s0;
};


/* ===========================
 * GET singolo NFO
 * =========================== */

export async function get_nfoData(
  { nfo_uid }: { nfo_uid: string }
): Promise<DataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_info',
    { nfo_uid }
  );
  if (response.success && response.data?.nfo_info) {
    return { response, data: response.data.nfo_info as NfoInfo };
  }
  return { response };
}

/* ===========================
 * LISTE (ALL, non paginate)
 * Backend: data = array puro
 * =========================== */

export async function get_nfoAlerts(
  { managed_uid, ...rest }: { managed_uid?: string } & Record<string, any> = {}
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_alerts_list',
    { managed_uid, ...rest }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

export async function get_nfoReports(
  { managed_uid, ...rest }: { managed_uid?: string } & Record<string, any>
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_reports_list',
    { managed_uid, ...rest }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

export async function get_nfoAll(
  { managed_uid }: { managed_uid?: string }
): Promise<DataResponse<{ alerts: NfoInfo[]; reports: NfoInfo[] }>> {
  const [alertsRes, reportsRes] = await Promise.all([
    get_nfoAlerts({ managed_uid }),
    get_nfoReports({ managed_uid })
  ]);

  const alerts = Array.isArray(alertsRes.data) ? (alertsRes.data as NfoInfo[]) : [];
  const reports = Array.isArray(reportsRes.data) ? (reportsRes.data as NfoInfo[]) : [];

  const response: requestResponse = {
    success: !!(alertsRes.response.success && reportsRes.response.success),
    message: 'OK',
    data: { alerts, reports },
  };

  return { response, data: { alerts, reports } };
}

/* ===========================
 * CREATE / UPDATE (generici)
 * Backend: data = NfoInfo
 * =========================== */

export async function createNfo(
  nfo: NfoInfo
): Promise<DataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'POST',
    'nfo_create',
    nfo
  );
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

export async function upsertNfo(
  payload: Partial<NfoInfo>
): Promise<DataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'POST',
    'nfo_upsert',
    payload
  );
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

/* ===========================
 * CREATE via NfoInfo
 * =========================== */

export async function create_nfoData(payload: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const normalized = normalizeScheduledAtForCreate(payload);
  const response = await requestFunction('/nfo/api/nfo.php', 'POST', 'nfo_create', normalized);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

/* ===========================
 * UPSERT via NfoInfo
 * =========================== */

export async function update_nfoInfo(nfo_info: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const response = await requestFunction('/nfo/api/nfo.php', 'PUT', 'nfo_info', nfo_info);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

export async function update_nfoAssets(nfo_assets: NfoAsset): Promise<DataResponse<NfoAsset>> {
  const response = await requestFunction('/nfo/api/nfo.php', 'PUT', 'nfo_assets', nfo_assets);
  if (response.success && response.data) {
    return { response, data: response.data as NfoAsset };
  }
  return { response };
}

export async function update_nfoData(nfo_info: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const response = await requestFunction('/nfo/api/nfo.php', 'PUT', 'nfo_data', nfo_info);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

/* ===========================
 * LISTE parametriche (anche paginate)
 * Backend: opt = nfo_reports_list / nfo_alerts_list
 * =========================== */

export type NfoListFilters = {
  scheduled_from?: string | Date;
  scheduled_to?: string | Date;
  valid_only?: boolean;
};

export async function get_nfoReportsListPaginated(
  params: TableFilters<NfoInfo> & NfoListFilters
): Promise<TableDataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_reports_list_paginated',
    params
  );

  return response as TableDataResponse<NfoInfo>;
}

export async function get_nfoAlertsListPaginated(
  params: TableFilters<NfoInfo> & NfoListFilters
): Promise<TableDataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_alerts_list_paginated',
    params
  );

  return response as TableDataResponse<NfoInfo>;
}

// Not Paginated
export async function get_nfoReportsList(
  params: TableFilters<NfoInfo> & NfoListFilters
): Promise<TableDataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_reports_list',
    params
  );

  return response as TableDataResponse<NfoInfo>;
}

export async function get_nfoAlertsList(
  params: TableFilters<NfoInfo> & NfoListFilters
): Promise<TableDataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_alerts_list',
    params
  );

  return response as TableDataResponse<NfoInfo>;
}

/* ===========================
 * GET "tutti" (filtri rapidi) + GET "validi by managed"
 * =========================== */


// REPORT validi per managed_uid (status=active && scheduled_at<=now lato backend)
export async function get_validReportsByManaged(
  managed_uid: string
): Promise<DataResponse<NfoInfo>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_lastValidReport',
    { managed_uid, valid_only: true }
  );
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

// ALERT validi per managed_uid
export async function get_validAlertsByManaged(
  managed_uid: string
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_validAlerts',
    { managed_uid }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

/* ===========================
 * MARK SEEN (user extended_fields.nfo_seen)
 * Backend: opt = nfo_markSeen
 * =========================== */

export async function mark_nfoSeen(
  nfo_uid: string
): Promise<DataResponse<{ nfo_uid: string; seen_num?: number; nfo_seen?: string[] }>> {
  const response = await requestFunction(
    "/nfo/api/nfo.php",
    "POST",
    "nfo_markSeen",
    { nfo_uid }
  );

  if (response.success) {
    return { response, data: response.data as any };
  }
  return { response };
}

/* ===========================
 * LISTE UNSEEN (ALL, non paginate)
 * Backend: data = array puro
 * Opt: nfo_alerts_unseen_list / nfo_reports_unseen_list
 * =========================== */

export async function get_nfoAlertsUnseen(
  { managed_uid, limit, ...rest }: { managed_uid?: string; limit?: number } & Record<string, any> = {}
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    "/nfo/api/nfo.php",
    "GET",
    "nfo_alerts_unseen_list",
    { managed_uid, limit, ...rest }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

export async function get_nfoReportsUnseen(
  { managed_uid, limit, ...rest }: { managed_uid?: string; limit?: number } & Record<string, any> = {}
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    "/nfo/api/nfo.php",
    "GET",
    "nfo_reports_unseen_list",
    { managed_uid, limit, ...rest }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

export async function get_nfoAllUnseen(
  { managed_uid, limitAlerts = 10, limitReports = 10 }: { managed_uid?: string; limitAlerts?: number; limitReports?: number } = {}
): Promise<DataResponse<{ alerts: NfoInfo[]; reports: NfoInfo[] }>> {
  const [alertsRes, reportsRes] = await Promise.all([
    get_nfoAlertsUnseen({ managed_uid, limit: limitAlerts }),
    get_nfoReportsUnseen({ managed_uid, limit: limitReports }),
  ]);

  const alerts = Array.isArray(alertsRes.data) ? (alertsRes.data as NfoInfo[]) : [];
  const reports = Array.isArray(reportsRes.data) ? (reportsRes.data as NfoInfo[]) : [];

  const response: requestResponse = {
    success: !!(alertsRes.response.success && reportsRes.response.success),
    message: "OK",
    data: { alerts, reports },
  };

  return { response, data: { alerts, reports } };
}

/* ===========================
 * UNSEEN FEED (case unico)
 * Backend opt: nfo_unseen_feed
 * data = array puro (misto report+alert) già filtrato lato backend
 * =========================== */

export type NfoUnseenFeedParams = {
  managed_uid?: string | null;
  limit?: number;
  search?: string;
  status?: NfoStatus | string;
  month_num?: number | string;
  year?: number | string;
  scheduled_from?: string | Date;
  scheduled_to?: string | Date;
};

// ritorno "normalizzato" per la UI: separo reports/alerts ma arrivano da una singola chiamata
export async function get_nfoUnseenFeed(
  params: NfoUnseenFeedParams = {}
): Promise<DataResponse<{ items: NfoInfo[]; alerts: NfoInfo[]; reports: NfoInfo[] }>> {
  const payload: Record<string, any> = {
    ...params,
    managed_uid: params.managed_uid ?? undefined,
    scheduled_from: toBackendDate(params.scheduled_from),
    scheduled_to: toBackendDate(params.scheduled_to),
  };

  const response = await requestFunction(
    "/nfo/api/nfo.php",
    "GET",
    "nfo_unseen_feed",
    payload
  );

  if (response.success && Array.isArray(response.data)) {
    const items = response.data as NfoInfo[];
    const alerts = items.filter((x) => x.type === "alert");
    const reports = items.filter((x) => x.type === "report");
    return { response, data: { items, alerts, reports } };
  }

  return { response };
}
