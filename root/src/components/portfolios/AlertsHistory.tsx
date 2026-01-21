import React, { useEffect, useRef, useState } from "react";
import {
    MDBBtn,
    MDBCol,
    MDBDropdown,
    MDBDropdownItem,
    MDBDropdownMenu,
    MDBDropdownToggle,
    MDBIcon,
    MDBInput,
    MDBInputGroup,
    MDBRow,
    MDBTable,
    MDBTableBody,
    MDBTableHead,
    MDBBadge,
    MDBModal,
    MDBModalBody,
    MDBModalContent,
    MDBModalDialog,
    MDBModalHeader,
    MDBModalTitle,
} from "mdb-react-ui-kit";

import Pagination from "../../app_components/TableData/components/Pagination";
import General_Loading from "../../app_components/General_Loading";
import { useFormAlert } from "../../app_components/GeneralAlert";
import { NfoInfo, get_nfoAlertsListPaginated } from "../../api_module/nfo/NfoData";

// ────────────────────────────────────────────────────────────────────────────────
// Helpers locali
// ────────────────────────────────────────────────────────────────────────────────
const fmtDate = (s?: string | null) => {
    if (!s) return "-";
    try {
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
type AlertsHistoryProps = {
    portfolio_uid: string;
};

const AlertsHistory: React.FC<AlertsHistoryProps> = ({ portfolio_uid }) => {
    const { FormAlert, showAlertError } = useFormAlert();
    const [validReportInfo, setValidReportInfo] = useState<NfoInfo>();

    // Modale anteprima HTML NFO
    const [htmlPreview, setHtmlPreview] = useState<string>('');
    const [modalTitle, setModalTitle] = useState<string>('');
    const [openPreviewModal, setOpenPreviewModal] = useState(false);

    // ── Filtri tabella ──────────────────────────────────────────────────────────
    const [filters, setFilters] = useState({
        portfolio_uid,
        page: 1,
        per_page: 25,
        search: "",
        scheduled_from: undefined as string | undefined,
        scheduled_to: undefined as string | undefined,
    });

    const [searchDraft, setSearchDraft] = useState<string>("");
    const [fromDraft, setFromDraft] = useState<string>("");
    const [toDraft, setToDraft] = useState<string>("");

    // 🔎 Debounce per filtro testuale
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((prev) => ({ ...prev, page: 1, search: searchDraft }));
        }, 400);
        return () => clearTimeout(t);
    }, [searchDraft]);

    // 📅 Debounce per i filtri data
    useEffect(() => {
        const t = setTimeout(() => {
            setFilters((p) => ({
                ...p,
                page: 1,
                scheduled_from: toDateTimeStart(fromDraft),
                scheduled_to: toDateTimeEnd(toDraft),
            }));
        }, 400);
        return () => clearTimeout(t);
    }, [fromDraft, toDraft]);

    // ── Stato dati ──────────────────────────────────────────────────────────────
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<NfoInfo[]>([]);
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
                const response = await get_nfoAlertsListPaginated(filters);
                if (!mounted) return;

                if (response.success && response.data?.rows) {
                    setRows(response.data.rows);
                    setItemsNum(response.data.meta.items_num);
                    setPagesNum(response.data.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero allerte");
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
    }, []);

    // Refetch automatico al cambiare dei filtri
    useEffect(() => {
        if (!didInitRef.current) return;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await get_nfoAlertsListPaginated(filters);
                if (response.success && response.data?.rows) {
                    setRows(response.data.rows);
                    setItemsNum(response.data.meta.items_num);
                    setPagesNum(response.data.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero allerte");
                }
            } catch (e: any) {
                setError(e?.message || "Errore di rete");
            } finally {
                setLoading(false);
            }
        })();
    }, [filters]);

    // ── Handlers paginazione ────────────────────────────────────────────────────
    const setCurrentPage = (page: number) => setFilters((p) => ({ ...p, page }));
    const setRowsForPage = (per_page: number) =>
        setFilters((p) => ({ ...p, per_page, page: 1 }));

    // ── UI ──────────────────────────────────────────────────────────────────────
    return (
        <>
            <div className="">
                <div className="d-flex align-items-center my-3">
                    <MDBIcon fas icon="bell" className="text-primary me-2" />
                    <h5 className="mb-0">Storico Alert</h5>
                </div>

                {/* 🔎 Filtro automatico */}
                <MDBRow className="align-items-center bg-white justify-content-between flex-wrap g-2">
                    <MDBCol md="6" className="mb-2">
                        <MDBInputGroup>
                            <MDBInput
                                type="text"
                                placeholder="Cerca per titolo o descrizione..."
                                className="border-start-0"
                                value={searchDraft}
                                onChange={(e) => setSearchDraft(e.target.value)}
                            />
                        </MDBInputGroup>
                    </MDBCol>

                    <MDBCol xs="12" md="6">
                        <div className="d-flex flex-wrap flex-md-nowrap gap-2 mb-2">
                            <MDBInput
                                type="date"
                                label="Da"
                                value={fromDraft}
                                onChange={(e) => setFromDraft(e.target.value)}
                                className="flex-fill"
                            />
                            <MDBInput
                                type="date"
                                label="A"
                                value={toDraft}
                                onChange={(e) => setToDraft(e.target.value)}
                                className="flex-fill"
                            />
                        </div>
                    </MDBCol>
                </MDBRow>

                <FormAlert />

                <MDBTable align="middle" hover responsive className="mb-2">
                    <MDBTableHead light>
                        <tr className="fw-semibold text-muted" style={{ fontSize: "0.9rem" }}>
                            <th>Titolo</th>
                            <th>Descrizione</th>
                            <th>Tipo</th>
                            <th>Data</th>
                            <th>Info</th>
                        </tr>
                    </MDBTableHead>
                    <MDBTableBody>
                        {loading && (
                            <tr>
                                <td colSpan={4} className="py-4 text-center">
                                    <General_Loading theme="formLoading" text="Caricamento Alert" />
                                </td>
                            </tr>
                        )}

                        {!loading && error && (
                            <tr>
                                <td colSpan={4} className="py-4 text-center text-danger">
                                    <MDBIcon fas icon="exclamation-triangle" className="me-2" />
                                    {error}
                                </td>
                            </tr>
                        )}

                        {!loading && !error && rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-4 text-center text-muted">
                                    <MDBIcon far icon="folder-open" className="me-2" />
                                    Nessuna allerta trovata.
                                </td>
                            </tr>
                        )}

                        {!loading &&
                            !error &&
                            rows.map((r, i) => (
                                <tr key={i}>
                                    <td className="fw-semibold">{r.title || "-"}</td>
                                    <td>{r.description || "-"}</td>
                                    <td>
                                        <MDBBadge color="info">{r.type || "-"}</MDBBadge>
                                    </td>
                                    <td>{fmtDate(r.scheduled_at)}</td>
                                    <td>
                                        <MDBBtn color="secondary"
                                            floating size="sm"
                                            onClick={() => {
                                                console.log(r)
                                                if (r) {
                                                    setHtmlPreview(r.html_body);
                                                    setModalTitle(r.title || 'Anteprima');
                                                    setOpenPreviewModal(true);
                                                } else {
                                                    setHtmlPreview("");
                                                    setModalTitle("Nessun report disponibile");
                                                    setOpenPreviewModal(true);
                                                }
                                            }}
                                        >
                                            <MDBIcon icon="info" />
                                        </MDBBtn>
                                    </td>
                                </tr>
                            ))}
                    </MDBTableBody>
                </MDBTable>

                {/* Footer pagination */}
                <MDBRow className="align-items-center mt-4">
                    <MDBCol col="4" sm="4" md="2">
                        <MDBDropdown>
                            <MDBDropdownToggle color="secondary" className="shadow-0 w-100 w-md-auto">
                                Per pagina
                            </MDBDropdownToggle>
                            <MDBDropdownMenu>
                                {[10, 25, 50, 100].map((n) => (
                                    <MDBDropdownItem link key={n} onClick={() => setRowsForPage(n)}>
                                        {n}
                                    </MDBDropdownItem>
                                ))}
                            </MDBDropdownMenu>
                        </MDBDropdown>
                    </MDBCol>

                    <MDBCol col="4" sm="4" md="8" className=" my-3 text-center text-md-center">
                        <div className="text-muted small">
                            Elementi: <b>{itemsNum}</b>
                        </div>
                    </MDBCol>

                    <MDBCol col="4" sm="4" md="2" className="d-flex justify-content-md-end justify-content-center">
                        <Pagination
                            setCurrentPage={setCurrentPage}
                            currentPage={filters.page ?? 1}
                            totalPages={pagesNum}
                        />
                    </MDBCol>
                </MDBRow>
            </div>
            {htmlPreview && (
                <MDBModal open={openPreviewModal} setOpen={setOpenPreviewModal} tabIndex={-1}>
                    <MDBModalDialog size="xl" centered scrollable>
                        <MDBModalContent className="shadow-4 rounded-6">
                            <MDBModalHeader className="bg-primary text-white">
                                <MDBIcon fas icon="file-pdf" className="me-2" />
                                <MDBModalTitle>{modalTitle}</MDBModalTitle>
                                <MDBBtn
                                    className="btn-close btn-close-white"
                                    color="none"
                                    onClick={() => setOpenPreviewModal(false)}
                                ></MDBBtn>
                            </MDBModalHeader>
                            <MDBModalBody className="bg-light p-4">
                                <div
                                    className="bg-white p-3 rounded-5 shadow-sm"
                                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                                />
                            </MDBModalBody>
                        </MDBModalContent>
                    </MDBModalDialog>
                </MDBModal>
            )}
        </>
    );
};

export default AlertsHistory;
