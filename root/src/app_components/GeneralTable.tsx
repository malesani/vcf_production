import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
    MDBInputGroup,
    MDBTable,
    MDBTableHead,
    MDBTableBody,
    MDBModal,
    MDBModalDialog,
    MDBModalContent,
    MDBModalHeader,
    MDBModalBody,
    MDBBtn,
    MDBIcon,
    MDBSpinner,
    MDBInput
} from "mdb-react-ui-kit";
import { DataResponse, requestResponse } from "../hooks/RequestFunction";
import { useFormAlert } from "./GeneralAlert";
import { GeneralForm, FieldConfig } from "./GeneralForm";

import GeneralPagination from "./GeneralPagination";

import { useIsMobile } from "./ResponsiveModule";

import Swal from 'sweetalert2'
import type { SweetAlertOptions } from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content'
import General_Loading from "./General_Loading";

type InputType = 'number' | 'select' | 'checkbox';

// Commun Configs
interface ColumnConfigCommon {
    label: string;
    width?: number;
    inputType?: InputType;
    options?: Array<string | { text: string; value: any }>;
    defaultValue?: any;
    sort?: boolean;
    readOnly?: boolean;
}

// column from T
export type ColumnConfigDirect<T> = ColumnConfigCommon & {
    field: keyof T & string;
    computeValue?: never;
};

// column function of T
export type ColumnConfigComputed<T> = ColumnConfigCommon & {
    field: string;
    computeValue: (row: T) => any;
};

// Single Column Config 
export type ColumnConfig<T> = ColumnConfigDirect<T> | ColumnConfigComputed<T>;

export interface ActionConfig<T> {
    icon?: string;
    label?: React.ReactNode;      // Label o icona da renderizzare
    buttonProps?: Omit<React.ComponentProps<typeof MDBBtn>, 'onClick'> & { className?: string; };
    order?: number;
    onClick: (rowData: T) => void;        // Callback da invocare al click, riceve la data raw
    visible?: (rowData: T) => boolean;    // funzione che parametrizza il render, true/undefined => not rendered
}

export type DefaultFilters = {
    search?: string;
    page?: number;
    per_page?: number;
    order_by?: string;
    order_dir?: 'asc' | 'desc';
};

interface CommonBase<T, P, F extends Record<string, any>> {
    title: string;
    icon?: string;
    columns: ColumnConfig<T>[];
    params?: P;
    initialFilters?: Partial<F>;
    actions?: ActionConfig<T>[];
    disableNotVisible?: {
        create?: boolean;
        update?: boolean;
        delete?: boolean;
    };
    deleteConfirmOptions?: SweetAlertOptions;
    bulkDeleteData?: (ids: Array<T[keyof T]>) => Promise<DataResponse<null>>;
    showSearch?: boolean;
    advancedFilters?: boolean;
}

// poi definiamo i due casi possibili
type CommonWithFields<T, P, F extends Record<string, any>> =
    CommonBase<T, P, F> &
    { fields: FieldConfig<T>[] };

type CommonWithUpdateCreate<T, P, F extends Record<string, any>> =
    CommonBase<T, P, F> &
    { fieldsUpdate: FieldConfig<T>[]; fieldsCreate: FieldConfig<T>[] };

type CommonProps<T, P, F extends Record<string, any>> =
    | CommonWithFields<T, P, F>
    | CommonWithUpdateCreate<T, P, F>;

type CreateProps<T, P> = ({ createData?: never } | { createData: (payload: T & P) => Promise<DataResponse<T>> }) & {
    enableCreate?: boolean;
};

type UpdateProps<T, P> =
    {
        updateData?: never
        visibleUpdate?: never;
        onRegisterRefresh?: never;
    } | {
        updateData: (payload: T & P) => Promise<DataResponse<T>>;
        visibleUpdate?: (rowData: T) => boolean;    // funzione che parametrizza il render, true/undefined => not rendered
        onRegisterRefresh?: (fn: (withLoading?: boolean) => void) => void;
    };

type DeleteProps<T, P> = { visibleDelete?: (rowData: T) => boolean; } &
    ({ deleteData?: never; rowKey?: never; } | { deleteData: (payload: T & P) => Promise<DataResponse<null>>; rowKey: keyof T; });


interface FetchProps<T, P, F> {
    getData: (args: P & F) => Promise<DataResponse<T[]>>;
    response?: never;
    data?: never;
}

