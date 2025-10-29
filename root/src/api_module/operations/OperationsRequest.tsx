// operations.api.tsx
import { requestFunction, DataResponse, requestResponse } from '../../hooks/RequestFunction';
import { NfoInfo } from '../nfo/NfoData';

/* ===========================
 * TYPES
 * =========================== */

// Modello UI per la richiesta di operazione (come da specifica utente)
export type OperationNfo = {
    type: 'nfo';
    nfo_uid: string;
    unitQuantity: number;
};

export type OperationFree = {
    type: 'free';
    unitQuantity?: number; // opzionale lato UI; validato prima della call
};

export type OperationItem = {
    operation_uid?: string;      // valorizzato solo quando riferito a una operazione già eseguita
    portfolio_uid: string;       // Portafoglio di riferimento

    symbol: string;              // Asset su cui eseguire l'operazione
    operator: 'buy' | 'sell';
    unitaryPrice?: number;       // facoltativo lato UI; validato prima della call
} & (OperationNfo | OperationFree);

// Righe ritornate dal backend per operazioni ESEGUITE
export type ExecutedOperationRow = {
    company_uid: string;
    operation_uid: string;
    portfolio_uid: string;
    managed_uid?: string | null;
    symbol: string;
    operation: 'buy' | 'sell';
    unitQuantity: number;
    unitaryPrice: number;
    executed_at?: string | null;
    updated_at?: string | null;
};

// Struttura suggerimenti NFO (report)
export type SuggestedReportOps = {
    operations: Array<{
        symbol: string;
        operation: 'buy' | 'sell';
        unitQuantity: number;
        unitaryPrice: number;
    }>;
    nfo_info: NfoInfo;
    total_value: number;
    cash_now: number;
    report_pct: number;
    cash_target: number;
    warnings: string[];
} | null;

export type SuggestedAlertItem = {
    operations: Array<{
        symbol: string;
        operation: 'buy' | 'sell';
        unitQuantity: number;
        unitaryPrice: number;
    }>;
    nfo_info: NfoInfo;
    warnings: string[];
    alert_title?: string | null;
    scheduled_at?: string | null;
};
// Struttura suggerimenti NFO (alerts)
export type SuggestedAlertsOps = {
    operations_byAlert: Record<string, SuggestedAlertItem>;
    total_value: number;
    cash_now: number;
} | null;

// Payload per create (backend)
type CreateOperationPayload = {
    portfolio_uid: string;
    symbol: string;
    operation: 'buy' | 'sell';
    unitQuantity: number;
    unitaryPrice: number;
};

// Payload per upsert (backend)
type UpsertOperationPayload = {
    portfolio_uid: string;
    operation_uid: string;
    unitQuantity?: number; // consentito solo per portfolio 'custom'
    unitaryPrice?: number;
};

// Filtri GET operazioni eseguite
export type OperationsListFilters = {
    portfolio_uid: string;
    symbol?: string;
    operator?: 'buy' | 'sell';
    from?: string; // 'YYYY-MM-DD HH:mm:ss'
    to?: string;   // 'YYYY-MM-DD HH:mm:ss'
    page?: number;
    per_page?: number;
};

/* ===========================
 * UTILS
 * =========================== */

// Validazione lato client per creare un payload coerente
function buildCreatePayloadFromItem(item: OperationItem): CreateOperationPayload {
    const { portfolio_uid, symbol, operator, unitaryPrice } = item;

    // Quantità: se type='nfo' è obbligatoria nell'item; se 'free' deve essere passata.
    const qty =
        item.type === 'nfo'
            ? item.unitQuantity
            : (item as OperationFree).unitQuantity ?? undefined;

    if (!portfolio_uid) throw new Error('portfolio_uid mancante');
    if (!symbol) throw new Error('symbol mancante');
    if (!operator) throw new Error('operator mancante (buy|sell)');
    if (qty == null || Number(qty) <= 0) throw new Error('unitQuantity mancante o non valida (> 0)');
    if (unitaryPrice == null || Number(unitaryPrice) <= 0) {
        throw new Error('unitaryPrice mancante o non valido (> 0)');
    }

    return {
        portfolio_uid,
        symbol,
        operation: operator,
        unitQuantity: Number(qty),
        unitaryPrice: Number(unitaryPrice),
    };
}

