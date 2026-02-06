import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    MDBContainer,
    MDBRow,
    MDBCol,
    MDBCard,
    MDBCardBody,
    MDBBtn,
    MDBIcon,
    MDBCardFooter,
    MDBBadge,
    MDBTable,
    MDBTableBody,
    MDBTableHead,
    MDBProgress,
    MDBProgressBar,
    MDBModal,
    MDBModalBody,
    MDBModalContent,
    MDBModalDialog,
    MDBModalHeader,
    MDBModalTitle,
    MDBModalFooter,
    MDBSelect,
    MDBInput,
    MDBRange,
    MDBAlert,
} from "mdb-react-ui-kit";

import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { useParams } from "react-router-dom";
import { useIsMobile } from "../app_components/ResponsiveModule";
import {
    update_backtesting_assets,
    update_backtesting,
    get_backtestingByUID,
    run_backtesting_series,
    delete_backtesting,
} from "../api_module/backtesting/BacktestingData";
import { BacktestingInfo } from "../api_module/backtesting/constants";
import { getStocksInfo } from "../api_module_v1/FinancialDataRequest";
import { APIStockInfo } from "../api_module_v1/FinancialDataRequest";
import { General_Loading } from "../app_components/General_Loading";
import { useNavigate } from "react-router-dom";

type Point = { x: string; y: number };
type Serie = { id: string; data: Point[] };

