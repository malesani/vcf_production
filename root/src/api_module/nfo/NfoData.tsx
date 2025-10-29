import { DefaultFilters } from '../../app_components/GeneralTable';
import { requestResponse, requestFunction, DataResponse } from '../../hooks/RequestFunction';

/* ===========================
 * TYPES
 * =========================== */

export interface NfoAsset_Report {
  nfo_uid: string;
  symbol: string;
  percentage: number;
}

export interface NfoAsset_Alert {
  nfo_uid: string;
  symbol: string;
  operator: 'buy' | 'sell';
  percentage: number;
}

export type NfoStatus = 'draft' | 'active' | 'deleted';

export type NfoInfoBase = {
  nfo_uid: string;
  managed_uid: string;
  type: 'alert' | 'report';
  title: string;
  description: string;
  html_body: string;
  status: NfoStatus;
  scheduled_at?: string;   // preferibile string (ISO / 'YYYY-MM-DD HH:mm:ss')
  month_num?: number;
  year?: number;
};

export type NfoInfo =
  | (NfoInfoBase & {
      type: 'report';
      month_num: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
      year: number;
      assets?: NfoAsset_Report[];
    })
  | (NfoInfoBase & {
      type: 'alert';
      assets: NfoAsset_Alert[];
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

/* ===========================
 * GET singolo NFO
 * =========================== */

export async function fetchNfo(
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

export async function fetchNfoAlerts(
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

export async function fetchNfoReports(
  { managed_uid, ...rest }: { managed_uid?: string } & Record<string, any> = {}
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

export async function fetchNfosAll(
  { managed_uid }: { managed_uid?: string }
): Promise<DataResponse<{ alerts: NfoInfo[]; reports: NfoInfo[] }>> {
  const [alertsRes, reportsRes] = await Promise.all([
    fetchNfoAlerts({ managed_uid }),
    fetchNfoReports({ managed_uid })
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
 * CREATE / UPSERT (generici)
 * Backend: data = NfoInfo
 * =========================== */

export type CreateNfoPayload = Omit<NfoInfoBase, 'nfo_uid' | 'status'> &
  (
    | {
        type: 'report';
        month_num: string | number;
        year: number;
        assets?: NfoAsset_Report[];
      }
    | {
        type: 'alert';
        assets: NfoAsset_Alert[];
      }
  );

export async function createNfo(
  nfo: CreateNfoPayload
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
  payload: Partial<NfoInfo> | CreateNfoPayload
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
 * Helper di build payload coerenti
 * =========================== */

const buildReportBodyFromNfo = (nfo: NfoInfo) => ({
  type: 'report' as const,
  ...(nfo.nfo_uid ? { nfo_uid: nfo.nfo_uid } : {}),
  managed_uid: nfo.managed_uid,
  title: nfo.title,
  description: nfo.description,
  html_body: nfo.html_body,
  status: nfo.status,
  scheduled_at: toBackendDate((nfo as any).scheduled_at),
  month_num:
    nfo.month_num !== undefined && nfo.month_num !== null
      ? String(nfo.month_num)
      : undefined,
  year:
    nfo.year !== undefined && nfo.year !== null
      ? Number(nfo.year)
      : undefined,
  assets: Array.isArray((nfo as any).assets)
    ? (nfo as any).assets
        .filter((a: any) => a && a.symbol && a.percentage !== undefined)
        .map((a: any) => ({ symbol: a.symbol, percentage: Number(a.percentage) }))
    : undefined,
});

const buildAlertBodyFromNfo = (nfo: NfoInfo) => ({
  type: 'alert' as const,
  ...(nfo.nfo_uid ? { nfo_uid: nfo.nfo_uid } : {}),
  managed_uid: nfo.managed_uid,
  title: nfo.title,
  description: nfo.description,
  html_body: nfo.html_body,
  status: nfo.status,
  scheduled_at: toBackendDate((nfo as any).scheduled_at),
  assets: Array.isArray((nfo as any).assets)
    ? (nfo as any).assets
        .filter(
          (a: any) =>
            a &&
            a.symbol &&
            (a.operator === 'buy' || a.operator === 'sell') &&
            a.percentage !== undefined
        )
        .map((a: any) => ({
          symbol: a.symbol,
          operator: a.operator,
          percentage: Number(a.percentage),
        }))
    : [],
});

/* ===========================
 * CREATE via NfoInfo
 * =========================== */

export async function createNfo_report(nfo: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const body = buildReportBodyFromNfo(nfo);
  const response = await requestFunction('/nfo/api/nfo.php', 'POST', 'nfo_create', body);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

export async function createNfo_alert(nfo: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const body = buildAlertBodyFromNfo(nfo);
  const response = await requestFunction('/nfo/api/nfo.php', 'POST', 'nfo_create', body);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

/* ===========================
 * UPSERT via NfoInfo
 * =========================== */

export async function upsertNfo_report(nfo: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const body = buildReportBodyFromNfo(nfo);
  const response = await requestFunction('/nfo/api/nfo.php', 'POST', 'nfo_upsert', body);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

export async function upsertNfo_alert(nfo: NfoInfo): Promise<DataResponse<NfoInfo>> {
  const body = buildAlertBodyFromNfo(nfo);
  const response = await requestFunction('/nfo/api/nfo.php', 'POST', 'nfo_upsert', body);
  if (response.success && response.data) {
    return { response, data: response.data as NfoInfo };
  }
  return { response };
}

/* ===========================
 * LISTE parametriche (anche paginate)
 * Backend: opt = nfo_reports_list / nfo_alerts_list
 * =========================== */

type NfoListFilters = {
  managed_uid?: string;
  page?: number;
  per_page?: number;
  status?: NfoStatus | string;
  search?: string;
  month_num?: string | number; // utile per report
  year?: number;
  scheduled_from?: string | Date;
  scheduled_to?: string | Date;
  valid_only?: boolean;
};

export async function fetchNfoListReports(
  params: NfoListFilters
): Promise<DataResponse<NfoInfo[] | { rows: NfoInfo[]; meta: any }>> {
  const query: any = {
    ...params,
    type: 'report',
    ...(params.month_num !== undefined ? { month_num: String(params.month_num) } : {}),
    ...(params.year !== undefined ? { year: Number(params.year) } : {}),
    ...(params.scheduled_from ? { scheduled_from: toBackendDate(params.scheduled_from) } : {}),
    ...(params.scheduled_to   ? { scheduled_to:   toBackendDate(params.scheduled_to) } : {}),
  };

  // se page/per_page sono passati → endpoint paginato
  const opt = query.page || query.per_page ? 'nfo_reports_list_paginated' : 'nfo_reports_list';

  const response = await requestFunction('/nfo/api/nfo.php', 'GET', opt, query);

  if (opt === 'nfo_reports_list' && response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  if (opt === 'nfo_reports_list_paginated' && response.success && response.data?.rows) {
    return { response, data: response.data as { rows: NfoInfo[]; meta: any } };
  }
  return { response };
}

export async function fetchNfoListAlerts(
  params: NfoListFilters
): Promise<DataResponse<NfoInfo[] | { rows: NfoInfo[]; meta: any }>> {
  const query: any = {
    ...params,
    type: 'alert',
    ...(params.scheduled_from ? { scheduled_from: toBackendDate(params.scheduled_from) } : {}),
    ...(params.scheduled_to   ? { scheduled_to:   toBackendDate(params.scheduled_to) } : {}),
  };

  const opt = query.page || query.per_page ? 'nfo_alerts_list_paginated' : 'nfo_alerts_list';

  const response = await requestFunction('/nfo/api/nfo.php', 'GET', opt, query);

  if (opt === 'nfo_alerts_list' && response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  if (opt === 'nfo_alerts_list_paginated' && response.success && response.data?.rows) {
    return { response, data: response.data as { rows: NfoInfo[]; meta: any } };
  }
  return { response };
}

/* ===========================
 * LISTE "ALL" (helper legacy)
 * =========================== */

export async function getNfoListReportsAll(
  args: DefaultFilters
): Promise<DataResponse<NfoInfo[]>> {
  const query: any = { ...args, type: 'report' as const };
  if ('month_num' in args && (args as any).month_num != null) query.month_num = String((args as any).month_num);
  if ('year' in args && (args as any).year != null) query.year = Number((args as any).year);

  const response = await requestFunction('/nfo/api/nfo.php', 'GET', 'nfo_reports_list', query);
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

export async function getNfoListAlertsAll(
  args: DefaultFilters
): Promise<DataResponse<NfoInfo[]>> {
  const query: any = { ...args, type: 'alert' as const };
  const response = await requestFunction('/nfo/api/nfo.php', 'GET', 'nfo_alerts_list', query);
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

/* ===========================
 * GET "tutti" (filtri rapidi) + GET "validi by managed"
 * =========================== */

// Tutti gli ALERT (con filtri opzionali)
export async function getAllAlerts(
  args: { status?: NfoStatus | string; search?: string; scheduled_from?: string|Date; scheduled_to?: string|Date; }
): Promise<DataResponse<NfoInfo[]>> {
  const query = {
    ...args,
    ...(args.scheduled_from ? { scheduled_from: toBackendDate(args.scheduled_from) } : {}),
    ...(args.scheduled_to   ? { scheduled_to:   toBackendDate(args.scheduled_to)   } : {}),
  };
  return fetchNfoAlerts(query as any);
}

// Tutti i REPORT (con filtri opzionali)
export async function getAllReports(
  args: { status?: NfoStatus | string; search?: string; month_num?: number|string; year?: number; scheduled_from?: string|Date; scheduled_to?: string|Date; }
): Promise<DataResponse<NfoInfo[]>> {
  const query = {
    ...args,
    ...(args.month_num !== undefined ? { month_num: String(args.month_num) } : {}),
    ...(args.year      !== undefined ? { year: Number(args.year) } : {}),
    ...(args.scheduled_from ? { scheduled_from: toBackendDate(args.scheduled_from) } : {}),
    ...(args.scheduled_to   ? { scheduled_to:   toBackendDate(args.scheduled_to)   } : {}),
  };
  return fetchNfoReports(query as any);
}

// REPORT validi per managed_uid (status=active && scheduled_at<=now lato backend)
export async function getValidReportsByManaged(
  managed_uid: string
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_reports_list',
    { managed_uid, valid_only: true }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

// ALERT validi per managed_uid
export async function getValidAlertsByManaged(
  managed_uid: string
): Promise<DataResponse<NfoInfo[]>> {
  const response = await requestFunction(
    '/nfo/api/nfo.php',
    'GET',
    'nfo_alerts_list',
    { managed_uid, valid_only: true }
  );
  if (response.success && Array.isArray(response.data)) {
    return { response, data: response.data as NfoInfo[] };
  }
  return { response };
}

/* ===========================
 * CREATE/UPSERT specifici (payload “pulito”)
 * =========================== */

export type CreateAlertInput = {
  managed_uid: string;
  title: string;
  description: string;
  html_body: string;
  assets: NfoAsset_Alert[];
  status?: NfoStatus;           // default backend = 'draft'
  scheduled_at?: string | Date; // opzionale
};

export type CreateReportInput = {
  managed_uid: string;
  title: string;
  description: string;
  html_body: string;
  month_num: number | string;   // 1..12
  year: number;
  assets?: NfoAsset_Report[];
  status?: NfoStatus;           // default backend = 'draft'
  scheduled_at?: string | Date; // opzionale
};

export async function createAlert(input: CreateAlertInput): Promise<DataResponse<NfoInfo>> {
  const body = {
    type: 'alert' as const,
    managed_uid: input.managed_uid,
    title: input.title,
    description: input.description,
    html_body: input.html_body,
    status: input.status,
    scheduled_at: toBackendDate(input.scheduled_at),
    assets: input.assets?.map(a => ({ ...a, percentage: Number(a.percentage) })) ?? [],
  };
  return createNfo(body as any);
}

export async function createReport(input: CreateReportInput): Promise<DataResponse<NfoInfo>> {
  const body = {
    type: 'report' as const,
    managed_uid: input.managed_uid,
    title: input.title,
    description: input.description,
    html_body: input.html_body,
    status: input.status,
    scheduled_at: toBackendDate(input.scheduled_at),
    month_num: String(input.month_num),
    year: Number(input.year),
    assets: input.assets?.map(a => ({ ...a, percentage: Number(a.percentage) })),
  };
  return createNfo(body as any);
}

export async function upsertAlert(
  nfo: Partial<NfoInfo> & { managed_uid: string; assets?: NfoAsset_Alert[]; replace?: boolean; }
): Promise<DataResponse<NfoInfo>> {
  const body = {
    type: 'alert' as const,
    ...(nfo.nfo_uid ? { nfo_uid: nfo.nfo_uid } : {}),
    managed_uid: nfo.managed_uid,
    title: nfo.title,
    description: nfo.description,
    html_body: nfo.html_body,
    status: nfo.status,
    scheduled_at: toBackendDate(nfo.scheduled_at as any),
    assets: nfo.assets?.map(a => ({ ...a, percentage: Number(a.percentage) })) ?? [],
    replace: nfo.replace ?? true,
  };
  return upsertNfo(body as any);
}

export async function upsertReport(
  nfo: Partial<NfoInfo> & { managed_uid: string; month_num?: number|string; year?: number; assets?: NfoAsset_Report[]; replace?: boolean; }
): Promise<DataResponse<NfoInfo>> {
  const body = {
    type: 'report' as const,
    ...(nfo.nfo_uid ? { nfo_uid: nfo.nfo_uid } : {}),
    managed_uid: nfo.managed_uid,
    title: nfo.title,
    description: nfo.description,
    html_body: nfo.html_body,
    status: nfo.status,
    scheduled_at: toBackendDate(nfo.scheduled_at as any),
    month_num: nfo.month_num != null ? String(nfo.month_num) : undefined,
    year: nfo.year != null ? Number(nfo.year) : undefined,
    assets: nfo.assets?.map(a => ({ ...a, percentage: Number(a.percentage) })),
    replace: nfo.replace ?? true,
  };
  return upsertNfo(body as any);
}
