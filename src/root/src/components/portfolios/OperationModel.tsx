import { MDBModal, MDBModalDialog, MDBModalContent, MDBModalHeader, MDBModalTitle, MDBBtn, MDBModalBody, MDBBadge } from "mdb-react-ui-kit";
import { OperationItem, createOperation, fetchOperationsPaginated, ExecutedOperationSelect } from "../../api_module/operations/OperationsRequest";
import { GeneralForm, FieldConfig } from "../../app_components/GeneralForm";


//props and types

type OperationsModelProps = {
    portfolio_uid: string;
    editOpen: boolean;
    setEditOpen: Function;
    selectedOp: ExecutedOperationSelect | null;
    onSuccess?: () => void;
};


const fmtEUR = (n: number | string | null | undefined) =>
    new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 2,
    }).format(Number(n ?? 0));




//componente
const OperationModel: React.FC<OperationsModelProps> = ({ portfolio_uid, editOpen, setEditOpen, selectedOp, onSuccess }) => {
    const operation_FieldConfig: FieldConfig<OperationItem>[] = [
        {
            name: 'operation',
            label: "operazione da esseguire",
            type: "selectbox",
            options: [{ text: "Vendi", value: "sell" }, { text: "Compra", value: "buy" },],
            customElementKey: "dual_switch",
            readOnly: (() => {return true})

        },
        {
            name: 'unitQuantity',
            label: 'Quantita',
            type: 'number',
            properties: { defaultValue: Number(selectedOp?.unitQuantity) ?? 0 },
            required: true,
            grid: { md: 12 },
        },
        {
            name: 'unitaryPrice',
            label: 'Valore Unitario',
            type: 'number',
            properties: { defaultValue: Number(selectedOp?.unitaryPrice_now) ?? 0 },
            required: true,
            grid: { md: 12 },
        },
    ];
    return (
        <>
            <MDBModal open={editOpen} setOpen={setEditOpen} tabIndex={-1}>
                <MDBModalDialog>
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Esegui Operazione</MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={() => setEditOpen(false)} />
                        </MDBModalHeader>
                        <MDBModalBody>
                            {/* header sintetico */}
                            {selectedOp && (
                                <>
                                    <div className="rounded bg-light p-2 mb-3 small">
                                        <div className="d-flex justify-content-between">
                                            <div>
                                                <strong>{selectedOp.symbol}</strong> —{' '}<br></br>
                                                Qta possedute: <strong>{selectedOp.unitQuantity}</strong> ·
                                            </div>
                                            <div>

                                                Prezzo Attuale Unitario:{' '}<strong>{fmtEUR(selectedOp.unitaryPrice_now)}</strong>
                                            </div>
                                        </div>
                                    </div>


                                    <GeneralForm<OperationItem, { portfolio_uid: string; symbol: string; }>
                                        mode="create"
                                        fields={operation_FieldConfig}
                                        params={{ portfolio_uid: portfolio_uid, symbol: selectedOp.symbol }}
                                        createData={createOperation}
                                        createBtnProps={{ label: 'Conferma operazione' }}
                                        onSuccess={async () => {
                                            setEditOpen(false)
                                            onSuccess?.();
                                        }}
                                    />
                                </>
                            )}
                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>
    )

}
export default OperationModel