interface InitialProps<T> {
    response?: requestResponse;
    data: T[];
    getData?: never;
}

export type GeneralTableProps<
    T extends Record<string, any>,
    P extends Record<string, any> = {},
    F extends Record<string, any> = DefaultFilters
> = CommonProps<T, P, F> & CreateProps<T, P> & UpdateProps<T, P> & DeleteProps<T, P> & (FetchProps<T, P, F> | InitialProps<T>);

// wrapper for row
type RowWithId<T> = {
    __internalId: string;
    data: T;
};

export function GeneralTable<T extends Record<string, any>, P extends Record<string, any>, F extends Record<string, any> = DefaultFilters>(props: GeneralTableProps<T, P, F>) {
    const Swal2 = withReactContent(Swal)
    const isMobile = useIsMobile(992);

    const {
        title,
        icon,
        columns,
        rowKey,
        actions,
        createData = async () => ({
            response: { success: false, message: 'Create disabled', error: 'Try to reach disabled create function' },
            data: {} as T
        }),
        updateData = async () => ({
            response: { success: false, message: 'Update disabled', error: 'Try to reach disabled update function' },
            data: {} as T
        }),
        deleteData,
        bulkDeleteData,
        showSearch = true,
        advancedFilters = false,
        enableCreate,
        onRegisterRefresh,
        visibleUpdate,
        visibleDelete,
        disableNotVisible = {},
        params,
        initialFilters = {} as Partial<F>,
        deleteConfirmOptions = {}
    } = props as GeneralTableProps<T, P, F>;

    // FieldConfigs
    let createFields: FieldConfig<T>[];
    let updateFields: FieldConfig<T>[];

    if ('fields' in props) {
        // è il caso CommonWithFields
        createFields = props.fields;
        updateFields = props.fields;
    } else {
        // è il caso CommonWithUpdateCreate
        createFields = props.fieldsCreate;
        updateFields = props.fieldsUpdate;
    }
    // end

    const disableBtns = {
        create: disableNotVisible.create ?? true,
        update: disableNotVisible.update ?? true,
        delete: disableNotVisible.delete ?? true,
    };

    // discriminante fetch vs controlled
    const isFetchMode = "getData" in props && typeof props.getData === "function";

    const hasCreateRow = (enableCreate ?? true) && "createData" in props && typeof props.createData === "function";
    const hasUpdateRow = "updateData" in props && typeof props.updateData === "function";
    const hasDeleteRow = "deleteData" in props && typeof props.deleteData === "function";

    let getData: (args: P & F) => Promise<DataResponse<T[]>> | undefined;
    const controlledData: T[] | undefined = !isFetchMode ? (props as InitialProps<T>).data : undefined;
    const controlledResponse = !isFetchMode ? (props as InitialProps<T>).response : undefined;

    if (isFetchMode) {
        getData = (props as FetchProps<T, P, F>).getData;
    }

    // hook alert
    const { showAlertLoading, showAlertSuccess, showAlertError, FormAlert } = useFormAlert();

    const [filters, setFilters] = useState<F>({
        ...(initialFilters as F),
        page: initialFilters.page ?? 1,
        per_page: initialFilters.per_page ?? 25,
        order_by: undefined,
        order_dir: undefined,
    });

    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

    const idCounter = useRef(0);
    const makeId = () => `row_${++idCounter.current}`;
    const [rows, setRows] = useState<RowWithId<T>[]>([]);
    const [loading, setLoading] = useState<boolean>(isFetchMode);


    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [mode, setMode] = useState<"create" | "update">("create");
    const [selectedRow, setSelectedRow] = useState<RowWithId<T> | null>(null);

    const [totalPages, setTotalPages] = useState<number>(1);

    const fetchData = useCallback(
        async (f: F) => {
            if (!isFetchMode) return;

            setLoading(true);
            try {
                const args = { ...params, ...f } as P & F;
                const resp = await getData!(args)!;

                if (resp.response.success && resp.data) {
                    // const numOfRow = resp.data.length;
                    const wrapped = resp.data.map(item => ({
                        __internalId: makeId(),
                        data: item,
                    }));
                    setRows(wrapped);
                    setOriginalRows(wrapped);

                    // ----> qui raccogli i metadati raw:
                    const raw = resp.response.data as any;
                    const total = Number(raw.total ?? wrapped.length);
                    const perPage = Number(raw.per_page ?? f.per_page);
                    setTotalPages(Math.max(1, Math.ceil(total / perPage)));
                } else {
                    showAlertError(resp.response.message || "Errore caricamento dati");
                }
            } catch (err: any) {
                showAlertError(err.message || "Errore caricamento dati");
            } finally {
                setLoading(false);
            }
        },
        [params]
    );

    // fetch automatico se in modalità getData
    useEffect(() => {
        if (!isFetchMode) return;
        fetchData(filters);
    }, [isFetchMode, fetchData]);

    // Callback di refresh dei dati
    const refreshData = useCallback(
        async (withLoading: boolean = true) => {
            if (withLoading) setLoading(true);
            try {
                const args = { ...params, ...filters } as P & F;
                const resp = await getData(args)!;
                if (resp.response.success && resp.data) {
                    const wrapped = resp.data.map(item => ({
                        __internalId: makeId(),
                        data: item,
                    }));
                    setRows(wrapped);
                    const raw = resp.response.data as any;
                    const total = Number(raw.total ?? wrapped.length);
                    const perPage = Number(raw.per_page ?? filters.per_page);
                    setTotalPages(Math.max(1, Math.ceil(total / perPage)));
                } else {
                    showAlertError(resp.response.message || "Errore caricamento dati");
                }
            } catch (err: any) {
                showAlertError(err.message || "Errore caricamento dati");
            } finally {
                if (withLoading) setLoading(false);
            }
        },
        [params, filters, makeId, showAlertError]
    );

    // registra il callback all’esterno
    useEffect(() => {
        if (onRegisterRefresh) {
            onRegisterRefresh(refreshData);
        }
    }, [onRegisterRefresh, refreshData]);

    // sync in modalità controllata
    // sincronizza SOLO quando cambia la referenza di controlledData
    const prevControlledRef = useRef<T[] | undefined>(undefined);

    useEffect(() => {
        if (isFetchMode) return;

        const data = controlledData ?? [];

        if (prevControlledRef.current === data) {
            setLoading(false);
            return;
        }
        prevControlledRef.current = data;

        setRows(prev => {
            if (rowKey) {
                const map = new Map<any, string>();
                prev.forEach(w => map.set(w.data[rowKey], w.__internalId));
                return data.map(item => ({
                    __internalId: map.get(item[rowKey]) ?? makeId(),
                    data: item,
                }));
            }
            // fallback: riusa id per indice
            return data.map((item, i) => ({
                __internalId: prev[i]?.__internalId ?? makeId(),
                data: item,
            }));
        });

        if (controlledResponse && !controlledResponse.success) {
            showAlertError(controlledResponse.message || "Errore caricamento dati");
        }
        setLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFetchMode, controlledData, rowKey, showAlertError]);

    const handleSearchClick = () => {
        const newFilters: F = {
            ...filters,
            page: 1,            // reset pagina a ogni ricerca
        };
        setFilters(newFilters);

        if (isFetchMode) {
            fetchData(newFilters);
        }
    };



    const [originalRows, setOriginalRows] = useState<RowWithId<T>[]>([]);

    // Ricompone filters + columnFilters e rilancia la fetch
    const handleColumnFilter = () => {
        // 1) Unisco i filtri “base” (search, page, per_page…) con quelli per colonna:
        const merged = {
            ...filters,
            ...columnFilters,
            page: 1,               // resetto la pagina
        } as F;

        // 2) Aggiorno lo stato e rilancio la fetch con TUTTI i filtri
        setFilters(merged);
        fetchData(merged);
    };

    const handleClearFilters = () => {
        // reset column filters
        setColumnFilters({});

        // ricostruisci i filtri base (search, page, per_page) da initialFilters
        const resetFilters = {
            ...(initialFilters as F),
            page: initialFilters.page ?? 1,
            per_page: initialFilters.per_page ?? 25,
        };
        setFilters(resetFilters);

        // reset sorting
        setSortField(null);
        setSortOrder(null);

        // rilancia la fetch se serve
        if (isFetchMode) {
            fetchData(resetFilters);
        }
    };

    // stato per ordinamento
    const [sortField, setSortField] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

    const handleSort = (field: string) => {
        // 1) calcolo nextOrder come prima
        let nextOrder: 'asc' | 'desc' | null;
        if (sortField !== field) nextOrder = 'asc';
        else if (sortOrder === 'asc') nextOrder = 'desc';
        else nextOrder = null;

        setSortField(nextOrder ? field : null);
        setSortOrder(nextOrder);

        // 2) prepariamo i nuovi filtri per il server: resetto la pagina a 1 e setto order_by/dir
        const newFilters: F = {
            ...filters,
            page: 1,
            order_by: nextOrder ? field : undefined,
            order_dir: nextOrder ?? undefined,
        } as F;
        setFilters(newFilters);

        // 3) rilancio fetchData (server-side sorted)
        fetchData(newFilters);
    };

    // 3) Calcolo le righe da mostrare, ordinate se richiesto
    const displayedRows = useMemo(() => {
        if (isFetchMode) return rows;
        if (!sortField || !sortOrder) return rows;
        const colCfg = columns.find(c => c.field === sortField)!;
        return [...rows].sort((a, b) => {
            const getVal = (w: RowWithId<T>) =>
                colCfg.computeValue
                    ? colCfg.computeValue(w.data)
                    : (w.data as any)[sortField];

            const va = getVal(a), vb = getVal(b);
            if (typeof va === "number" && typeof vb === "number") {
                return sortOrder === "asc" ? va - vb : vb - va;
            }
            return sortOrder === "asc"
                ? String(va).localeCompare(String(vb))
                : String(vb).localeCompare(String(va));
        });
    }, [rows, sortField, sortOrder, columns]);


    const openCreate = useCallback(() => {
        if (!hasCreateRow) { return; }

        setMode("create");
        setSelectedRow(null);
        setModalOpen(true);
    }, []);

    const openUpdate = (rowWrapper: RowWithId<T>) => {
        if (!hasUpdateRow) { return; }

        setSelectedRow(rowWrapper);
        setMode("update");
        setModalOpen(true);
    };

    const handleDelete = async (row: RowWithId<T>) => {

        if (!hasDeleteRow) { return; }

        const defaultOpts: SweetAlertOptions = {
            title: "Sei sicuro di voler eliminare questo elemento?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Elimina",
            confirmButtonColor: "#DC4C64",
            cancelButtonText: "Annulla",
            cancelButtonColor: "#9FA6B2"
        };

        // merge con le opzioni custom che arrivano da props
        const opts = { ...defaultOpts, ...deleteConfirmOptions };

        const result = await Swal2.fire(opts);

        if (!result.isConfirmed) { return; }

        try {
            showAlertLoading("Eliminazione in corso ...");
            const key = rowKey!;
            const id = row.data[key];      // OK, key è keyof T
            const args = { ...params, [key]: id } as P & Pick<T, typeof key>;
            console.log("Sto per eliminare, valore di", args);
            const result = await deleteData!(args);    // invoca la tua API con payload = params + dati univoci dal row.data

            if (result.response.success) {
                setRows(rs => rs.filter(r => r.__internalId !== row.__internalId));         // rimuovi localmente
                showAlertSuccess(result.response.message || "Eliminato con successo");
            } else {
                showAlertError(result.response.message || 'Errore durante il salvataggio.');
            }
        } catch (err: any) {
            showAlertError(err.message || "Errore in eliminazione");
        } finally {
            setLoading(false);
        }
    };

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // handler per bulk delete
    const handleBulkDelete = async () => {
        if (!bulkDeleteData || !rowKey || selectedIds.size === 0) return;
        const result = await Swal2.fire({
            title: `Eliminare ${selectedIds.size} elementi?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Elimina',
            confirmButtonColor: '#DC4C64',
            cancelButtonText: 'Annulla'
        });
        if (!result.isConfirmed) return;

        showAlertLoading('Eliminazione in corso …');
        // estrai gli IDs reali usando rowKey, con filter+map per evitare find non sicuro
        const uids = rows
            .filter(r => selectedIds.has(r.__internalId))
            .map(r => r.data[rowKey]);
        const resp = await bulkDeleteData(uids);
        if (resp.response.success) {
            setRows(rs => rs.filter(r => !selectedIds.has(r.__internalId)));
            setSelectedIds(new Set());
            showAlertSuccess(resp.response.message);
        } else {
            showAlertError(resp.response.message);
        }
    };

    const closeModal = useCallback(() => setModalOpen(false), []);

    const handleNewFormMessage = (res: requestResponse) => {
        if (res.success) {
            showAlertSuccess(res.message);
        } else {
            showAlertError(res.message);
        }
    }
    const handleCreateSuccess = (newItem: T) => {
        closeModal();
        setRows(prev => [{ __internalId: makeId(), data: newItem }, ...prev]);
    };

    const handleUpdateSuccess = (updatedData: T) => {
        if (!selectedRow) return;

        const newRow: RowWithId<T> = {
            __internalId: selectedRow.__internalId,
            data: updatedData,
        };
        setRows(prev =>
            prev.map(w =>
                w.__internalId === selectedRow.__internalId
                    ? newRow
                    : w
            )
        );
        setSelectedRow(null);
        closeModal();
    };

    const handlePageChange = useCallback((newPage: number) => {
        const nf = { ...filters, page: newPage } as F;
        setFilters(nf);
        fetchData(nf);
    }, [filters, fetchData]);

    const handlePerPageChange = useCallback((newPerPage: number) => {
        const nf = { ...filters, per_page: newPerPage, page: 1 } as F;
        setFilters(nf);
        fetchData(nf);
    }, [filters, fetchData]);

    const TableTitle = <div className="d-flex justify-content-between align-items-center m-0">
        <h5 className="text-fo-title text-uppercase fw-bold text-start m-0">
            {icon && <MDBIcon icon={icon} className="me-3" />}
            {title}
        </h5>
    </div>;

    const SearchBar = <div className="flex-grow-1 min-w-0">
        <MDBInputGroup className="w-100">
            <MDBInput
                className="form-control"
                label="Ricerca"
                type="text"
                value={filters.search || ""}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
            <MDBBtn type="button" outline onClick={handleSearchClick} className="text-nowrap fo-border bg-light">
                <MDBIcon fas icon="search" />
            </MDBBtn>
        </MDBInputGroup>
    </div>

    return (
        <>
            {(showSearch && !advancedFilters) && TableTitle}

            {/* Barra ricerca / eventuali altri filtri */}
            <div className="d-flex flex-wrap justify-content-between align-items-center my-3 gap-2">
                {(showSearch && !advancedFilters) && <>
                    {/* input di ricerca, cresce fino a esaurire lo spazio */}
                    {SearchBar}
                </>}

                {!(showSearch && !advancedFilters) && TableTitle}

                {/* pulsante Nuovo, non si allunga e va a capo se lo spazio diventa troppo stretto */}
                {(hasCreateRow || disableBtns.create) && (
                    <div className="flex-shrink-0 d-flex align-items-center gap-2">
                        <MDBBtn
                            noRipple
                            className="cta-primary d-block d-md-inline-block w-100 w-md-auto text-nowrap text-white"
                            onClick={hasCreateRow ? openCreate : undefined}
                            disabled={!hasCreateRow}
                            floating={isMobile}
                            rounded
                        >
                            <MDBIcon fas icon="plus" className={isMobile ? '' : "me-2"} />
                            {!isMobile && "Nuovo"}
                        </MDBBtn>

                        {bulkDeleteData && (
                            <MDBBtn
                                rounded
                                noRipple
                                color="danger"
                                className="text-nowrap text-white"
                                floating={isMobile}
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0}
                            >
                                <MDBIcon fas icon="trash" className={isMobile ? '' : 'me-2'} />
                                {!isMobile && 'Elimina selezionati'}
                            </MDBBtn>
                        )}
                    </div>
                )}
            </div >


            <FormAlert />

            <MDBTable align="middle" small hover responsive>
                <MDBTableHead light>
                    <tr>
                        {bulkDeleteData && (
                            <th>
                                <input
                                    type="checkbox"
                                    checked={rows.length > 0 && selectedIds.size === rows.length}
                                    onChange={e => {
                                        if (e.target.checked) {
                                            setSelectedIds(new Set(rows.map(r => r.__internalId)));
                                        } else {
                                            setSelectedIds(new Set());
                                        }
                                    }}
                                />
                            </th>
                        )}
                        {columns.map(col => (
                            <th key={col.field}>
                                <span
                                    style={{ cursor: 'pointer' }}
                                    className="d-flex align-items-center"
                                    onClick={() => handleSort(col.field)}
                                >
                                    {col.label}
                                    <MDBIcon
                                        fas
                                        icon={
                                            sortField === col.field
                                                ? sortOrder === 'asc' ? 'sort-down'
                                                    : sortOrder === 'desc' ? 'sort-up'
                                                        : 'sort'
                                                : 'sort'
                                        }
                                        className="ms-1"
                                    />
                                </span>
                            </th>
                        ))}
                        <th>Azioni</th>
                    </tr>

                    {/* riga filtri, visibile solo se advancedFilters */}
                    {(showSearch && advancedFilters) && (
                        <tr>
                            {bulkDeleteData && <th />}
                            {columns.map(col => (
                                <th key={String(col.field)}>
                                    {col.inputType === 'select' && col.options ? (
                                        <select
                                            className="form-select form-select-sm"
                                            value={columnFilters[col.field] ?? ''}
                                            onChange={e =>
                                                setColumnFilters(prev => ({
                                                    ...prev,
                                                    [col.field]: e.target.value
                                                }))
                                            }
                                        >
                                            <option value="">Tutti</option>
                                            {col.options.map(opt =>
                                                typeof opt === 'object'
                                                    ? <option key={opt.value} value={opt.value}>{opt.text}</option>
                                                    : <option key={opt} value={opt}>{opt}</option>
                                            )}
                                        </select>
                                    ) : (
                                        <MDBInput
                                            type={
                                                col.inputType === 'number' ? 'number'
                                                    : 'text'
                                            }
                                            size="sm"
                                            label={`Filtra ${col.label}`}
                                            value={columnFilters[col.field] ?? ''}
                                            onChange={e =>
                                                setColumnFilters(prev => ({
                                                    ...prev,
                                                    [col.field]: e.target.value
                                                }))
                                            }
                                        />
                                    )}
                                </th>
                            ))}
                            <th className="d-flex flex-row gap-2 justify-content-end">
                                {(showSearch && advancedFilters) && (
                                    <div className="d-flex flex-row gap-2 justify-content-end">
                                        <MDBBtn
                                            type="button"
                                            title="filtra"
                                            floating
                                            size="sm"
                                            color="primary"
                                            onClick={handleColumnFilter}
                                        >
                                            <MDBIcon fas icon="filter" />
                                        </MDBBtn>

                                        <MDBBtn
                                            type="button"
                                            title="ripristina filtri"
                                            floating
                                            size="sm"
                                            color="danger"
                                            onClick={handleClearFilters}
                                        >
                                            <MDBIcon fas icon="filter" />
                                        </MDBBtn>
                                    </div>
                                )}
                            </th>
                        </tr>
                    )}
                </MDBTableHead>
                <MDBTableBody>
                    {loading ? (
                        <tr>
                            <td colSpan={columns.length + 1}>
                                <General_Loading theme="formLoading" />
                            </td>
                        </tr>
                    ) : displayedRows.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + 1}>
                                <div className='d-flex justify-content-center m-4'>
                                    <h6 className="m-0">Nessun dato trovato.</h6>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        displayedRows.map((rowWrapper) => (
                            <tr key={rowWrapper.__internalId}>
                                {bulkDeleteData && (
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(rowWrapper.__internalId)}
                                            onChange={e => {
                                                const next = new Set(selectedIds);
                                                if (e.target.checked) next.add(rowWrapper.__internalId);
                                                else next.delete(rowWrapper.__internalId);
                                                setSelectedIds(next);
                                            }}
                                        />
                                    </td>
                                )}
                                {columns.map(col => {
                                    const rawValue = col.computeValue
                                        ? col.computeValue(rowWrapper.data)
                                        : rowWrapper.data[col.field as keyof typeof rowWrapper.data];

                                    const hasMeaningfulValue =
                                        rawValue !== undefined &&
                                        rawValue !== null &&
                                        (!(typeof rawValue === 'string') || rawValue.trim() !== '');

                                    const displayValue = hasMeaningfulValue
                                        ? rawValue
                                        : col.defaultValue;

                                    const isEmpty = String(displayValue ?? '').trim() === '';

                                    return (
                                        <td key={col.field} className={isEmpty ? 'text-center' : ''} >
                                            {React.isValidElement(displayValue)
                                                ? displayValue
                                                : String(displayValue ?? '-')}
                                        </td>
                                    );
                                })}

                                <td>
                                    <div className="d-flex flex-row gap-2 justify-content-end">
                                        {/* “Modifica rapida” */}
                                        {hasUpdateRow && (() => {
                                            const can = visibleUpdate?.(rowWrapper.data) ?? true;
                                            if (!disableBtns.update && (!can || !hasUpdateRow)) return null;

                                            // prendi order da props (se lo passi), altrimenti 2 di default
                                            const { order: updateOrder = 10, style: updateStyle, ...updateRest } =
                                                (/** qui potresti passare updateButtonProps dalla config */ {}) as {
                                                    order?: number;
                                                    style?: React.CSSProperties;
                                                };

                                            return (
                                                <MDBBtn
                                                    floating
                                                    size="sm"
                                                    title="Modifica rapida"
                                                    className="cta-edit"
                                                    onClick={can ? () => openUpdate(rowWrapper) : undefined}
                                                    disabled={!can}
                                                    {...updateRest}
                                                    style={{ ...updateStyle, order: updateOrder }}
                                                >
                                                    <MDBIcon fas icon="edit" />
                                                </MDBBtn>
                                            );
                                        })()}

                                        {/* “Elimina” */}

                                        {hasDeleteRow && (() => {
                                            const can = visibleDelete?.(rowWrapper.data) ?? true;
                                            if (!disableBtns.delete && (!can || !hasDeleteRow)) return null;

                                            // prendi order da props (se lo passi), altrimenti 1 di default
                                            const { order: deleteOrder = 20, style: deleteStyle, ...deleteRest } =
                                                (/** qui potresti passare deleteButtonProps dalla config */ {}) as {
                                                    order?: number;
                                                    style?: React.CSSProperties;
                                                };

                                            return (
                                                <MDBBtn
                                                    floating
                                                    size="sm"
                                                    title="Elimina"
                                                    onClick={can ? () => handleDelete(rowWrapper) : undefined}
                                                    disabled={!can}
                                                    {...deleteRest}
                                                    style={{ backgroundColor: '#cf4403', ...deleteStyle, order: deleteOrder }}
                                                >
                                                    <MDBIcon fas icon="trash" />
                                                </MDBBtn>
                                            );
                                        })()}

                                        {/* Action dinamiche */}
                                        {actions?.map((act, i) => {
                                            const data = rowWrapper.data;
                                            if (act.visible && !act.visible(data)) return null;

                                            // prendo order dalla config, se non c'è uso i come default
                                            const btnOrder = act.order ?? i + 1;

                                            // unisco lo style esistente con order
                                            const btnStyle = {
                                                ...(act.buttonProps?.style || {}),
                                                order: btnOrder
                                            };

                                            return (
                                                <MDBBtn
                                                    key={i}
                                                    floating
                                                    size="sm"
                                                    {...act.buttonProps}
                                                    style={btnStyle}
                                                    onClick={() => act.onClick(data)}
                                                >
                                                    {act.icon && <MDBIcon fas icon={act.icon} />}
                                                    {act.label}
                                                </MDBBtn>
                                            );
                                        })}
                                    </div>
                                </td>

                            </tr>
                        ))
                    )}
                </MDBTableBody>
            </MDBTable >

            <div className="d-flex justify-content-end align-items-center mt-3">
                <GeneralPagination
                    page={filters.page}
                    perPage={filters.per_page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChange}
                />
            </div>


            <MDBModal open={modalOpen} onClose={closeModal} staticBackdrop>
                <MDBModalDialog centered size="lg">
                    <MDBModalContent>
                        <MDBModalHeader>
                            <h5 className="modal-title">
                                {mode === "create" ? "Nuovo elemento" : "Modifica elemento"}
                            </h5>
                            <MDBBtn className="btn-close" color="none" onClick={closeModal} />
                        </MDBModalHeader>
                        <MDBModalBody className="pb-0 mb-3">
                            {mode === "create" && (
                                <GeneralForm<T, P>
                                    mode="create"
                                    hideHeader
                                    fields={createFields}
                                    params={params}
                                    createData={createData!}
                                    onSuccess={handleCreateSuccess}
                                    onNewMessage={handleNewFormMessage}
                                />
                            )}
                            {mode === "update" && selectedRow && (
                                <GeneralForm<T, P>
                                    mode="update"
                                    hideHeader
                                    fields={updateFields}
                                    data={selectedRow!.data}
                                    response={{ success: true, message: "" }}
                                    params={params}
                                    updateData={updateData!}
                                    onSuccess={handleUpdateSuccess}
                                    onNewMessage={handleNewFormMessage}
                                />
                            )}
                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>
    );
}

export default GeneralTable;
