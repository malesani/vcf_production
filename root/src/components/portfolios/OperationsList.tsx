import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  MDBBadge,
  MDBBtn,
  MDBBtnGroup,
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
  updateOperation,
} from "../../api_module/operations/OperationsRequest";

// ────────────────────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────────────────────
type OperationsHistoryProps = {
  portfolio_uid: string;
  onReloadPrices?: (() => Promise<void>) | null;
  onReloadPortfolio?: (() => Promise<void>) | null;
  onReloadOperations?: (() => Promise<void>) | null;
};

export type ChildApi = {
  refetch: () => Promise<void>;
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
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString("it-IT");
  } catch {
    return s!;
  }
};

const toDateTimeStart = (d?: string) => (d ? `${d}T00:00:00` : undefined);
const toDateTimeEnd = (d?: string) => (d ? `${d}T23:59:59` : undefined);

// ────────────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────────────
const OperationsHistory = forwardRef<ChildApi, OperationsHistoryProps>(({ portfolio_uid, onReloadPrices, onReloadPortfolio, onReloadOperations }, ref) => {
  const { FormAlert, showAlertError, showAlertSuccess } = useFormAlert();

  // ── Filtri tabella ──────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<OperationsListFilters>({
    portfolio_uid,
    page: 1,
    per_page: 10,
    operation: undefined, // 'buy' | 'sell' | undefined
    symbol: "",
    from: undefined,
    to: undefined,
  });

  const [searchDraft, setSearchDraft] = useState<string>(filters.symbol ?? "");
  const [fromDraft, setFromDraft] = useState<string>("");
  const [toDraft, setToDraft] = useState<string>("");

  // 🔎 Debounce per il filtro simbolo
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((prev) => ({ ...prev, page: 1, symbol: searchDraft || undefined }));
    }, 400);
    return () => clearTimeout(t);
  }, [searchDraft]);

  // 📅 Debounce per i filtri data (AUTO)
  useEffect(() => {
    // Se entrambe le date sono vuote, resetta
    if (!fromDraft && !toDraft) {
      setFilters((p) => ({ ...p, page: 1, from: undefined, to: undefined }));
      return;
    }

    const t = setTimeout(() => {
      setFilters((p) => ({
        ...p,
        page: 1,
        from: toDateTimeStart(fromDraft) || undefined,
        to: toDateTimeEnd(toDraft) || undefined,
      }));
    }, 400);
    return () => clearTimeout(t);
  }, [fromDraft, toDraft]);

  // ── Stato dati ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExecutedOperationRow[]>([]);
  const [itemsNum, setItemsNum] = useState<number>(0);
  const [pagesNum, setPagesNum] = useState<number>(1);

  const didInitRef = useRef(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  async function refetch() {
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
      setLoading(false);
    } catch (e: any) {
      if (isMountedRef.current) setError(e?.message || "Errore di rete");
    } finally {
      console.log(isMountedRef,"isMountedRef")
      if (isMountedRef.current) setLoading(false);
    }

    didInitRef.current = true;
  }

  // Primo fetch
  useEffect(() => {
    refetch()
  }, []);

  // Refetch automatico al cambiare dei filtri
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
    setFilters((p) => ({ ...p, operation: op, page: 1 }));

  // ── Modifica (modal) ────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<ExecutedOperationRow | null>(null);
  const toggleEdit = () => setEditOpen((o) => !o);

  const onClickEdit = (row: ExecutedOperationRow) => {
    setSelected(row);
    setEditOpen(true);
  };

  // ── Campi per UPDATE ────────────────────────────────────────────────────────
  type UpdatePayload = { unitQuantity?: number; unitaryPrice?: number };
  const UpdateFields: FieldConfig<UpdatePayload>[] = [
    {
      name: "unitaryPrice",
      label: "Prezzo unitario",
      type: "number",
      grid: { md: 12 },
      properties: { minValue: 0, stepValue: 0.01 },
    },
  ];

  async function onSubmitUpdate(fd: UpdatePayload) {
    if (!selected)
      return { response: { success: false, message: "Nessuna operazione selezionata" } };

    try {
      const { response } = await updateOperation({
        portfolio_uid,
        operation_uid: selected.operation_uid,
        ...(fd.unitaryPrice != null &&
          fd.unitaryPrice !== (selected.unitaryPrice ?? undefined)
          ? { unitaryPrice: Number(fd.unitaryPrice) }
          : {}),
      });

      if (response.success) {
        showAlertSuccess(response.message || "Operazione aggiornata");
        setEditOpen(false);
        setFilters((p) => ({ ...p }));
        if (onReloadPortfolio) onReloadPortfolio();
        if (onReloadPrices) onReloadPrices();
        if (onReloadOperations) onReloadOperations();
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
        ? { unitaryPrice: selected.unitaryPrice }
        : undefined,
    [selected]
  );


  //export functions 
  useImperativeHandle(ref, () => ({
    refetch,
  }));

  // ── UI ──────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="">
        <div className="d-flex align-items-center my-3">
          <MDBIcon fas icon="history" className="text-primary me-2" />
          <h5 className="mb-0">Operazioni eseguite</h5>
        </div>

        {/* 🔎 Filtro automatico */}
        <MDBRow className="align-items-center bg-white justify-content-between flex-wrap g-2">
          <MDBCol md="3" className="mb-2">
            <MDBInputGroup>
              <MDBInput
                type="text"
                placeholder="Cerca per symbol (es. AAPL)"
                className="border-start-0"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
              />
              <MDBBtn style={{ backgroundColor: "rgb(38, 53, 80)" }}>
                <MDBIcon fas icon="search" />
              </MDBBtn>
            </MDBInputGroup>



          </MDBCol>

          <MDBCol xs="12" sm="6" md="3" className="mb-2">
            <MDBBtnGroup className="w-100 d-flex btn-group-sm">
              <MDBBtn
                color={!filters.operation ? "secondary" : "light"}
                size="sm"
                className="px-2 py-1 flex-fill"
                onClick={() => setOperator(undefined)}
                style={{ fontSize: "0.75rem", lineHeight: "1rem" }}
              >
                Tutte
              </MDBBtn>
              <MDBBtn
                color={filters.operation === "buy" ? "success" : "light"}
                size="sm"
                className="px-2 py-1 flex-fill"
                onClick={() => setOperator("buy")}
                style={{ fontSize: "0.75rem", lineHeight: "1rem" }}
              >
                <MDBIcon fas icon="arrow-up" className="me-1" style={{ fontSize: "0.65rem" }} />
                Buy
              </MDBBtn>
              <MDBBtn
                color={filters.operation === "sell" ? "danger" : "light"}
                size="sm"
                className="px-2 py-1 flex-fill"
                onClick={() => setOperator("sell")}
                style={{ fontSize: "0.75rem", lineHeight: "1rem" }}
              >
                <MDBIcon fas icon="arrow-down" className="me-1" style={{ fontSize: "0.65rem" }} />
                Sell
              </MDBBtn>
            </MDBBtnGroup>
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
                className="flex-fill w-100"
              />
            </div>
          </MDBCol>
        </MDBRow>

        <FormAlert />


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
                <td colSpan={7} className="py-4 text-center">
                  <General_Loading theme="formLoading" text="Caricamento Operazioni" />
                </td>
              </tr>
            )}

            {!loading && error && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-danger">
                  <MDBIcon fas icon="exclamation-triangle" className="me-2" />
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-center text-muted">
                  <MDBIcon far icon="folder-open" className="me-2" />
                  Nessuna operazione trovata.
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows.map((r) => {
                const value = (r.unitaryPrice ?? 0) * (r.unitQuantity ?? 0);
                return (
                  <tr key={r.operation_uid}>
                    <td>
                      <strong>{r.symbol}</strong>
                      <div className="small text-muted">{r.operation_uid}</div>
                    </td>
                    <td>
                      <MDBBadge light={r.operation === "deposit" || r.operation === "withdraw"} color={r.operation === "buy" || r.operation === "deposit" ? "success" : "danger"}>
                        {r.operation === "buy" ? "Compra" : r.operation === "sell" ? "Vende"
                          : r.operation === "deposit" ? "Deposito" : "Ritiro"}
                      </MDBBadge>
                    </td>
                    <td><b>{r.unitQuantity}</b></td>
                    <td>{fmtEUR(r.unitaryPrice)}</td>
                    <td className="fw-semibold">{fmtEUR(value)}</td>
                    <td>{fmtDate(r.created_at)}</td>
                    <td>
                      <MDBBtn
                        size="sm"
                        color="link"
                        className="text-muted p-0"
                        onClick={() => onClickEdit(r)}
                      >
                        <MDBIcon fas icon="pen" />
                      </MDBBtn>
                    </td>
                  </tr>
                );
              })}
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

      {/* Modal modifica */}
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
                    <b>Symbol:</b> {selected.symbol} —{" "}
                    <MDBBadge color={selected.operation === "buy" ? "success" : "danger"}>
                      {selected.operation.toUpperCase()}
                    </MDBBadge>
                  </div>

                  <GeneralForm<UpdatePayload, {}>
                    mode="update"
                    fields={UpdateFields}
                    data={editInitialData as UpdatePayload}
                    updateData={async (payload) => await onSubmitUpdate(payload)}
                    updateBtnProps={{
                      label: "Salva",
                      labelSaving: "Salvataggio...",
                      btnPosition: "bottom",
                    }}
                  />
                </>
              )}
            </MDBModalBody>
          </MDBModalContent>
        </MDBModalDialog>
      </MDBModal>
    </>
  );
});

export default OperationsHistory;
