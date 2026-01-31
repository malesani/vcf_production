import { requestFunction, DataResponse, TableDataResponse } from '../../hooks/RequestFunction';
import { TableFilters } from '../../app_components/TableData/interfaces';
import { PortfolioInfo, PortfolioAssets, ManagedType, CustomType } from '../portfolio/constants';
export type { PortfolioInfo, PortfolioAssets, ManagedType, CustomType } from '../portfolio/constants';

// -----------------------------
// Helpers: mapping backend <-> frontend
// Backend fields usati: isDeleted(0/1), isDraft, type, managed_uid,
// assets: symbol, value_now, unitaryPrice_now
// -----------------------------

function parseDate(d?: string | Date): Date | undefined {
  if (!d) return undefined;
  // se arriva già Date la riuso, altrimenti parso
  return d instanceof Date ? d : new Date(d);
}

function parseStatusFromBackend(isDeleted?: boolean | number | string): 'active' | 'deleted' {
  const v = typeof isDeleted === 'string' ? isDeleted.trim() : isDeleted;
  const truthy = v === '1' || v === 1 || v === true;
  return truthy ? 'deleted' : 'active';
}

function parseAssetsFromBackend(rawAssets: any[] | undefined, portfolio_uid: string): PortfolioAssets[] {
  if (!Array.isArray(rawAssets)) return [];
  return rawAssets.map((a) => {
    const unitQuantity = Number(a.unitQuantity ?? 0);
    return {
      portfolio_uid,
      symbol: String(a.symbol),
      unitQuantity,
      // campi “now” arrivano già dal backend
      value_now: a.value_now != null ? Number(a.value_now) : null,
      unitaryPrice_now: a.unitaryPrice_now != null ? Number(a.unitaryPrice_now) : null,
    } as PortfolioAssets;
  });
}


function parsePortfolioFromBackend(raw: any): PortfolioInfo {
  const portfolio_uid = String(raw.portfolio_uid);
  const base: PortfolioInfo = {
    portfolio_uid,
    user_uid: String(raw.user_uid),
    title: String(raw.title ?? ''),
    target: Number(raw.target ?? 0),
    time_horizon_years: Number(raw.time_horizon_years ?? 0),
    cash_position: Number(raw.cash_position ?? 0),
    automatic_savings: Number(raw.automatic_savings ?? 0),
    created_at: parseDate(raw.created_at),
    isDraft: Boolean(raw.isDraft),
    status: parseStatusFromBackend(raw.isDeleted),
    assets: [],
    ...(raw.type === 'managed'
      ? ({ type: 'managed', managed_uid: String(raw.managed_uid ?? '') } as ManagedType)
      : ({ type: 'custom' } as CustomType)),
  };

  base.assets = parseAssetsFromBackend(raw.assets, portfolio_uid);

  // se il backend mette i totals nella riga:
  if (raw.totals) {
    base.totals = {
      cash_position: Number(raw.totals.cash_position ?? 0),
      total_assets_now: Number(raw.totals.total_assets_now ?? 0),
      total_with_cash: Number(raw.totals.total_with_cash ?? 0),
    };
  }

  return base;
}


// Serializzazione per CREATE
function serializeCreatePayload(
  p: Omit<PortfolioInfo, 'portfolio_uid' | 'created_at' | 'status'> & { status?: 'active' | 'deleted' }
) {
  const payload: any = {
    user_uid: p.user_uid,
    title: p.title,
    type: p.type,
    target: p.target,
    time_horizon_years: p.time_horizon_years,
    cash_position: p.cash_position,
    automatic_savings: p.automatic_savings,
    isDraft: p.isDraft,
    managed_title: p.managed_title
  };
  if (p.type === 'managed') {
    payload.managed_uid = (p as ManagedType).managed_uid;
  }
  return payload;
}



// Serializzazione per UPDATE (parziale): inviamo solo i campi mutabili + PK
function serializeUpdatePayload(p: Partial<PortfolioInfo> & { portfolio_uid: string }) {
  // mutabili: title, managed_uid, target, time_horizon_years, cash_position, automatic_savings, isDraft, isRanked
  const payload: any = {
    portfolio_uid: p.portfolio_uid,
  };
  if (p.title !== undefined) payload.title = p.title;
  if ((p as any).managed_uid !== undefined) payload.managed_uid = (p as any).managed_uid;
  if (p.target !== undefined) payload.target = p.target;
  if (p.time_horizon_years !== undefined) payload.time_horizon_years = p.time_horizon_years;
  if (p.cash_position !== undefined) payload.cash_position = p.cash_position;
  if (p.automatic_savings !== undefined) payload.automatic_savings = p.automatic_savings;
  // Se gestisci bozze/rank nel frontend, aggiungi qui:
  if ((p as any).isDraft !== undefined) payload.isDraft = (p as any).isDraft ? 1 : 0;
  // if ((p as any).isRanked !== undefined) payload.isRanked = (p as any).isRanked ? 1 : 0;

  return payload;
}

