import { MDBCard, MDBCardHeader, MDBCardTitle, MDBListGroup, MDBListGroupItem, MDBIcon, MDBBadge, MDBCardBody, MDBRow, MDBCol, MDBCardText, MDBTooltip, MDBProgress, MDBProgressBar, MDBBtn, MDBModal, MDBModalBody, MDBModalContent, MDBModalDialog, MDBModalHeader, MDBModalTitle } from "mdb-react-ui-kit";


import { PortfolioInfo } from '../../api_module/portfolio/PortfolioData';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';
import { useEffect, useMemo, useState } from "react";
import { SuggestedAlertsOps, OperationItem, SymbolWeighing, createOperation } from '../../api_module/operations/OperationsRequest';

import { FieldConfig, GeneralForm } from '../../app_components/GeneralForm';

import General_Loading from "../../app_components/General_Loading";

interface Props {
    portfolio: PortfolioInfo;
    managedInfo?: PortManagedInfo;
    assetPrices?: Record<string, number | null>;
    operations?: OperationItem[];
    onSuccess?: () => void;
    pesature: SymbolWeighing[] | undefined;
    realOps: OperationItem[];
}



const AssetAllecation: React.FC<Props> = ({ portfolio, assetPrices, operations, onSuccess, pesature, realOps }) => {
    console.log(pesature, "pesature")
    console.log(realOps, "realOps")
    const { assets } = portfolio;

    //last operation
    const [dateLastOperation, setDateLastOperation] = useState<string>("");

    const [openExecuteModal, setOpenExecuteModal] = useState<boolean>(false);

    const [selectedOp, setSelectedOp] = useState<OperationItem | null>(null);

    //gestione pessature 
    const [alerts, setAlerts] = useState<OperationItem[] | null>();

    const toNumber = (val: any): number => {
        const num = typeof val === 'number' ? val : parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    const fmtEUR = (n: number) =>
        new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(
            toNumber(n)
        );



    //useEffets
    useEffect(() => {
        if (operations != null) {
            setAlerts(operations)
        }
    }, [operations]);


    //fields 
    const operation_FieldConfig: FieldConfig<OperationItem>[] = [
        {
            name: 'unitQuantity',
            label: 'Quantita',
            type: 'number',
            properties: { defaultValue: Math.abs(Number(selectedOp?.unitQuantity ?? 1)) },
            required: true,
            grid: { md: 12 },
        },
        {
            name: 'unitaryPrice',
            label: 'Valore Unitario',
            type: 'number',
            properties: { defaultValue: Number(selectedOp?.unitaryPrice ?? 0) },
            required: true,
            grid: { md: 12 },
        },
    ];

    return (
        <MDBCol md="12" className="" style={{ overflow: "auto" }}>
            {pesature === undefined && (
                <General_Loading theme="formLoading" text="Caricamento Portafogli" />
            )}
            <MDBListGroup light small>
                {(pesature ?? []).map((p) => {
                    //hago match di operation valida con assetsweight
                    const operationFind = realOps.find((op) => op.symbol === p.symbol);
                    console.log(operationFind, "operationFind")

                    const percent = Math.round(p.percentage_now ?? 0);
                    const suggestedPct = Math.round(p.percentage_suggested ?? 0);
                    const qty = p.unitQuantity_now ?? 0;
                    const idealQty = p.unitQuantity_suggested ?? 0;

                    //dati da prendere da operation
                    const typeOperation = operationFind?.operation;
                    const operationQty = operationFind?.unitQuantity;
                    const unitaryPrice = operationFind?.unitaryPrice ?? 0;
                    const source = operationFind?.source
                    const nfo_uid = operationFind?.nfo_uid;

                    const safeSuggested = Math.max(0, Math.min(100, suggestedPct));
                    const safePercent = Math.max(0, Math.min(100, percent));

                    const beforeWidth = Math.min(safePercent, safeSuggested);
                    const afterWidth = Math.abs(safePercent - safeSuggested);
                    const beforeColor = "primary";
                    const afterColor = safePercent < safeSuggested ? "success" : safePercent > safeSuggested ? "danger" : "info";

                    return (
                        <MDBListGroupItem key={p.symbol}>
                            <div className="m-0">
                                <div className="d-flex justify-content-between small mb-2 flex-wrap">
                                    <span className="fw-bold">{p.symbol}</span>
                                    <div className="d-flex align-items-center w-100 justify-content-between justify-content-md-end">
                                        <span>
                                            Attuale: <strong>{qty}</strong>
                                            <br />
                                        </span>

                                        <span className="ms-2">Consigliata: <strong>{idealQty}</strong></span>

                                        {qty !== idealQty && (
                                            <MDBBtn
                                                color="warning"
                                                size="sm"
                                                className="text-muted p-0 ms-2"
                                                onClick={() => {
                                                    setOpenExecuteModal(true);
                                                    setSelectedOp({
                                                        symbol: p.symbol,
                                                        operation: typeOperation,
                                                        unitQuantity: operationQty,
                                                        unitaryPrice: unitaryPrice,
                                                        source: source,
                                                        nfo_uid: nfo_uid,
                                                    } as OperationItem);
                                                }}
                                            >
                                                <b className="text-white p-2">allinea</b>
                                            </MDBBtn>
                                        )}
                                    </div>
                                </div>

                                <div className="position-relative" style={{ height: "18px" }}>
                                    <MDBProgress className="rounded" height="10">
                                        <MDBProgressBar striped width={beforeWidth} bgColor={beforeColor} />
                                        {afterWidth > 0 && (
                                            <MDBProgressBar striped width={afterWidth} bgColor={afterColor} />
                                        )}
                                    </MDBProgress>

                                    {/* 🔽 Flecha que indica la pesatura attuale */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            bottom: "4px",
                                            left: `${safePercent}%`,
                                            transform: "translateX(-50%)",
                                            width: 0,
                                            height: 0,
                                            borderLeft: "6px solid transparent",
                                            borderRight: "6px solid transparent",
                                            borderBottom: "8px solid #263550", // flecha azul oscura
                                            zIndex: 3,
                                        }}
                                        title={`Pesatura attuale: ${safePercent}%`}
                                    ></div>

                                    {/* 🔵 Punto per la pesatura consigliata */}
                                    <div
                                        style={{
                                            position: "absolute",
                                            top: "20%",
                                            left: `${safeSuggested}%`,
                                            transform: "translate(-50%, -50%)",
                                            width: "10px",
                                            height: "10px",
                                            borderRadius: "50%",
                                            backgroundColor:
                                                safePercent < safeSuggested
                                                    ? "#14A44D"
                                                    : safePercent > safeSuggested
                                                        ? "#DC4C64"
                                                        : "rgb(38, 53, 80)",
                                            border: "2px solid white",
                                            boxShadow: "0 0 3px rgba(0,0,0,0.3)",
                                            zIndex: 2,
                                        }}
                                        title={`Pesatura consigliata: ${safeSuggested}%`}
                                    />
                                </div>

                                <div className="d-flex align-items-center justify-content-between m-0">
                                    <div>
                                        <span className="text-muted me-2">Attuale:</span>
                                        <span className="fw-bold">{safePercent}%</span>
                                    </div>
                                    <div>
                                        <span className="text-muted me-2">Consigliata:</span>
                                        <span className="fw-bold">{safeSuggested}%</span>
                                    </div>
                                </div>
                            </div>
                        </MDBListGroupItem>
                    );
                })}
            </MDBListGroup>

            {/* MODALE ESEGUI OPERAZIONE */}
            <MDBModal open={openExecuteModal} setOpen={setOpenExecuteModal} tabIndex={-1}>
                <MDBModalDialog>
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Esegui Operazione</MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={() => setOpenExecuteModal(false)} />
                        </MDBModalHeader>
                        <MDBModalBody>
                            {/* header sintetico */}
                            {selectedOp && (
                                <div className="rounded bg-light p-2 mb-3 small">
                                    <div className="d-flex justify-content-between">
                                        <div>
                                            <strong>{selectedOp.symbol}</strong> —{' '}
                                            <MDBBadge color={selectedOp.operation === 'buy' ? 'success' : 'danger'}>
                                                {selectedOp.operation === 'buy' ? 'Compra' : 'Vendi'}
                                            </MDBBadge>
                                        </div>
                                        <div>
                                            Qta: <strong>{selectedOp.unitQuantity}</strong> · Prezzo:{' '}
                                            <strong>{fmtEUR(selectedOp.unitaryPrice as number)}</strong>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <GeneralForm<OperationItem, {}>
                                mode="create"
                                fields={operation_FieldConfig}
                                params={{
                                    portfolio_uid: portfolio.portfolio_uid,
                                    symbol: selectedOp?.symbol,
                                    operation: selectedOp?.operation,
                                    source: selectedOp?.source,
                                    nfo_uid: selectedOp?.nfo_uid
                                }}
                                createData={createOperation}
                                createBtnProps={{ label: 'Conferma operazione' }}
                                onSuccess={async () => {
                                    setOpenExecuteModal(false);
                                    onSuccess?.();
                                    setDateLastOperation("now")
                                }}
                            />
                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>

        </MDBCol>

    )
}

export default AssetAllecation;