// Mappa filtri front->back
function mapFiltersToBackend(params: OperationsListFilters) {
    const query: any = {
        portfolio_uid: params.portfolio_uid,
        ...(params.symbol ? { symbol: params.symbol } : {}),
        ...(params.operator ? { operation: params.operator } : {}),
        ...(params.from ? { from: params.from } : {}),
        ...(params.to ? { to: params.to } : {}),
    };
    if (params.page != null) query.page = Number(params.page);
    if (params.per_page != null) query.per_page = Number(params.per_page);
    return query;
}

/* ===========================
 * CREATE
 * =========================== */

export async function createOperation(
    item: OperationItem
): Promise<DataResponse<ExecutedOperationRow>> {
    const payload = buildCreatePayloadFromItem(item);

    const response = await requestFunction(
        '/operations/api/operations.php',
        'POST',
        'operation_create',
        {
            portfolio_uid: payload.portfolio_uid,
            symbol: payload.symbol,
            operation: payload.operation,
            unitQuantity: payload.unitQuantity,
            unitaryPrice: payload.unitaryPrice,
        }
    );

    if (response.success && response.data) {
        return { response, data: response.data as ExecutedOperationRow };
    }
    return { response };
}

/* ===========================
 * UPSERT
 * =========================== */

export async function upsertOperation(
    args: UpsertOperationPayload
): Promise<DataResponse<ExecutedOperationRow>> {
    const { portfolio_uid, operation_uid, unitQuantity, unitaryPrice } = args;

    if (!portfolio_uid) throw new Error('portfolio_uid mancante');
    if (!operation_uid) throw new Error('operation_uid mancante');
    if (unitQuantity == null && unitaryPrice == null) {
        throw new Error('Almeno uno tra unitQuantity o unitaryPrice deve essere valorizzato');
    }

    const response = await requestFunction(
        '/operations/api/operations.php',
        'PUT',
        'operation_upsert',
        {
            portfolio_uid,
            operation_uid,
            ...(unitQuantity != null ? { unitQuantity: Number(unitQuantity) } : {}),
            ...(unitaryPrice != null ? { unitaryPrice: Number(unitaryPrice) } : {}),
        }
    );

    if (response.success && response.data) {
        return { response, data: response.data as ExecutedOperationRow };
    }
    return { response };
}

/* ===========================
 * GET operazioni eseguite
 * =========================== */

// Paginate
export async function fetchOperationsPaginated(
    params: OperationsListFilters
): Promise<
    DataResponse<{
        rows: ExecutedOperationRow[];
        meta: { items_num: number; pages_num: number; page: number; per_page: number };
    }>
> {
    const query = mapFiltersToBackend(params);

    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'operations_list_paginated',
        query
    );

    if (response.success && response.data?.rows) {
        return {
            response,
            data: response.data as {
                rows: ExecutedOperationRow[];
                meta: { items_num: number; pages_num: number; page: number; per_page: number };
            },
        };
    }
    return { response };
}

// Helper ALL: prende la prima pagina con per_page alto (se vuoi una vera all-pages, implementa pagina­zione lato chiamante)
export async function fetchOperationsAll(
    params: Omit<OperationsListFilters, 'page' | 'per_page'> & { per_page?: number }
): Promise<DataResponse<ExecutedOperationRow[]>> {
    const perPage = params.per_page ?? 1000;
    const { response, data } = await fetchOperationsPaginated({ ...params, page: 1, per_page: perPage });
    if (response.success && data?.rows) {
        return { response, data: data.rows as ExecutedOperationRow[] };
    }
    return { response };
}