// -----------------------------
// API layer
// -----------------------------

/** GET singolo */
export async function get_portfolioByUID(
  { portfolio_uid }: { portfolio_uid: string }
): Promise<DataResponse<PortfolioInfo>> {
  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'GET',
    'portfolio_data',
    { portfolio_uid }
  );

  if (response.success && response.data) {
    return { response, data: parsePortfolioFromBackend(response.data) };
  }
  return { response };
}

/** GET assets (prezzi attuali) */
export interface AssetPrice {
  symbol: string;
  currentPrice: number | null;
}
export async function get_assetPrices(
  { portfolio_uid }: { portfolio_uid: string }
): Promise<DataResponse<AssetPrice[]>> {
  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'GET',
    'assetPrices',
    { portfolio_uid }
  );
  if (response.success && response.data) {
    return { response, data: response.data as AssetPrice[] };
  }
  return { response };
}


export type AssetEarning = {
  symbol: string;
  earning_cash: number;
};
export async function get_assetsEarnings(
  { portfolio_uid }: { portfolio_uid: string }
): Promise<DataResponse<AssetEarning[]>> {
  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'GET',
    'assetsEarnings',
    { portfolio_uid }
  );
  if (response.success && response.data) {
    return { response, data: response.data as AssetEarning[] };
  }
  return { response };
}


// -----------------------------
// Lista (non paginata) – stile products.get_productsList
// NB: l’endpoint portfolios_list accetta i filtri come query flat, non {filters: {...}}
// -----------------------------
export async function get_portfoliosList<T = PortfolioInfo>(
  filters: Partial<Record<
    'search' | 'type' | 'user_uid' | 'managed_uid' | 'ranked_only' |
    'created_from' | 'created_to' | 'updated_from' | 'updated_to', string
  >> & Partial<Record<keyof T, string | number>>
): Promise<DataResponse<PortfolioInfo[]>> {

  const withAssets = (filters as any).include_assets ?? 1;
  const withTotals = (filters as any).include_totals ?? 1;

  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'GET',
    'portfolios_list',
    { ...filters, include_assets: withAssets, include_totals: withTotals }
  );

  if (response.success && response.data) {
    const rows = Array.isArray(response.data) ? response.data : (response.data.rows ?? []);
    const data = rows.map(parsePortfolioFromBackend);
    return { response, data };
  }
  return { response };
}

// -----------------------------
// Lista paginata – stile products.get_productsListPaginated
// L’endpoint portfolios_list_paginated restituisce data: { rows, meta }
// -----------------------------
export async function get_portfoliosListPaginated(params: TableFilters<PortfolioInfo>): Promise<TableDataResponse<PortfolioInfo>> {
  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'GET',
    'portfolios_list_paginated',
    { ...params, include_assets: 1, include_totals: 1 } // o 0/1 secondo esigenza
  );
  return response as TableDataResponse<PortfolioInfo>;
}


// -----------------------------
// CREATE – usa opt: 'create_portfolio'
// -----------------------------
export type CreatePortfolioPayload =
  Omit<PortfolioInfo, 'portfolio_uid' | 'created_at' | 'status'> & { status?: 'active' | 'deleted' };

export async function create_portfolio(
  portfolio: CreatePortfolioPayload
): Promise<DataResponse<PortfolioInfo>> {
  const payload = serializeCreatePayload(portfolio);
  console.log(portfolio, "chiamataportafolio")
  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'POST',
    'create_portfolio',
    payload
  );

  if (response.success && response.data) {
    return { response, data: parsePortfolioFromBackend(response.data) };
  }
  return { response };
}

// -----------------------------
// UPDATE – opt: 'update_portfolio' (update parziale)
// -----------------------------
export async function update_portfolio(
  portfolio: Partial<PortfolioInfo> & { portfolio_uid: string }
): Promise<DataResponse<PortfolioInfo>> {
  const payload = serializeUpdatePayload(portfolio);

  const response = await requestFunction(
    '/portfolios/api/portfolio.php',
    'PUT',
    'update_portfolio',
    payload
  );

  if (response.success && response.data) {
    return { response, data: parsePortfolioFromBackend(response.data) };
  }
  return { response };
}