/** ==================== SECTION HEADER ==================== */
function SectionHeader({
    ui,
    title,
    subtitle,
    icon = "chart-column",
    right,
    onEdit,
}: {
    ui: any;
    title: string;
    subtitle?: string;
    icon?: string;
    right?: React.ReactNode;
    onEdit?: () => void;
}) {
    return (
        <div
            className={`${ui.headerPadClass} d-flex justify-content-between align-items-center`}
            style={{
                backgroundColor: "rgb(38, 53, 80)",
                color: "white",
                borderTopRightRadius: "0.75rem",
                borderTopLeftRadius: "0.75rem",
                gap: 12,
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center">
                    <MDBIcon fas icon={icon} className="me-2 fs-5 text-white" />
                    <span className="fw-bold" style={ui.hSection}>
                        {title}
                    </span>
                </div>
                {subtitle && (
                    <small className="text-white-50" style={ui.subSection}>
                        {subtitle}
                    </small>
                )}
            </div>

            {right ? <div className="flex-shrink-0">{right}</div> : null}

            {onEdit ? (
                <MDBBtn className="py-2" color="secondary" onClick={onEdit}>
                    edit
                </MDBBtn>
            ) : null}
        </div>
    );
}

/** ==================== STAT CARD ==================== */
function StatCard({ ui, label, value }: { ui: any; label: string; value: string }) {
    return (
        <MDBCard className="shadow-sm rounded-4 border-0 h-100">
            <MDBCardBody style={{ padding: 12 }}>
                <div className="text-muted" style={{ ...ui.textSmall, fontSize: 12 }}>
                    {label}
                </div>
                <div className="fw-bold" style={{ ...ui.textBody, marginTop: 4 }}>
                    {value}
                </div>
            </MDBCardBody>
        </MDBCard>
    );
}

/** ==================== MODAL ASSETS TYPES ==================== */
type AssetRow = {
    key: string;
    symbol: string;
    weight_pct: number;
};

const genKey = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k_${Date.now()}_${Math.random()}`;

const makeRow = (seed?: Partial<AssetRow>): AssetRow => ({
    key: genKey(),
    symbol: seed?.symbol ?? "Cerca Asset",
    weight_pct: seed?.weight_pct ?? 0,
});

const BacktestingItem: React.FC = () => {
    const { bt_item_uid } = useParams<{ bt_item_uid: string }>();
    const isMobile = useIsMobile(992);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // state
    const [title, setTitle] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [investimentoIniziale, setInvestimentoInizialeProp] = useState<number>();
    const [contributoMensile, setContributoMensile] = useState<number>();
    const [tempoInvestimento, setTempoInvestimento] = useState<number>();
    const [maxTempoInvestimento, setMaxTempoInvestimento] = useState<number>();

    // states calcoli di badges
    const [importoInvestito, setImportoInvestito] = useState<number>();

    // stato backtest backtestRes.data => bt
    const [backtest, setBacktest] = useState<BacktestingInfo | null>(null);

    // stato bt.assets = gli assets di backtest
    const [assetsDb, setAssetsDb] = useState<Array<{ symbol: string; weight_pct: number }>>([]);

    // risultato data per nivo backtesting
    const [miniDataDb, setMiniDataDb] = useState<Serie[]>([]);
    const [withoutSaving, setWithoutSaving] = useState<Serie[]>([]);

    /** ======= modal editor state ======= */
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [savingAssets, setSavingAssets] = useState(false);

    // per generare le rows vuote e con dati caricati
    const [assetRows, setAssetRows] = useState<AssetRow[]>([]);

    // per save blocco sinistra
    const [savingParams, setSavingParams] = useState(false);

    // per caricamento e pre caricamento dati del edit degli assets
    const [stocksInfoOptions, setStocksInfoOptions] = useState<APIStockInfo[]>([]);
    const [query, setQuery] = useState<String>("");

    /** ===== delete modal state ===== */
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const toggleDeleteModal = () => setDeleteModalOpen((v) => !v);

    const totalAllocation = assetsDb.reduce((acc, f) => acc + f.weight_pct, 0);

    const toggleModal = () => setModalOpen((v) => !v);

    const dataPie = useMemo(() => {
        // se non ho asset -> 100% liquidità
        if (!assetsDb || assetsDb.length === 0) {
            return [{ id: "liquidita", label: "liquidità", value: 100 }];
        }

        // altrimenti pie dagli asset
        return assetsDb.map((a) => ({
            id: a.symbol,
            label: a.symbol,
            value: a.weight_pct,
        }));
    }, [assetsDb]);

    const ui = useMemo(() => {
        return {
            hSection: { fontSize: isMobile ? "14px" : "1rem" },
            subSection: { fontSize: isMobile ? "11px" : "0.8rem" },
            hCardTitle: { fontSize: isMobile ? "13px" : "" },
            pill: { fontSize: isMobile ? "10px" : "0.75rem" },
            textSmall: { fontSize: isMobile ? "12px" : "" },
            textBody: { fontSize: isMobile ? "13px" : "0.95rem" },
            numberBig: { fontSize: isMobile ? "1.6rem" : "2rem" },

            headerPadClass: isMobile ? "p-3" : "p-3 py-md-3 px-md-4",
            bodyPadClass: isMobile ? "p-3" : "p-3 p-md-4",

            label: { color: "#21384A", fontWeight: 700, fontSize: isMobile ? "12px" : "13px" },
        };
    }, [isMobile]);

    ///////////////////////////////////////////////////
    const isMountedRef = useRef(true);

    useEffect(() => {
        // guard: evita crash se miniDataDb è vuoto o non ha data
        if (!miniDataDb?.length || !miniDataDb[0]?.data?.length) return;

        const num_of_records = miniDataDb[0].data.length;

        const without_saving_raw: Serie[] = [
            {
                id: "Senza Investire",
                data: [],
            },
        ];

        for (let i = 0; i < num_of_records; i++) {
            without_saving_raw[0].data.push({
                x: miniDataDb[0].data[i].x,
                y: (investimentoIniziale ?? 0) + i * (contributoMensile ?? 0),
            });
        }

        setWithoutSaving(without_saving_raw);
    }, [miniDataDb, investimentoIniziale, contributoMensile]);

    const loadStocksInfo = useCallback(async () => {
        try {
            const resp = await getStocksInfo();
            if (resp.response.success && resp.data && isMountedRef.current) {
                setStocksInfoOptions(
                    resp.data.map((stockInfo) => ({
                        symbol: stockInfo.symbol,
                        name: `${stockInfo.name} (${stockInfo.symbol})`,
                    }))
                );
            }
        } catch (err) {
            console.error("Errore caricamento Stocks Info:", err);
        }
    }, []);

    const loadBacktest = useCallback(async (uid: string) => {
        try {
            const backtestRes = await get_backtestingByUID({ backtesting_uid: uid });
            if (!isMountedRef.current) return;

            const bt = backtestRes?.response?.success && backtestRes.data ? backtestRes.data : null;
            setBacktest(bt);

            if (!bt) {
                setAssetsDb([]);
                setMiniDataDb([]);
                return;
            }

            setInvestimentoInizialeProp(bt.cash_position);
            setContributoMensile(bt.automatic_savings);
            setTitle(bt.title);
            setTempoInvestimento(bt.time_horizon_years ? bt.time_horizon_years : 1);

            setImportoInvestito(bt.cash_position + bt.automatic_savings * 12 * (bt.time_horizon_years - 1));

            const dbAssets = Array.isArray(bt.assets)
                ? bt.assets
                    .map((a: any) => ({
                        symbol: String(a.symbol ?? "").trim(),
                        weight_pct: Number(a.weight_pct ?? 0),
                    }))
                    .filter((a) => a.symbol && Number.isFinite(a.weight_pct) && a.weight_pct > 0)
                : [];

            setAssetsDb(dbAssets);

            const years = Number(bt.time_horizon_years ?? 1);
            const safeYears = Number.isFinite(years) && years > 0 ? years : 1;

            const seriesRes = await run_backtesting_series({
                backtesting_uid: uid,
                years: safeYears,
                interval: "1month",
            });

            if (!isMountedRef.current) return;

            if (!seriesRes.response.success || !seriesRes.data?.series) {
                setMiniDataDb([]);
                return;
            }

            const lastDatePossible = new Date(seriesRes.data.min_possible_from).getFullYear();
            const currentYear = new Date().getFullYear();
            const maxData = currentYear - lastDatePossible > 40 ? 40 : currentYear - lastDatePossible;
            const portfolioSerie =
                seriesRes.data.series.find((s) => String(s.id).toLowerCase() === "portfolio") ??
                seriesRes.data.series.find((s) => String(s.id).toLowerCase() === "portf") ??
                seriesRes.data.series[0];

            setMiniDataDb(portfolioSerie ? ([portfolioSerie as Serie] as Serie[]) : []);

            setMaxTempoInvestimento(maxData);
        } catch (err) {
            console.error("Errore caricamento backtesting", err);
            if (isMountedRef.current) {
                setAssetsDb([]);
                setMiniDataDb([]);
            }
        }
    }, []);

    const loadAll = useCallback(
        async (uid: string) => {
            setLoading(true);
            try {
                await Promise.all([loadStocksInfo(), loadBacktest(uid)]);
            } finally {
                if (isMountedRef.current) setLoading(false);
            }
        },
        [loadStocksInfo, loadBacktest]
    );

    useEffect(() => {
        if (!bt_item_uid) return;
        loadAll(bt_item_uid);
    }, [bt_item_uid, loadAll]);

    const stocksInfoOptions50 = useMemo(() => {
        const q = (query ?? "").toString().trim().toLowerCase();

        const filtered = q.length === 0 ? stocksInfoOptions : stocksInfoOptions.filter((opt) => opt.name.toLowerCase().includes(q) || opt.symbol.toLowerCase().includes(q));

        // simboli già selezionati nelle righe
        const selectedSymbols = new Set(assetRows.map((r) => r.symbol).filter(Boolean));

        // lookup veloce
        const bySymbol = new Map(stocksInfoOptions.map((o) => [o.symbol, o] as const));

        // merge + dedupe O(n) con Map
        const merged = new Map<string, APIStockInfo>();

        // prima metto i selezionati (così entrano sempre nei 50)
        for (const sym of selectedSymbols) {
            const opt = bySymbol.get(sym) ?? { symbol: sym, name: sym };
            merged.set(sym, opt);
        }

        // poi il filtered
        for (const opt of filtered) {
            if (!merged.has(opt.symbol)) merged.set(opt.symbol, opt);
            if (merged.size >= 50) break;
        }

        return Array.from(merged.values());
    }, [stocksInfoOptions, assetRows, query]);

    const selectData50 = useMemo(
        () =>
            stocksInfoOptions50.map((opt) => ({
                text: opt.name,
                value: opt.symbol,
            })),
        [stocksInfoOptions50]
    );

    const lastQRef = useRef("");

    const searchFn = useCallback((q: string, data: any[]) => {
        const qq = (q ?? "").toLowerCase().trim();

        if (q !== lastQRef.current) {
            lastQRef.current = q;
            setQuery(q);
        }

        const filtered =
            qq.length === 0
                ? data
                : data.filter(
                    (opt) =>
                        String(opt.text ?? "").toLowerCase().includes(qq) || String(opt.value ?? "").toLowerCase().includes(qq)
                );

        return filtered.slice(0, 50);
    }, []);

    /** ==================== PRELOAD ROWS WHEN MODAL OPENS ==================== */
    useEffect(() => {
        if (!modalOpen) return;
        setAssetRows(assetsDb.length ? assetsDb.map((a) => makeRow({ symbol: a.symbol, weight_pct: a.weight_pct })) : [makeRow()]);
    }, [modalOpen, assetsDb]); // eslint-disable-line react-hooks/exhaustive-deps

    /** ==================== ROW HANDLERS ==================== */
    const addEmptyRow = () => setAssetRows((prev) => [...prev, makeRow()]);

    const removeRow = (key: string) => setAssetRows((prev) => prev.filter((r) => r.key !== key));

    const updateRow = (key: string, patch: Partial<AssetRow>) =>
        setAssetRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

    const totalWeight = useMemo(() => assetRows.reduce((acc, r) => acc + (Number(r.weight_pct) || 0), 0), [assetRows]);

    /** ==================== SAVE ASSETS ==================== */
    const handleSaveAssetsFromModal = async () => {
        if (!bt_item_uid) return;

        // limpia + valida básico
        const cleaned = assetRows
            .map((r) => ({
                symbol: String(r.symbol ?? "").trim().toUpperCase(),
                weight_pct: Number(r.weight_pct ?? 0),
            }))
            .filter((a) => a.symbol && Number.isFinite(a.weight_pct) && a.weight_pct > 0);

        // merge duplicados (suma pesos)
        const mergedMap = new Map<string, number>();
        for (const a of cleaned) mergedMap.set(a.symbol, (mergedMap.get(a.symbol) ?? 0) + a.weight_pct);

        const merged = Array.from(mergedMap.entries()).map(([symbol, weight_pct]) => ({ symbol, weight_pct }));

        try {
            setSavingAssets(true);

            const res = await update_backtesting_assets({
                backtesting_uid: bt_item_uid,
                assets: merged,
            });

            console.log("SAVE ASSETS RESULT:", res);

            setAssetsDb(merged);
            loadAll(bt_item_uid);
            setModalOpen(false);
        } catch (err) {
            console.error("Errore salvataggio assets", err);
        } finally {
            setSavingAssets(false);
        }
    };

    /** ==================== SAVE Normal Params ==================== */
    const handleSaveParams = async () => {
        if (!bt_item_uid) return;
        setSavingParams(true);
        try {
            const payload = {
                backtesting_uid: bt_item_uid,
                title: title.trim(),
                description: description.trim(),
                cash_position: investimentoIniziale,
                automatic_savings: contributoMensile,
                time_horizon_years: tempoInvestimento,
            };

            const res = await update_backtesting(payload);

            console.log("UPDATE BACKTESTING RESULT:", res);

            if (res.response.success) {
                setBacktest((prev) => (prev ? ({ ...prev, ...payload } as any) : (payload as any)));
            }
            loadAll(bt_item_uid);
        } catch (err) {
            console.error("Errore update_backtesting", err);
        } finally {
            setSavingParams(false);
        }
    };

    const handleChangeRowSymbol = (rowKey: string, selected: any) => {
        const item = Array.isArray(selected) ? selected[0] : selected;
        const newSymbol = item?.value ? String(item.value) : "";
        if (!newSymbol) return;
        updateRow(rowKey, { symbol: newSymbol });
    };

    /** ==================== DELETE CONFIRM ==================== */
    const handleConfirmDelete = async () => {
        if (!bt_item_uid) return;

        try {
            setDeleting(true);
            const resp = await delete_backtesting({ backtesting_uid: bt_item_uid });

            console.log("DELETE BACKTESTING RESULT:", resp);

            if (!resp?.response?.success) {
                console.error("Delete failed:", resp);
                return; // NON navigare se fallisce
            }

            setDeleteModalOpen(false);
            navigate(`/backtesting`);
        } catch (err) {
            console.error("Errore delete_backtesting", err);
        } finally {
            setDeleting(false);
        }
    };

    /** ==================== UI ==================== */
    return (
        <>
            <MDBContainer fluid className="py-3 py-md-4 px-0">
                {/* PAGE HEADER */}
                <MDBRow className="g-3 mb-4">
                    <MDBCol xs="12" className="d-flex justify-content-between">
                        <div>
                            <div className="fw-bold" style={{ fontSize: isMobile ? 20 : 28, color: "#111827" }}>
                                {backtest?.title}
                            </div>
                            <div className="text-muted" style={ui.textBody}>
                                {backtest?.description}
                            </div>
                        </div>

                        {backtest && (
                            <MDBBtn onClick={toggleDeleteModal} className="me-1 px-3 py-1" color="danger">
                                <MDBIcon fas icon="trash" className={!isMobile ? "me-2" : ""} />
                                {!isMobile ? "Elimina" : ""}
                            </MDBBtn>
                        )}
                    </MDBCol>
                </MDBRow>

                {/* TOP GRID */}
                <MDBRow className="g-3 mb-4 align-items-stretch">
                    {/* LEFT */}
                    <MDBCol xs="12" lg="6">
                        <MDBCard className="shadow-sm rounded-4 border-0 h-100">
                            <SectionHeader ui={ui} icon="sliders-h" title="Parametri" subtitle="Imposta i valori della simulazione" />
                            {loading ? (
                                <General_Loading />
                            ) : (
                                <MDBCardBody className={ui.bodyPadClass}>
                                    <div className="d-flex justify-content-center">
                                        <div style={{ width: "100%", maxWidth: 520 }}>
                                            <div className={ui.bodyPadClass}>
                                                <div className="d-flex justify-content-center">
                                                    <div style={{ width: "100%", maxWidth: 520 }}>
                                                        <MDBRow className="g-3">
                                                            <MDBCol md="12">
                                                                <MDBInput label="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
                                                            </MDBCol>

                                                            <MDBCol md="12">
                                                                <MDBInput
                                                                    label="Descrizione"
                                                                    value={description}
                                                                    onChange={(e) => setDescription(e.target.value)}
                                                                />
                                                            </MDBCol>

                                                            <MDBCol md="12">
                                                                <MDBInput
                                                                    label="Totale Investito"
                                                                    type="number"
                                                                    min={0}
                                                                    step={1}
                                                                    value={String(investimentoIniziale ?? 0)}
                                                                    onChange={(e) => setInvestimentoInizialeProp(Number(e.target.value))}
                                                                />
                                                            </MDBCol>

                                                            <MDBCol md="12">
                                                                <MDBInput
                                                                    label="Contributo Mensile"
                                                                    type="number"
                                                                    min={0}
                                                                    step={1}
                                                                    value={String(contributoMensile ?? 0)}
                                                                    onChange={(e) => setContributoMensile(Number(e.target.value))}
                                                                />
                                                            </MDBCol>

                                                            <MDBCol xs="12" md="12">
                                                                <label className="form-label fw-bold" style={ui.label}>
                                                                    Orizzonte passato: {tempoInvestimento} anni
                                                                </label>
                                                                <MDBRange
                                                                    min="1"
                                                                    max={maxTempoInvestimento}
                                                                    value={String(tempoInvestimento ?? 1)}
                                                                    onChange={(e) => setTempoInvestimento(Number(e.target.value))}
                                                                />
                                                            </MDBCol>

                                                            <MDBCol md="12" className="d-flex justify-content-center gap-2 mt-2">
                                                                <MDBBtn
                                                                    color="light"
                                                                    className="border w-50"
                                                                    onClick={() => {
                                                                        if (!backtest) return;
                                                                        setTitle(backtest.title ?? "");
                                                                        setDescription(backtest.description ?? "");
                                                                        setInvestimentoInizialeProp(Number(backtest.cash_position ?? 0));
                                                                        setContributoMensile(Number(backtest.automatic_savings ?? 0));
                                                                        setTempoInvestimento(Number(backtest.time_horizon_years ?? 1));
                                                                    }}
                                                                >
                                                                    Reset
                                                                </MDBBtn>

                                                                <MDBBtn className="w-50" onClick={handleSaveParams} disabled={savingParams || !bt_item_uid}>
                                                                    {savingParams ? "Salvataggio..." : "Salva le modifiche"}
                                                                </MDBBtn>
                                                            </MDBCol>
                                                        </MDBRow>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </MDBCardBody>
                            )}
                        </MDBCard>
                    </MDBCol>

                    {/* RIGHT */}
                    <MDBCol xs="12" lg="6">
                        <MDBCard className="loading shadow-sm rounded-4 border-0 h-100" style={{ overflow: "hidden" }}>
                            <SectionHeader
                                ui={ui}
                                icon="chart-pie"
                                title="Allocazione Portafoglio"
                                subtitle={`Allocazione totale: ${totalAllocation}%`}
                                onEdit={() => setModalOpen(true)}
                            />

                            {loading ? (
                                <General_Loading />
                            ) : (
                                <>
                                    <MDBCardBody className={ui.bodyPadClass}>
                                        <div style={{ width: "100%", height: isMobile ? 220 : 260 }}>
                                            <ResponsivePie
                                                data={dataPie}
                                                margin={isMobile ? { top: 10, right: 10, bottom: 50, left: 10 } : { top: 10, right: 10, bottom: 70, left: 10 }}
                                                innerRadius={0.7}
                                                padAngle={0.6}
                                                cornerRadius={2}
                                                activeOuterRadiusOffset={8}
                                                enableArcLinkLabels={false}
                                                enableArcLabels={false}
                                                legends={[
                                                    {
                                                        anchor: "bottom",
                                                        direction: "row",
                                                        translateY: isMobile ? 38 : 55,
                                                        itemWidth: 80,
                                                        itemHeight: 18,
                                                        itemsSpacing: 10,
                                                        symbolSize: 10,
                                                        symbolShape: "circle",
                                                    },
                                                ]}
                                            />
                                        </div>
                                    </MDBCardBody>

                                    <MDBCardFooter className="pt-0 pb-3 px-3 px-md-4" style={{ border: "none" }}>
                                        <MDBTable align="middle" hover responsive small className="mb-0">
                                            <MDBTableHead>
                                                <tr style={{ fontSize: isMobile ? 12 : 13 }}>
                                                    <th>Fondo</th>
                                                    <th>Assegnazione</th>
                                                </tr>
                                            </MDBTableHead>

                                            <MDBTableBody style={{ fontSize: isMobile ? 12 : 13 }}>
                                                {assetsDb.map((fund) => (
                                                    <tr key={fund.symbol}>
                                                        <td style={{ minWidth: isMobile ? 160 : 220 }}>
                                                            <div className="fw-semibold" style={{ lineHeight: 1.2 }}>
                                                                {fund.symbol}
                                                            </div>
                                                        </td>
                                                        <td style={{ minWidth: isMobile ? 120 : 160 }}>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <MDBProgress height="6" className="flex-grow-1">
                                                                    <MDBProgressBar width={fund.weight_pct} />
                                                                </MDBProgress>
                                                                <small>{fund.weight_pct}%</small>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </MDBTableBody>
                                        </MDBTable>
                                    </MDBCardFooter>
                                </>
                            )}
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* LINE CHART */}
                {miniDataDb.length > 0 && (
                    <>
                        <MDBRow className="g-3 mb-4">
                            <MDBCol xs="12">
                                <MDBCard className="shadow-sm rounded-4 border-0">
                                    <SectionHeader ui={ui} icon="chart-line" title="Andamento storico" subtitle="Risultati della strategia nel tempo" />
                                    <MDBCardBody className={ui.bodyPadClass}>
                                        {loading ? (
                                            <General_Loading />
                                        ) : (
                                            <div style={{ width: "100%", height: isMobile ? 300 : 400 }}>
                                                <div className="d-flex align-items-center justify-content-between mb-2">
                                                    <div className="small text-muted">Andamento (DB) - Assets + Portfolio</div>

                                                    <div className="d-flex gap-2 flex-wrap justify-content-end">
                                                        {assetsDb.length > 0 ? (
                                                            assetsDb.map((a) => (
                                                                <MDBBadge key={a.symbol} color="light" className="text-dark border">
                                                                    {a.symbol} {a.weight_pct}%
                                                                </MDBBadge>
                                                            ))
                                                        ) : (
                                                            <MDBBadge color="warning" light>
                                                                Nessun asset nel DB
                                                            </MDBBadge>
                                                        )}
                                                    </div>
                                                </div>

                                                <ResponsiveLine
                                                    data={[withoutSaving[0], miniDataDb[0]]}
                                                    margin={isMobile ? { top: 20, right: 20, bottom: 60, left: 40 } : { top: 30, right: 30, bottom: 60, left: 60 }}
                                                    xScale={{ type: "point" }}
                                                    yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
                                                    axisBottom={null}
                                                    enableGridY={false}
                                                    pointSize={isMobile ? 4 : 6}
                                                    useMesh={true}
                                                    enableSlices="x"
                                                    colors={["rgb(228,161,25)", "rgb(21,93,252)"]}
                                                    sliceTooltip={({ slice }) => (
                                                        <div
                                                            style={{
                                                                background: "white",
                                                                padding: "9px 12px",
                                                                border: "1px solid #ccc",
                                                                borderRadius: 4,
                                                            }}
                                                        >
                                                            <div style={{ fontSize: 12, marginBottom: 6, color: "#555" }}>
                                                                <strong>Data:</strong> {new Date(slice.points[0].data.x as string).toLocaleDateString("it-IT")}
                                                            </div>

                                                            {slice.points.map((point) => (
                                                                <div
                                                                    key={point.id}
                                                                    style={{
                                                                        color: point.seriesColor,
                                                                        fontSize: 13,
                                                                        display: "flex",
                                                                        justifyContent: "space-between",
                                                                        gap: 12,
                                                                    }}
                                                                >
                                                                    <span>{point.seriesId}</span>
                                                                    <strong>{Number(point.data.y).toFixed(2)} €</strong>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        )}
                                    </MDBCardBody>
                                </MDBCard>
                            </MDBCol>
                        </MDBRow>

                        <MDBRow className="g-3">
                            <MDBCol xs="3" md="3" lg="3">
                                <StatCard ui={ui} label="Importo investito" value={importoInvestito ? importoInvestito.toString() : "0"} />
                            </MDBCol>
                            <MDBCol xs="3" md="3" lg="3">
                                <StatCard ui={ui} label="Crescita annuale composta" value="27,51%" />
                            </MDBCol>
                            <MDBCol xs="3" md="3" lg="3">
                                <StatCard ui={ui} label="Valore patrimoniale netto" value={importoInvestito ? importoInvestito.toString() : "0"} />
                            </MDBCol>
                            <MDBCol xs="3" md="3" lg="3">
                                <StatCard ui={ui} label="Deviazione standard" value="59,19%" />
                            </MDBCol>
                        </MDBRow>
                    </>
                )}
            </MDBContainer>

            {/* ==================== MODAL: EDIT ASSETS ==================== */}
            <MDBModal tabIndex="-1" open={modalOpen} setOpen={setModalOpen}>
                <MDBModalDialog centered size="lg">
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Modifica Assets</MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={toggleModal} />
                        </MDBModalHeader>

                        <MDBModalBody className="mx-3">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <div className="fw-bold">Assets</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>
                                        Totale pesi: <strong>{totalWeight}%</strong>
                                    </div>
                                </div>

                                <MDBBtn color="light" className="border" onClick={addEmptyRow}>
                                    <MDBIcon fas icon="plus" className="me-2" />
                                    New
                                </MDBBtn>
                            </div>

                            <MDBRow className="g-3">
                                {assetRows.map((row) => (
                                    <React.Fragment key={row.key}>
                                        <MDBCol md="7">
                                            <MDBSelect
                                                data={selectData50}
                                                value={row.symbol}
                                                onChange={(val) => handleChangeRowSymbol(row.key, val)}
                                                searchFn={searchFn}
                                                search
                                                onResize={undefined}
                                                onResizeCapture={undefined}
                                                onPointerEnterCapture={undefined}
                                                onPointerLeaveCapture={undefined}
                                            />
                                        </MDBCol>

                                        <MDBCol md="3">
                                            <MDBInput
                                                label="Percentuale %"
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={String(row.weight_pct ?? 0)}
                                                onChange={(e) => updateRow(row.key, { weight_pct: Number(e.target.value) })}
                                            />
                                        </MDBCol>

                                        <MDBCol md="2" className="d-flex align-items-end">
                                            <MDBBtn color="danger" outline className="w-100" onClick={() => removeRow(row.key)}>
                                                <MDBIcon fas icon="trash" />
                                            </MDBBtn>
                                        </MDBCol>
                                    </React.Fragment>
                                ))}
                            </MDBRow>

                            <div className="d-flex flex-column justify-content-end gap-2 mt-4">
                                {totalWeight < 100 && (
                                    <MDBAlert open className="w-100" color="warning">
                                        Distribuisci {(100 - totalWeight).toFixed(0)}% in più per salvare il portafoglio.
                                    </MDBAlert>
                                )}
                                <div className="w-100 d-flex flex-row justify-content-end gap-2">
                                    <MDBBtn color="light" className="border" onClick={() => setModalOpen(false)}>
                                        Cancel
                                    </MDBBtn>

                                    {totalWeight === 100 && (
                                        <MDBBtn disabled={savingAssets || !bt_item_uid || totalWeight !== 100} onClick={handleSaveAssetsFromModal}>
                                            {savingAssets ? "Saving..." : "Save assets"}
                                        </MDBBtn>
                                    )}
                                </div>
                            </div>
                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>

            {/* ==================== MODAL: DELETE CONFIRM ==================== */}
            <MDBModal open={deleteModalOpen} setOpen={setDeleteModalOpen} tabIndex="-1">
                <MDBModalDialog centered>
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Conferma eliminazione</MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={toggleDeleteModal} />
                        </MDBModalHeader>

                        <MDBModalBody>
                            Sei sicuro di voler eliminare questo elemento? <br />
                            <small className="text-muted">Questa azione non è reversibile.</small>
                        </MDBModalBody>

                        <MDBModalFooter>
                            <MDBBtn color="light" onClick={toggleDeleteModal} disabled={deleting}>
                                Annulla
                            </MDBBtn>

                            <MDBBtn color="danger" onClick={handleConfirmDelete} disabled={deleting}>
                                {deleting ? "Eliminando..." : "Sì, elimina"}
                            </MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>
    );
};

export default BacktestingItem;