/* ===========================
 * GET operazioni CONSIGLIATE (NFO)
 * =========================== */

export type SuggestedOperationsResponse = {
    report_operations: SuggestedReportOps;
    alert_operations: SuggestedAlertsOps;
};

export async function fetchSuggestedOperations(
    portfolio_uid: string
): Promise<DataResponse<SuggestedOperationsResponse>> {
    if (!portfolio_uid) throw new Error('portfolio_uid mancante');

    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'operations_suggested_from_nfo',
        { portfolio_uid }
    );

    if (response.success && response.data) {
        return { response, data: response.data as SuggestedOperationsResponse };
    }
    return { response };
}

/* ===========================
 * COMFORT HELPERS (UI)
 * =========================== */

// Crea molte operazioni “free” in sequenza (stop alla prima che fallisce)
export async function createOperationsBulkFree(
    items: Array<Omit<OperationItem, 'type'> & OperationFree>
): Promise<{ results: Array<DataResponse<ExecutedOperationRow>>; firstErrorIndex: number | null }> {
    const results: Array<DataResponse<ExecutedOperationRow>> = [];
    let firstErrorIndex: number | null = null;

    for (let i = 0; i < items.length; i++) {
        const res = await createOperation({ ...items[i], type: 'free' });
        results.push(res);
        if (!res.response.success && firstErrorIndex === null) {
            firstErrorIndex = i;
            break;
        }
    }
    return { results, firstErrorIndex };
}

// Converte un suggerimento (report) in OperationItem “free”
export function mapSuggestedReportToItems(
    portfolio_uid: string,
    report: SuggestedReportOps
): OperationItem[] {
    if (!report) return [];
    return report.operations.map(op => ({
        type: 'free',
        portfolio_uid,
        symbol: op.symbol,
        operator: op.operation,
        unitaryPrice: op.unitaryPrice,
        unitQuantity: op.unitQuantity,
    }));
}

// Converte suggerimenti (alerts) in OperationItem “free”, raggruppati per alert_uid
export function mapSuggestedAlertsToItemsByAlert(
    portfolio_uid: string,
    alerts: SuggestedAlertsOps
): Record<string, OperationItem[]> {
    if (!alerts) return {};
    const out: Record<string, OperationItem[]> = {};
    Object.entries(alerts.operations_byAlert).forEach(([alertUid, payload]) => {
        out[alertUid] = payload.operations.map(op => ({
            type: 'free',
            portfolio_uid,
            symbol: op.symbol,
            operator: op.operation,
            unitaryPrice: op.unitaryPrice,
            unitQuantity: op.unitQuantity,
        }));
    });
    return out;
}

/* ===========================
 * ESEMPIO D’USO (comment)
 * ===========================
 *
 * // Create singola
 * await createOperation({
 *   type: 'free',
 *   portfolio_uid: 'PORT-1',
 *   symbol: 'AAPL',
 *   operator: 'buy',
 *   unitaryPrice: 180.4,
 *   unitQuantity: 5
 * });
 *
 * // Upsert singolo
 * await upsertOperation({
 *   portfolio_uid: 'PORT-1',
 *   operation_uid: 'OP-XYZ',
 *   unitQuantity: 6,
 *   unitaryPrice: 179.9
 * });
 *
 * // Lista paginata
 * await fetchOperationsPaginated({
 *   portfolio_uid: 'PORT-1',
 *   page: 1,
 *   per_page: 25,
 *   operator: 'buy',
 *   from: '2025-01-01 00:00:00',
 * });
 *
 * // Suggerite NFO
 * const suggested = await fetchSuggestedOperations('PORT-1');
 * if (suggested.data?.report_operations) {
 *   const items = mapSuggestedReportToItems('PORT-1', suggested.data.report_operations);
 *   // puoi proporle in UI ed eventualmente inviarle a createOperation una ad una
 * }
 */
