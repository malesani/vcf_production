// OperationsHistory.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    MDBBadge,
    MDBBtn,
    MDBBtnGroup,
    MDBCard,
    MDBCardBody,
    MDBCol,
    MDBDropdown,
    MDBDropdownItem,
    MDBDropdownMenu,
    MDBDropdownToggle,
    MDBIcon,
    MDBInput,
    MDBInputGroup,
    MDBModal,
    MDBModalBody,
    MDBModalContent,
    MDBModalDialog,
    MDBModalHeader,
    MDBModalTitle,
    MDBRow,
    MDBTable,
    MDBTableBody,
    MDBTableHead,
} from "mdb-react-ui-kit";

import Pagination from "../../app_components/TableData/components/Pagination";
import General_Loading from "../../app_components/General_Loading";
import { useFormAlert } from "../../app_components/GeneralAlert";
import { FieldConfig, GeneralForm } from "../../app_components/GeneralForm";

import {
    ExecutedOperationRow,
    OperationsListFilters,
    fetchOperationsPaginated,
    upsertOperation,
} from "../../api_module/operations/OperationsRequest";

// ────────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────────
type OperationsHistoryProps = {
    portfolio_uid: string;
    portfolio_tipe: string;
};

// ────────────────────────────────────────────────────────────────────────────────
// Helpers locali
// ────────────────────────────────────────────────────────────────────────────────
const fmtEUR = (n?: number) =>
    n == null
        ? "-"
        : new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const fmtDate = (s?: string | null) => {
    if (!s) return "-";
    try {
        // Se già formattato dal backend lo mostriamo così com'è; altrimenti prova a parse
        const d = new Date(s);
        if (isNaN(d.getTime())) return s;
        return d.toLocaleString("it-IT");
    } catch {
        return s!;
    }
};

