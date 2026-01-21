import React, { useState } from "react";
import {
    MDBCard,
    MDBCardBody,
    MDBIcon,
    MDBBtn,
    MDBCardHeader,
    MDBCardTitle,
    MDBModal,
    MDBModalBody,
    MDBModalContent,
    MDBModalDialog,
    MDBModalHeader,
    MDBModalTitle,
    MDBAlert,
    MDBBadge,
} from "mdb-react-ui-kit";

import { SymbolWeighing, OperationItem } from "../../api_module/operations/OperationsRequest";
import { NfoInfo } from '../../api_module/nfo/NfoData';

interface Props {
    validReportWeighing: SymbolWeighing[] | undefined;
    realOpsRes: OperationItem[] | [];
    alertsInfo: NfoInfo[];
    setSelectedOp: Function;
    setOpenExecuteModal: (open: boolean) => void;
    setOpenPreviewModal: (open: boolean) => void;
}

const SuggestedAlertsList: React.FC<Props> = ({
    validReportWeighing,
    realOpsRes,
    setSelectedOp,
    setOpenExecuteModal,
    alertsInfo
}) => {
    if (!validReportWeighing || !Array.isArray(validReportWeighing)) return null;
    console.log(alertsInfo)
    // Modale anteprima HTML NFO
    const [htmlPreview, setHtmlPreview] = useState<string>('');
    const [modalTitle, setModalTitle] = useState<string>('');
    const [openPreviewModal, setOpenPreviewModal] = useState(false);

    // 1️⃣ Filtrar solo los que vienen de alert
    const alertsOnly = validReportWeighing.filter((item) => item.source === "alert");

    // 2️⃣ Agrupar por NFO
    const grouped = alertsOnly.reduce((acc, item) => {
        if (!item.nfo_uid) return acc;
        if (!acc[item.nfo_uid]) acc[item.nfo_uid] = [];
        acc[item.nfo_uid].push(item);
        return acc;
    }, {} as Record<string, SymbolWeighing[]>);

    const groupedArray = Object.entries(grouped);

    const filteredGroups = groupedArray
        .map(([nfo_uid, alerts]) => {
            const filteredAlerts = alerts.filter(
                (op) => op.unitQuantity_now !== op.unitQuantity_suggested
            );

            // 👇 buscamos el NfoInfo correspondiente por nfo_uid en alertsInfo
            const alertInfo = alertsInfo.find((a) => a.nfo_uid === nfo_uid);

            return {
                nfo_uid,
                alerts: filteredAlerts,
                alertInfo,                 // <- aquí tienes el objeto NfoInfo
                html_body: alertInfo?.html_body, // <- acceso directo si te interesa



            };
        })
        .filter((group) => group.alerts.length > 0); // si queda vacío → NO mostrar

    if (filteredGroups.length === 0) return null;

    // UTILITIES
    const formatItalianDate = (dateString: string | undefined) => {
        if (!dateString) return "";

        // gestisce formati tipo "2025-10-28 00:00:00"
        const safeString = dateString.replace(" ", "T");
        const date = new Date(safeString);

        if (isNaN(date.getTime())) {
            // se non è una data valida, restituisco l'originale
            return dateString;
        }

        return date.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    };


    return (
        <>
            <MDBCard className="mb-5">
                <MDBCardHeader style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
                            Operazioni Consigliate
                        </MDBCardTitle>
                    </div>
                </MDBCardHeader>
                ️<MDBCardBody className="p-0 overflow-auto my-1 mx-4">
                    {filteredGroups.map(({ nfo_uid, alerts, alertInfo }) => (
                        <div className="mb-0" style={{ minWidth: "700px" }}>
                            <MDBAlert open className='w-100 border m-0 mb-0 py-3' color='light'>
                                <div className="mb-2 mb-md-0 w-100 ">
                                    <div className='d-flex align-items-center justify-content-between'>
                                        <div>
                                            <MDBIcon className="me-3" fas icon="exclamation-triangle" color="warning" />
                                            <strong>{alertInfo?.title}</strong>
                                        </div>
                                        <div className="d-flex flex-row justify-content-end align-items-center">
                                            <MDBBadge color='secondary' light rounded>
                                                {formatItalianDate(alertInfo?.scheduled_at)}
                                            </MDBBadge>
                                            <MDBBtn className="ms-3 btn-sm" rounded floating color="secondary" size="sm" style={{ cursor: "pointer" }}>
                                                <MDBIcon fas icon="info"
                                                    onClick={() => {
                                                        setHtmlPreview(alertInfo?.html_body ?? "");
                                                        setModalTitle(alertInfo?.title ?? 'Anteprima');
                                                        setOpenPreviewModal(true);
                                                    }}
                                                />
                                            </MDBBtn>
                                        </div>
                                    </div>
                                </div>
                            </MDBAlert>

                            <ul className="list-group list-group-flush p-0">
                                {alerts.map((op, idx) => {
                                    // 👉 buscamos si ya existe una operación real asociada a este alert
                                    const match = realOpsRes.find(
                                        (r) => r.nfo_uid === op.nfo_uid && r.symbol === op.symbol
                                    );

                                    // 👉 precio a mostrar (si no hay match, lo dejamos a 0 o null)
                                    const unitaryPrice = match?.unitaryPrice ?? 0; // o `undefined` si prefieres

                                    return (
                                        <li
                                            key={`alert-${nfo_uid}-${idx}`}
                                            className="list-group-item d-flex justify-content-between align-items-center py-3"
                                        >
                                            <span>
                                                <strong>{op.symbol}</strong>
                                                <span className="ms-2">({unitaryPrice}€)</span>
                                            </span>

                                            <span className="text-muted">
                                                Attuale: {op.unitQuantity_now} → Consigliato: {op.unitQuantity_suggested}
                                            </span>

                                            <span>
                                                {op.unitQuantity_suggested > op.unitQuantity_now ? "Compra" : "Vendi"}
                                                <b className="ms-2">{Math.abs(op.unitQuantity_suggested - op.unitQuantity_now)}</b>
                                            </span>

                                            <div>
                                                {/* <h5 className="d-none">
                                                <MDBBadge
                                                    color="warning" light
                                                    style={{ cursor: "pointer" }}
                                                    size="md"
                                                    className="d-flex align-items-center justify-content-center border border-1 border-warning"
                                                    onClick={() => {
                                                        let selectedOp;

                                                        if (match) {
                                                            // 👉 usamos el mismo match calculado arriba
                                                            selectedOp = {
                                                                nfo_uid: match.nfo_uid,
                                                                symbol: match.symbol,
                                                                operation: match.operation,
                                                                unitaryPrice: match.unitaryPrice,
                                                                unitQuantity: match.unitQuantity,
                                                                source: match.source,
                                                            };
                                                        } else {
                                                            const quantityDiff = Math.abs(
                                                                op.unitQuantity_suggested - op.unitQuantity_now
                                                            );
                                                            const operation =
                                                                op.unitQuantity_suggested > op.unitQuantity_now
                                                                    ? "buy"
                                                                    : "sell";

                                                            selectedOp = {
                                                                nfo_uid: op.nfo_uid,
                                                                symbol: op.symbol,
                                                                operation,
                                                                unitaryPrice: 0, // aquí puedes poner el valor por defecto que quieras
                                                                unitQuantity: quantityDiff,
                                                                source: "alert",
                                                            };
                                                        }

                                                        setSelectedOp(selectedOp);
                                                        setOpenExecuteModal(true);
                                                    }}

                                                    title="Preleva"
                                                >
                                                    <span color="warning">ESEGUI</span>
                                                </MDBBadge>
                                            </h5> */}

                                                <MDBBtn
                                                    color="warning"
                                                    className="py-2 px-3"
                                                    onClick={() => {
                                                        let selectedOp;

                                                        if (match) {
                                                            // 👉 usamos el mismo match calculado arriba
                                                            selectedOp = {
                                                                nfo_uid: match.nfo_uid,
                                                                symbol: match.symbol,
                                                                operation: match.operation,
                                                                unitaryPrice: match.unitaryPrice,
                                                                unitQuantity: match.unitQuantity,
                                                                source: match.source,
                                                            };
                                                        } else {
                                                            const quantityDiff = Math.abs(
                                                                op.unitQuantity_suggested - op.unitQuantity_now
                                                            );
                                                            const operation =
                                                                op.unitQuantity_suggested > op.unitQuantity_now
                                                                    ? "buy"
                                                                    : "sell";

                                                            selectedOp = {
                                                                nfo_uid: op.nfo_uid,
                                                                symbol: op.symbol,
                                                                operation,
                                                                unitaryPrice: 0, // aquí puedes poner el valor por defecto que quieras
                                                                unitQuantity: quantityDiff,
                                                                source: "alert",
                                                            };
                                                        }

                                                        setSelectedOp(selectedOp);
                                                        setOpenExecuteModal(true);
                                                    }}
                                                >

                                                    Esegui
                                                </MDBBtn>

                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </MDBCardBody>
            </MDBCard>
            {/* Modal anteprima HTML di PDF */}
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

export default SuggestedAlertsList;
