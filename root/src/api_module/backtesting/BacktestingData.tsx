import { requestFunction, DataResponse, TableDataResponse } from '../../hooks/RequestFunction';
import { TableFilters } from '../../app_components/TableData/interfaces';

import { BacktestingInfo, BacktestingAsset } from './constants';
export type { BacktestingInfo, BacktestingAsset } from './constants';

// -----------------------------
// Helpers: mapping backend <-> frontend
// Backend fields usati: isDeleted(0/1), assets: symbol, weight_pct
// -----------------------------
function parseDate(d?: string | Date): Date | undefined {
  if (!d) return undefined;
  return d instanceof Date ? d : new Date(d);
}

function parseStatusFromBackend(isDeleted?: boolean | number | string): 'active' | 'deleted' {
  const v = typeof isDeleted === 'string' ? isDeleted.trim() : isDeleted;
  const truthy = v === '1' || v === 1 || v === true;
  return truthy ? 'deleted' : 'active';
}

function parseAssetsFromBackend(rawAssets: any[] | undefined, backtesting_uid: string): BacktestingAsset[] {
  if (!Array.isArray(rawAssets)) return [];
  return rawAssets.map((a) => ({
    backtesting_uid,
    symbol: String(a.symbol ?? ''),
    weight_pct: Number(a.weight_pct ?? 0),
  }));
}

function parseBacktestingFromBackend(raw: any): BacktestingInfo {
  const backtesting_uid = String(raw.backtesting_uid);

  const info: BacktestingInfo = {
    backtesting_uid,
    user_uid: String(raw.user_uid),
    title: String(raw.title ?? ''),

    target: Number(raw.target ?? 0),
    time_horizon_years: Number(raw.time_horizon_years ?? 0),
    cash_position: Number(raw.cash_position ?? 0),
    automatic_savings: Number(raw.automatic_savings ?? 0),

    created_at: parseDate(raw.created_at),
    updated_at: parseDate(raw.updated_at),

    status: parseStatusFromBackend(raw.isDeleted),
    assets: [],
  };

  info.assets = parseAssetsFromBackend(raw.assets, backtesting_uid);
  return info;
}

// -----------------------------
// Serializzazione payload
// -----------------------------
export type CreateBacktestingPayload =
  Omit<BacktestingInfo, 'backtesting_uid' | 'created_at' | 'updated_at' | 'status' | 'assets'> & {
    assets?: Array<Pick<BacktestingAsset, 'symbol' | 'weight_pct'>>;
  };

function serializeCreatePayload(bt: CreateBacktestingPayload) {
  return {
    user_uid: bt.user_uid, // ✅ aggiungi questa
    title: bt.title,
    target: bt.target,
    time_horizon_years: bt.time_horizon_years,
    cash_position: bt.cash_position,
    automatic_savings: bt.automatic_savings,
    ...(bt.assets ? { assets: bt.assets } : {}),
  };
}

function serializeUpdatePayload(p: Partial<BacktestingInfo> & { backtesting_uid: string }) {
  const payload: any = { backtesting_uid: p.backtesting_uid };

  if (p.title !== undefined) payload.title = p.title;
  if (p.target !== undefined) payload.target = p.target;
  if (p.time_horizon_years !== undefined) payload.time_horizon_years = p.time_horizon_years;
  if (p.cash_position !== undefined) payload.cash_position = p.cash_position;
  if (p.automatic_savings !== undefined) payload.automatic_savings = p.automatic_savings;

  return payload;
}

// -----------------------------
// API layer (usa backtesting.php)
// -----------------------------

/** GET singolo */
export async function get_backtestingByUID(
  { backtesting_uid }: { backtesting_uid: string }
): Promise<DataResponse<BacktestingInfo>> {
  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'GET',
    'backtesting_data',
    { backtesting_uid }
  );

  if (response.success && response.data) {
    return { response, data: parseBacktestingFromBackend(response.data) };
  }
  return { response };
}

