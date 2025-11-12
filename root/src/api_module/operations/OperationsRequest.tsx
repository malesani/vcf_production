// operations.api.tsx
import { requestFunction, DataResponse } from '../../hooks/RequestFunction';
import { NfoInfo } from '../nfo/NfoData';

/* ===========================
 * TYPES
 * =========================== */

// Modello UI per item NFO: serve indicare anche la sorgente (report|alert)
export type OperationNfo = {
    source: 'report' | 'alert';
    nfo_uid: string;
    unitQuantity: number;
};

export type OperationManual = {
    source: 'manual';
    nfo_uid: undefined;
    unitQuantity?: number; // opzionale lato UI; validato prima della call
};

export type OperationDir = 'buy' | 'sell' | 'deposit' | 'withdraw';

export type OperationChangeImportMonth = {
    portfolio_uid: string;
    day: number;
    automatic_savings: number;
}

// Se vuoi, tieni un simbolo cassa coerente con il backend
export const CASH_SYMBOL = 'CASH_EUR';

// Estendi OperationItem
export type OperationItem = {
    operation_uid?: string;
    portfolio_uid: string;
    symbol: string;              // per cash puoi passare CASH_EUR (verrà ignorato lato BE)
    operation: OperationDir;     // <-- esteso
    unitQuantity: number;        // per cash invia 1 (il backend lo setta comunque a 1)
    unitaryPrice: number;        // importo della movimentazione (EUR)
} & (OperationNfo | OperationManual);

// Righe ritornate dal backend per operazioni ESEGUITE
export type ExecutedOperationRow = {
    company_uid: string;
    operation_uid: string;
    portfolio_uid: string;
    managed_uid?: string | null;
    symbol: string;
    operation: OperationDir;
    unitQuantity: number;
    unitaryPrice: number;
    source?: 'manual' | 'report' | 'alert';
    nfo_uid?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
};

export type ExecutedOperationSelect = {
    portfolio_uid: string;
    symbol: string;
    unitQuantity: number;
    unitaryPrice_lastOp: number;
    unitaryPrice_now: number;
    value_now: number;
};

// Struttura suggerimenti NFO (report)
export type SuggestedReportOps = {
    operations: Array<{
        symbol: string;
        operation: OperationDir;
        unitQuantity: number;
        unitaryPrice: number;
        // opzionale lato risposta; alcuni backend includono già source/nfo_uid dentro le ops
        source?: 'report';
        nfo_uid?: string;
    }>;
    nfo_info: NfoInfo; // deve contenere nfo_uid
    total_value: number;
    cash_now: number;
    report_pct: number;
    cash_target: number;
    warnings: string[];
} | null;

export type SuggestedAlertItem = {
    operations: Array<{
        symbol: string;
        operation: OperationDir;
        unitQuantity: number;
        unitaryPrice: number;
        source?: 'alert';
        nfo_uid?: string;
    }>;
    nfo_info: NfoInfo; // deve contenere nfo_uid
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

// Payload per create (backend) — ora con source/nfo_uid opzionali
type CreateOperationPayload = {
    portfolio_uid: string;
    symbol: string;
    operation: OperationDir;
    unitQuantity: number;
    unitaryPrice: number;
    source?: 'manual' | 'report' | 'alert';
    nfo_uid?: string | null;
};

// Payload per update (backend)
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
    operation?: OperationDir;
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
    const { portfolio_uid } = item;

    if (!portfolio_uid) throw new Error('portfolio_uid mancante');

    const isCash = item.operation === 'deposit' || item.operation === 'withdraw';

    // qty: per cassa forziamo 1; per asset è l’unità reale
    const unitQuantity = isCash
        ? 1
        : (item.source !== 'manual' ? item.unitQuantity : (item as OperationManual).unitQuantity ?? undefined);

    // symbol: per cash mandiamo CASH_EUR (il BE lo ignora e imposta quello interno)
    const symbol = isCash ? CASH_SYMBOL : item.symbol;
    if (!symbol) throw new Error('symbol mancante');

    const base: CreateOperationPayload = {
        portfolio_uid,
        symbol,
        operation: item.operation as any,   // buy|sell|deposit|withdraw
        unitQuantity: Number(unitQuantity),
        unitaryPrice: Number(item.unitaryPrice),
        source: item.source,                // per cash: 'manual' o 'auto' (il BE accetta entrambi)
        nfo_uid: item.nfo_uid
    };

    return base;
}



// Mappa filtri front->back
function mapFiltersToBackend(params: OperationsListFilters) {
    const query: any = {
        portfolio_uid: params.portfolio_uid,
        ...(params.symbol ? { symbol: params.symbol } : {}),
        ...(params.operation ? { operation: params.operation } : {}),
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
): Promise<DataResponse<OperationItem>> {
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
            source: payload.source,
            nfo_uid: payload.nfo_uid
        }
    );

    console.log("payload", payload);


    if (response.success && response.data) {
        return { response, data: response.data as OperationItem };
    }
    return { response };
}

export async function createCashOperation(
    item: OperationItem
): Promise<DataResponse<OperationItem>> {
    item.source = 'manual';
    item.nfo_uid = undefined;
    item.symbol = CASH_SYMBOL;
    item.unitQuantity = 1;
    return createOperation(item);
}

