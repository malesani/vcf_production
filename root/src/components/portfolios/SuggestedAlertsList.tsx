import React from "react";
import {
    MDBCard,
    MDBCardBody,
    MDBIcon,
    MDBBtn,
    MDBCardHeader,
    MDBCardTitle,
} from "mdb-react-ui-kit";

import { SymbolWeighing, OperationItem } from "../../api_module/operations/OperationsRequest";

interface Props {
    alertsInfo: SymbolWeighing[] | undefined;
    realOpsRes: OperationItem[] | [];
    setSelectedOp: Function;
    setOpenExecuteModal: (open: boolean) => void;
    setOpenPreviewModal: (open: boolean) => void;
}

const SuggestedAlertsList: React.FC<Props> = ({
    alertsInfo,
    realOpsRes,
    setSelectedOp,
    setOpenExecuteModal,
}) => {

    if (!alertsInfo || !Array.isArray(alertsInfo)) return null;

    // 1️⃣ Filtrar solo los que vienen de alert
    const alertsOnly = alertsInfo.filter((item) => item.source === "alert");

    // 2️⃣ Agrupar por NFO
    const grouped = alertsOnly.reduce((acc, item) => {
        if (!item.nfo_uid) return acc;
        if (!acc[item.nfo_uid]) acc[item.nfo_uid] = [];
        acc[item.nfo_uid].push(item);
        return acc;
    }, {} as Record<string, SymbolWeighing[]>);

    const groupedArray = Object.entries(grouped);

    // 3️⃣ Filtrar grupos que tienen al menos 1 operación válida
    const filteredGroups = groupedArray
        .map(([nfo_uid, alerts]) => ({
            nfo_uid,
            alerts: alerts.filter(
                (op) => op.unitQuantity_now !== op.unitQuantity_suggested
            ),
        }))
        .filter((group) => group.alerts.length > 0); // si queda vacío → NO mostrar

    if (filteredGroups.length === 0) return null; // ⬅️ No hay nada que mostrar

    return (
        <div className="mb-5">
            <MDBCard className="mb-4">
                <MDBCardHeader
                    className="py-3 px-4 border-bottom"
                    style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                >
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <MDBCardTitle tag="h5" className="mb-2 mb-md-0">
                            <span className="mx-2">Operazioni Consigliate</span>
                        </MDBCardTitle>
                    </div>
                </MDBCardHeader>

                {/* 🔥 Mostrar solo grupos válidos */}
                {filteredGroups.map(({ nfo_uid, alerts }) => (
                    <div key={nfo_uid}>
                        <MDBCardBody>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h5 className="mb-0">Alert {nfo_uid}</h5>
                            </div>

                            <ul className="list-group list-group-flush">
                                {alerts.map((op, idx) => {
                                    const action =
                                        op.unitQuantity_suggested < op.unitQuantity_now
                                            ? "sell"
                                            : "buy";

                                    return (
                                        <li
                                            key={`alert-${nfo_uid}-${idx}`}
                                            className="list-group-item d-flex justify-content-between align-items-center border-0"
                                        >
                                            <span>
                                                <strong>{op.symbol}</strong>{" "}
                                                {op.unitQuantity_now} unit →{" "}
                                                {op.unitQuantity_suggested} unit
                                            </span>

                                            <div>
                                                <MDBBtn
                                                    color="success"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => {
                                                        const match = realOpsRes.find(
                                                            (r) =>
                                                                r.nfo_uid === op.nfo_uid &&
                                                                r.symbol === op.symbol
                                                        );

                                                        let selectedOp;

                                                        if (match) {
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
                                                                op.unitQuantity_suggested -
                                                                    op.unitQuantity_now
                                                            );
                                                            const operation =
                                                                op.unitQuantity_suggested >
                                                                op.unitQuantity_now
                                                                    ? "buy"
                                                                    : "sell";

                                                            selectedOp = {
                                                                nfo_uid: op.nfo_uid,
                                                                symbol: op.symbol,
                                                                operation,
                                                                unitaryPrice: 0,
                                                                unitQuantity: quantityDiff,
                                                                source: "alert",
                                                            };
                                                        }

                                                        setSelectedOp(selectedOp);
                                                        setOpenExecuteModal(true);
                                                    }}
                                                >
                                                    <MDBIcon fas icon="play" className="me-2" />
                                                    Esegui
                                                </MDBBtn>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </MDBCardBody>
                    </div>
                ))}
            </MDBCard>
        </div>
    );
};

export default SuggestedAlertsList;