const toDateTimeStart = (d?: string) => (d ? `${d} 00:00:00` : undefined);
const toDateTimeEnd = (d?: string) => (d ? `${d} 23:59:59` : undefined);

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────
const OperationsHistory: React.FC<OperationsHistoryProps> = ({ portfolio_uid, portfolio_tipe }) => {
    const { FormAlert, showAlertError, showAlertSuccess } = useFormAlert();

    // ── Filtri tabella ──────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<OperationsListFilters>({
        portfolio_uid,
        page: 1,
        per_page: 25,
        operator: undefined, // 'buy' | 'sell' | undefined
        symbol: "",
        from: undefined,
        to: undefined,
    });

    const [searchDraft, setSearchDraft] = useState<string>(filters.symbol ?? "");
    const [fromDraft, setFromDraft] = useState<string>(""); // 'YYYY-MM-DD'
    const [toDraft, setToDraft] = useState<string>(""); // 'YYYY-MM-DD'

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((prev) => ({ ...prev, page: 1, symbol: searchDraft || undefined }));
        }, 400);
        return () => clearTimeout(t);
    }, [searchDraft]);

    // ── Stato dati ──────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<ExecutedOperationRow[]>([]);
    const [itemsNum, setItemsNum] = useState<number>(0);
    const [pagesNum, setPagesNum] = useState<number>(1);

    const didInitRef = useRef(false);

    // Primo fetch
    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const { response, data } = await fetchOperationsPaginated(filters);
                if (!mounted) return;
                if (response.success && data) {
                    setRows(data.rows);
                    setItemsNum(data.meta.items_num);
                    setPagesNum(data.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero operazioni");
                }
            } catch (e: any) {
                if (mounted) setError(e?.message || "Errore di rete");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        didInitRef.current = true;
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // primo caricamento

    // Refetch on-demand al variare dei filtri (post init)
    useEffect(() => {
        if (!didInitRef.current) return;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const { response, data } = await fetchOperationsPaginated(filters);
                if (response.success && data) {
                    setRows(data.rows);
                    setItemsNum(data.meta.items_num);
                    setPagesNum(data.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero operazioni");
                }
            } catch (e: any) {
                setError(e?.message || "Errore di rete");
            } finally {
                setLoading(false);
            }
        })();
    }, [filters]);

    // ── Handlers filtri ─────────────────────────────────────────────────────────
    const setCurrentPage = (page: number) => setFilters((p) => ({ ...p, page }));
    const setRowsForPage = (per_page: number) =>
        setFilters((p) => ({ ...p, per_page, page: 1 }));

    const setOperator = (op?: "buy" | "sell") =>
        setFilters((p) => ({ ...p, operator: op, page: 1 }));

    const applyDateFilters = () => {
        setFilters((p) => ({
            ...p,
            page: 1,
            from: toDateTimeStart(fromDraft) || undefined,
            to: toDateTimeEnd(toDraft) || undefined,
        }));
    };

    const clearDateFilters = () => {
        setFromDraft("");
        setToDraft("");
        setFilters((p) => ({ ...p, page: 1, from: undefined, to: undefined }));
    };

    // ── Modifica (modal) ────────────────────────────────────────────────────────
    const [editOpen, setEditOpen] = useState(false);
    const [selected, setSelected] = useState<ExecutedOperationRow | null>(null);
    const toggleEdit = () => setEditOpen((o) => !o);

    const onClickEdit = (row: ExecutedOperationRow) => {
        setSelected(row);
        setEditOpen(true);
    };

    // Form fields per UPDATE (usiamo GeneralForm per coerenza con il resto della tua UI)
    type UpdatePayload = {
        unitQuantity?: number;
        unitaryPrice?: number;
    };
    const UpdateFields: FieldConfig<UpdatePayload>[] = [
        {
            name: "unitQuantity",
            label: "Quantità (unitQuantity)",
            type: "number",
            grid: { md: 12 },
            properties: { minValue: 0, stepValue: 1 },
            visible: () => { return portfolio_tipe === "managed" ? false : false },
        },
        {
            name: "unitaryPrice",
            label: "Prezzo unitario",
            type: "number",
            grid: { md: 12 },
            properties: { minValue: 0, stepValue: 0.01 },
        },
    ];

    async function onSubmitUpdate(fd: UpdatePayload) {
        if (!selected) return { response: { success: false, message: "Nessuna operazione selezionata" } };

        try {
            const { response } = await upsertOperation({
                portfolio_uid,
                operation_uid: selected.operation_uid,
                ...(fd.unitQuantity != null && fd.unitQuantity !== (selected.unitQuantity ?? undefined)
                    ? { unitQuantity: Number(fd.unitQuantity) }
                    : {}),
                ...(fd.unitaryPrice != null && fd.unitaryPrice !== (selected.unitaryPrice ?? undefined)
                    ? { unitaryPrice: Number(fd.unitaryPrice) }
                    : {}),
            });

            if (response.success) {
                showAlertSuccess(response.message || "Operazione aggiornata");
                setEditOpen(false);
                // ricarica la pagina corrente
                setFilters((p) => ({ ...p }));
            } else {
                showAlertError(response.message || "Errore in aggiornamento");
            }
            return { response };
        } catch (e: any) {
            showAlertError(e?.message || "Errore di rete");
            return { response: { success: false, message: e?.message || "Errore di rete" } as any };
        }
    }

    const editInitialData: UpdatePayload | undefined = useMemo(
        () =>
            selected
                ? {
                    unitQuantity: selected.unitQuantity,
                    unitaryPrice: selected.unitaryPrice,
                }
                : undefined,
        [selected]
    );

    // ── UI ──────────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="mb-4">
                <div className="d-flex align-items-center my-3">
                    <MDBIcon fas icon="history" className="text-primary me-2" />
                    <h5 className="mb-0">Operazioni eseguite</h5>
                </div>

                {/* Filtro rapido */}
                <MDBRow className="align-items-center bg-white p-3 rounded-2 border mb-3 g-2">
                    <MDBCol md="9">
                        <MDBInputGroup>
                            <span className="input-group-text bg-white border-end-0">
                                <MDBIcon fas icon="search" />
                            </span>
                            <MDBInput
                                type="text"
                                placeholder="Cerca per symbol (es. AAPL)"
                                className="border-start-0"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                            />
                        </MDBInputGroup>
                    </MDBCol>

                    <MDBCol md="3">
                        <MDBBtnGroup>
                            <MDBBtn
                                color={!filters.operator ? "primary" : "light"}
                                onClick={() => setOperator(undefined)}
                            >
                                Tutte
                            </MDBBtn>
                            <MDBBtn
                                color={filters.operator === "buy" ? "success" : "light"}
                                onClick={() => setOperator("buy")}
                            >
                                <MDBIcon fas icon="arrow-up" className="me-1" />
                                Buy
                            </MDBBtn>
                            <MDBBtn
                                color={filters.operator === "sell" ? "danger" : "light"}
                                onClick={() => setOperator("sell")}
                            >
                                <MDBIcon fas icon="arrow-down" className="me-1" />
                                Sell
                            </MDBBtn>
                        </MDBBtnGroup>
                    </MDBCol>

                    <MDBCol md="9">
                        <div className="d-flex gap-2">
                            <MDBInput
                                type="date"
                                label="Da"
                                value={fromDraft}
                                onChange={(e) => setFromDraft(e.target.value)}
                            />
                            <MDBInput
                                type="date"
                                label="A"
                                value={toDraft}
                                onChange={(e) => setToDraft(e.target.value)}
                            />
                        </div>
                    </MDBCol>
                    <MDBCol md="3" className="d-grid d-md-flex gap-2">
                        <MDBBtn
                            color="light"
                            className="flex-fill"
                            onClick={applyDateFilters}
                            title="Applica date"
                        >
                            <MDBIcon fas icon="filter" className="me-1" />
                            Applica
                        </MDBBtn>

                        <MDBBtn
                            color="light"
                            className="flex-fill"
                            onClick={clearDateFilters}
                            title="Reset date"
                        >
                            <MDBIcon fas icon="broom" className="me-1" />
                            Reset
                        </MDBBtn>
                    </MDBCol>
                </MDBRow>

                <FormAlert />

                <MDBCard className="border rounded-3">
                    <MDBTable align="middle" hover responsive className="mb-2">
                        <MDBTableHead light>
                            <tr className="fw-semibold text-muted" style={{ fontSize: "0.9rem" }}>
                                <th>Symbol</th>
                                <th>Operazione</th>
                                <th>Q.tà</th>
                                <th>Prezzo Unit.</th>
                                <th>Valore</th>
                                <th>Eseguita il</th>
                                <th>Azioni</th>
                            </tr>
                        </MDBTableHead>
                        <MDBTableBody>
                            {loading && (
                                <tr>
                                    <td colSpan={7} className="py-4">
                                        <div className="d-flex align-items-center justify-content-center gap-3">
                                            <General_Loading theme="formLoading" text="Caricamento Operazioni" />
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && error && (
                                <tr>
                                    <td colSpan={7} className="py-4">
                                        <div className="d-flex flex-column align-items-center justify-content-center gap-2">
                                            <div className="text-danger">
                                                <MDBIcon fas icon="exclamation-triangle" className="me-2" />
                                                {error}
                                            </div>
                                            <MDBBtn color="danger" size="sm" onClick={() => setFilters((p) => ({ ...p }))}>
                                                <MDBIcon fas icon="redo" className="me-2" />
                                                Riprova
                                            </MDBBtn>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && !error && rows.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-4">
                                        <div className="text-center text-muted">
                                            <MDBIcon far icon="folder-open" className="me-2" />
                                            Nessuna operazione trovata con i filtri correnti.
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading &&
                                !error &&
                                rows.length > 0 &&
                                rows.map((r) => {
                                    const value = (r.unitaryPrice ?? 0) * (r.unitQuantity ?? 0);
                                    return (
                                        <tr key={r.operation_uid}>
                                            <td>
                                                <strong>{r.symbol}</strong>
                                                <div className="small text-muted">{r.operation_uid}</div>
                                            </td>
                                            <td>
                                                <MDBBadge color={r.operation === "buy" ? "success" : "danger"}>
                                                    {r.operation === "buy" ? "Compra" : "Vendi"}
                                                </MDBBadge>
                                            </td>
                                            <td>
                                                <b>{r.unitQuantity}</b>
                                            </td>
                                            <td>{fmtEUR(r.unitaryPrice)}</td>
                                            <td className="fw-semibold">{fmtEUR(value)}</td>
                                            <td>{fmtDate(r.executed_at)}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <MDBBtn
                                                        size="sm"
                                                        color="link"
                                                        className="text-muted p-0"
                                                        onClick={() => onClickEdit(r)}
                                                        title="Modifica"
                                                    >
                                                        <MDBIcon fas icon="pen" />
                                                    </MDBBtn>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </MDBTableBody>
                    </MDBTable>

                    {/* Footer: per-page + pagination */}
                    <div className="d-flex justify-content-between align-items-center p-3">
                        <div>
                            <MDBDropdown>
                                <MDBDropdownToggle color="secondary" className="shadow-0">
                                    Per pagina {filters.per_page}
                                </MDBDropdownToggle>
                                <MDBDropdownMenu>
                                    <MDBDropdownItem link onClick={() => setRowsForPage(10)}>
                                        10
                                    </MDBDropdownItem>
                                    <MDBDropdownItem link onClick={() => setRowsForPage(25)}>
                                        25
                                    </MDBDropdownItem>
                                    <MDBDropdownItem link onClick={() => setRowsForPage(50)}>
                                        50
                                    </MDBDropdownItem>
                                    <MDBDropdownItem link onClick={() => setRowsForPage(100)}>
                                        100
                                    </MDBDropdownItem>
                                </MDBDropdownMenu>
                            </MDBDropdown>
                        </div>

                        <div className="text-muted small">
                            Elementi: <b>{itemsNum}</b>
                        </div>

                        <Pagination
                            setCurrentPage={setCurrentPage}
                            currentPage={filters.page ?? 1}
                            totalPages={pagesNum}
                        />
                    </div>
                </MDBCard>
            </div>

            {/* MODALE: Modifica operazione */}
            <MDBModal tabIndex="-1" open={editOpen} setOpen={setEditOpen}>
                <MDBModalDialog centered>
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>
                                <MDBIcon fas icon="pen" className="me-2" />
                                Modifica Operazione
                            </MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={toggleEdit}></MDBBtn>
                        </MDBModalHeader>
                        <MDBModalBody>
                            {selected && (
                                <>
                                    <div className="mb-3 small text-muted">
                                        <div>
                                            <b>Symbol:</b> {selected.symbol} —{" "}
                                            <MDBBadge color={selected.operation === "buy" ? "success" : "danger"}>
                                                {selected.operation.toUpperCase()}
                                            </MDBBadge>
                                        </div>
                                        <div>
                                            <b>Op. UID:</b> {selected.operation_uid}
                                        </div>
                                        <div>
                                            <b>Eseguita il:</b> {fmtDate(selected.executed_at)}
                                        </div>
                                    </div>
                                    <GeneralForm<UpdatePayload, {}>
                                        mode="update"
                                        fields={UpdateFields}
                                        data={editInitialData as UpdatePayload}
                                        updateData={async (payload) => await onSubmitUpdate(payload)}
                                        onSuccess={() => {
                                           
                                        }}
                                        updateBtnProps={{ label: "Salva", labelSaving: "Salvataggio...", btnPosition:"bottom" }}
                                    />
                                </>
                            )}
                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>
    );
};

export default OperationsHistory;