/* ===========================
 * UPSERT
 * =========================== */

export async function updateOperation(
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
        'operation_update',
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

// Helper ALL
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
export type SymbolWeighing = {
    nfo_uid?: string;
    percentage_now: number;
    percentage_suggested: number;
    source: string;
    scheduled_at:"";
    symbol: string;
    unitQuantity_now: number;
    unitQuantity_suggested: number;
    
}
export async function get_validReportWeighing(
    portfolio_uid: string
): Promise<DataResponse<SymbolWeighing[]>> {
    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'valid_report_weighing',
        { portfolio_uid }
    );
    console.log(response)

    if (response.success && response.data) {
        return { response, data: response.data as SymbolWeighing[] };
    }
    return { response };
}

export type AlertWeighing = {
    nfo_uid: string;
    scheduled_at: Date;
    weighing: SymbolWeighing[]
}
export async function get_validAlertsWeighing(
    portfolio_uid: string
): Promise<DataResponse<AlertWeighing[]>> {
    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'valid_alerts_weighing',
        { portfolio_uid }
    );
    console.log(response)

    if (response.success && response.data) {
        return { response, data: response.data as AlertWeighing[] };
    }
    return { response };
}

export async function get_portfolioWeighing(
    portfolio_uid: string
): Promise<DataResponse<SymbolWeighing[]>> {
    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'valid_portfolio_weighing',
        { portfolio_uid }
    );
    console.log(response)

    if (response.success && response.data) {
        return { response, data: response.data as SymbolWeighing[] };
    }
    return { response };
}


export async function fetch_portfolioAlignmentOperations(
    portfolio_uid: string
): Promise<DataResponse<OperationItem[]>> {
    if (!portfolio_uid) throw new Error('portfolio_uid mancante');

    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'portfolio_alignment_operation',
        { portfolio_uid }
    );
    console.log(response)

    if (response.success && response.data) {
        return { response, data: response.data as OperationItem[] };
    }
    return { response };
}

export async function fetchSuggestedOperations(
    portfolio_uid: string
): Promise<DataResponse<OperationItem[]>> {
    if (!portfolio_uid) throw new Error('portfolio_uid mancante');

    const response = await requestFunction(
        '/operations/api/operations.php',
        'GET',
        'portfolio_alignment_operation',
        { portfolio_uid }
    );
    console.log(response)

    if (response.success && response.data) {
        var data = response.data as OperationItem[];
        const filtered = data.filter(item => item.source === "alert");

        return { response, data: filtered };
    }
    return { response };
}


/* ===========================
 * COMFORT HELPERS (UI)
 * =========================== */

// Crea molte operazioni “free” in sequenza (stop alla prima che fallisce)
export async function createOperationsBulkFree(
    items: Array<OperationItem & OperationManual>
): Promise<{ results: Array<DataResponse<OperationItem>>; firstErrorIndex: number | null }> {
    const results: Array<DataResponse<OperationItem>> = [];
    let firstErrorIndex: number | null = null;

    for (let i = 0; i < items.length; i++) {
        const res = await createOperation({ ...items[i] });
        results.push(res);
        if (!res.response.success && firstErrorIndex === null) {
            firstErrorIndex = i;
            break;
        }
    }
    return { results, firstErrorIndex };
}

// Converte un suggerimento (report) in OperationItem “nfo”
export function mapSuggestedReportToItems(
    portfolio_uid: string,
    report: SuggestedReportOps
): OperationItem[] {
    if (!report) return [];
    const nfoUid = report.nfo_info?.nfo_uid;
    return report.operations.map(op => ({
        source: 'report',
        nfo_uid: op.nfo_uid || nfoUid, // preferisci l’eventuale nfo_uid presente nella singola op
        portfolio_uid,
        symbol: op.symbol,
        operation: op.operation,
        unitaryPrice: op.unitaryPrice,
        unitQuantity: op.unitQuantity,
    }));
}

// Converte suggerimenti (alerts) in OperationItem “nfo”, raggruppati per alert_uid
export function mapSuggestedAlertsToItemsByAlert(
    portfolio_uid: string,
    alerts: SuggestedAlertsOps
): Record<string, OperationItem[]> {
    if (!alerts) return {};
    const out: Record<string, OperationItem[]> = {};
    Object.entries(alerts.operations_byAlert).forEach(([alertUid, payload]) => {
        const nfoUid = payload.nfo_info?.nfo_uid || alertUid;
        out[alertUid] = payload.operations.map(op => ({
            source: 'alert',
            nfo_uid: op.nfo_uid || nfoUid,
            portfolio_uid,
            symbol: op.symbol,
            operation: op.operation,
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
 * // Create NFO da report
 * await createOperation({
 *   source: 'report',
 *   nfo_uid: 'NFO-REPORT-123',
 *   portfolio_uid: 'PORT-1',
 *   symbol: 'AAPL',
 *   operation: 'buy',
 *   unitaryPrice: 180.4,
 *   unitQuantity: 5
 * });
 *
 * // Create "free" (manual)
 * await createOperation({
 *   portfolio_uid: 'PORT-1',
 *   symbol: 'AAPL',
 *   operation: 'buy',
 *   unitaryPrice: 180.4,
 *   unitQuantity: 5
 * });
 */
