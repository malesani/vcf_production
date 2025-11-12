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
  const response = await requestFunction('/nfo/api/nfo.php', 'POST', 'nfo_create', payload);
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