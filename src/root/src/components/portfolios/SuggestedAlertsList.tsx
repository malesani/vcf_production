import React from "react";
import {
    MDBCard,
    MDBCardBody,
    MDBIcon,
    MDBBadge,
    MDBBtn,
    MDBCardHeader,
    MDBCardTitle,
} from "mdb-react-ui-kit";

import { SymbolWeighing } from "../../api_module/operations/OperationsRequest";

interface Props {
    realOpsRes: SymbolWeighing[] | undefined;
    setSelectedOp: Function;
    setOpenExecuteModal: (open: boolean) => void;
    setOpenPreviewModal: (open: boolean) => void;
}

const SuggestedAlertsList: React.FC<Props> = ({
    realOpsRes,
    setSelectedOp,
    setOpenExecuteModal,
    setOpenPreviewModal,
}) => {
    if (!realOpsRes || !Array.isArray(realOpsRes)) return null;

    // 1️⃣ Filtrar solo los que tienen source = "alert"
    const alertsOnly = realOpsRes.filter((item) => item.source === "alert");

    // 2️⃣ Agrupar por nfo_uid
    const grouped: Record<string, SymbolWeighing[]> = alertsOnly.reduce(
        (acc, item) => {
            if (!item.nfo_uid) return acc;
            if (!acc[item.nfo_uid]) acc[item.nfo_uid] = [];
            acc[item.nfo_uid].push(item);
            return acc;
        },
        {} as Record<string, SymbolWeighing[]>
    );

    // 3️⃣ Convertir en array de grupos
    const groupedArray = Object.entries(grouped);

    if (groupedArray.length === 0) return null;

    return (
        <div className="mb-5">
            <MDBCard className="mb-4">
                <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
                            {/* <MDBIcon fas icon="bars" /> */}
                            <span className='mx-2'>Operazioni Consigliate</span>
                        </MDBCardTitle>
                    </div>
                </MDBCardHeader>
                {groupedArray.map(([nfo_uid, alerts]) => (
                    <div key={nfo_uid}>
                        <MDBCardBody>
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <div className="d-flex align-items-center">
                                    {/* <MDBIcon fas icon="exclamation-circle" className="text-warning me-2" /> */}
                                    <h5 className="mb-0">Alert {nfo_uid}</h5>
                                </div>
                                {/* <MDBBtn
                                    color="primary"
                                    size="sm"
                                    onClick={() => setOpenPreviewModal(true)}
                                >
                                    <MDBIcon fas icon="question-circle" />
                                </MDBBtn> */}
                            </div>

                            {/* LISTA DE ASSETS */}
                            <ul className="list-group list-group-flush">
                                {alerts.map((op, idx) => {
                                    const action = op.unitQuantity_suggested < op.unitQuantity_now ? "sell" : "buy";
                                    return (
                                        <li
                                            key={`alert-${nfo_uid}-${idx}`}
                                            className="list-group-item d-flex justify-content-between align-items-center border-0"
                                        >
                                            <span>
                                                <strong>{op.symbol}</strong>{" "}
                                                {op.unitQuantity_now} unit →{" "}
                                                {op.unitQuantity_suggested} unit{" "}
                                            </span>
                                            {/* <div>
                                                <MDBBadge
                                                    color={action === "sell" ? "danger" : "success"}
                                                    className="ms-2"
                                                >
                                                    {action}
                                                </MDBBadge>
                                                <span className="">
                                                    {op.unitQuantity_suggested > op.unitQuantity_now
                                                        ? op.unitQuantity_suggested + op.unitQuantity_now
                                                        : op.unitQuantity_now - op.unitQuantity_suggested}{""}
                                                </span>
                                                <span>units</span>
                                            </div> */}

                                            <div>
                                                <MDBBtn
                                                    color="success"
                                                    size="sm"
                                                    className="me-2"
                                                    onClick={() => {
                                                        setSelectedOp(op);
                                                        setOpenExecuteModal(true);
                                                    }}
                                                >
                                                    <MDBIcon fas icon="play" className="me-2" />
                                                    Esegui
                                                </MDBBtn>
                                                {/* <MDBBtn
                                                    color="warning"
                                                    size="sm"
                                                    onClick={() => console.log("Ignorato alert", op.symbol)}
                                                >
                                                    Ignora
                                                </MDBBtn> */}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </MDBCardBody>
                    </div>
                ))
                }
            </MDBCard >
        </div >
    );
};

export default SuggestedAlertsList;