/** LIST (non paginata) */
export async function get_backtestingsList(
  filters: Partial<Record<
    'search' | 'created_from' | 'created_to' | 'updated_from' | 'updated_to',
    string
  >> & {
    include_assets?: 0 | 1;
    include_deleted?: 0 | 1;
  }
): Promise<DataResponse<BacktestingInfo[]>> {

  const include_assets = (filters as any).include_assets ?? 1;
  const include_deleted = (filters as any).include_deleted ?? 0;

  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'GET',
    'backtestings_list',
    { ...filters, include_assets, include_deleted }
  );

  if (response.success && response.data) {
    const rows = Array.isArray(response.data) ? response.data : (response.data.rows ?? []);
    const data = rows.map(parseBacktestingFromBackend);
    return { response, data };
  }
  return { response };
}

/** LIST paginata */
export async function get_backtestingsListPaginated(
  params: TableFilters<BacktestingInfo>
): Promise<TableDataResponse<BacktestingInfo>> {
  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'GET',
    'backtestings_list_paginated',
    { ...params, include_assets: 1, include_deleted: 0 }
  );
  return response as TableDataResponse<BacktestingInfo>;
}

/** CREATE */
export async function create_backtesting(
  backtesting: CreateBacktestingPayload
): Promise<DataResponse<{ backtesting_uid: string }>> {
  const payload = serializeCreatePayload(backtesting);

  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'POST',
    'create_backtesting',
    payload
  );

  if (response.success && response.data) {
    return { response, data: response.data as { backtesting_uid: string } };
  }
  return { response };
}

/** UPDATE info */
export async function update_backtesting(
  backtesting: Partial<BacktestingInfo> & { backtesting_uid: string }
): Promise<DataResponse<BacktestingInfo>> {
  const payload = serializeUpdatePayload(backtesting);

  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'PUT',
    'update_backtesting',
    payload
  );

  if (response.success && response.data) {
    return { response, data: parseBacktestingFromBackend(response.data) };
  }
  return { response };
}

/** UPDATE assets (replace) */
export async function update_backtesting_assets(
  params: { backtesting_uid: string; assets: Array<Pick<BacktestingAsset, 'symbol' | 'weight_pct'>> }
): Promise<DataResponse<BacktestingAsset[]>> {
  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'PUT',
    'update_backtesting_assets',
    params
  );

  if (response.success && response.data) {
    const assets = Array.isArray(response.data) ? response.data : [];
    const data: BacktestingAsset[] = assets.map((a: any) => ({
      backtesting_uid: params.backtesting_uid,
      symbol: String(a.symbol ?? ''),
      weight_pct: Number(a.weight_pct ?? 0),
    }));
    return { response, data };
  }
  return { response };
}

/** DELETE (soft delete) */
export async function delete_backtesting(
  { backtesting_uid }: { backtesting_uid: string }
): Promise<DataResponse<{ backtesting_uid: string }>> {
  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'DELETE',
    'delete_backtesting',
    { backtesting_uid }
  );

  if (response.success && response.data) {
    return { response, data: response.data as { backtesting_uid: string } };
  }
  return { response };
}

export type NivoPoint = { x: string; y: number };
export type NivoSerie = { id: string; data: NivoPoint[] };

export type RunBacktestingSeriesResponse = {
  backtesting_uid?: string;
  from: string;
  to: string;
  interval: '1month';
  series: NivoSerie[];
};

export async function run_backtesting_series(
  params: { backtesting_uid: string; years?: number; interval?: '1day' | '1month' }
): Promise<DataResponse<{ series: NivoSerie[]; from: string; to: string; interval: '1day' | '1month'; min_possible_from: string }>> {
  const response = await requestFunction(
    '/backtesting/api/backtesting.php',
    'GET',
    'run_backtesting',
    params
  );

  if (response.success && response.data) return { response, data: response.data as any };
  return { response };
}
