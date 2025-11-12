import {
  MDBModal, MDBModalDialog, MDBModalContent, MDBModalHeader,
  MDBModalTitle, MDBBtn, MDBModalBody, MDBBadge
} from "mdb-react-ui-kit";
import { useMemo, useState } from "react";
import { GeneralForm, FieldConfig } from "../../app_components/GeneralForm";
import { createCashOperation, OperationItem } from "../../api_module/operations/OperationsRequest";

type CashOperationModalProps = {
  portfolio_uid: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  kind: 'deposit' | 'withdraw';
  currentCash?: number;         // opzionale, se vuoi mostrarlo nel header
  source?: 'manual';
  onSuccess?: () => void;       // callback refresh dati
};


const fmtEUR = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

const CashOperationModal: React.FC<CashOperationModalProps> = ({
  portfolio_uid,
  open,
  setOpen,
  kind,
  currentCash,
  onSuccess
}) => {

  const title = useMemo(
    () => (kind === 'deposit' ? 'Deposita liquidità' : 'Preleva liquidità'),
    [kind]
  );

  // Campi del form (un solo campo: importo)
  const fields: FieldConfig<OperationItem>[] = [
    {
      name: 'unitaryPrice',
      label: 'Importo (€)',
      type: 'number',
      required: true,
      properties: {
        minValue: 0,
        stepValue: 0.01,
      },
      grid: { md: 12 },
    },
  ];

  return (
    <MDBModal open={open} setOpen={setOpen} tabIndex={-1}>
      <MDBModalDialog>
        <MDBModalContent>
          <MDBModalHeader>
            <MDBModalTitle className="d-flex align-items-center gap-2">
              {title}
              <MDBBadge color={kind === 'deposit' ? 'success' : 'danger'} pill>
                {kind === 'deposit' ? 'DEPOSIT' : 'WITHDRAW'}
              </MDBBadge>
            </MDBModalTitle>
            <MDBBtn className="btn-close" color="none" onClick={() => setOpen(false)} />
          </MDBModalHeader>

          <MDBModalBody>
            {typeof currentCash === 'number' && (
              <div className="rounded bg-light p-2 mb-3 small">
                <div className="d-flex justify-content-between">
                  <div>Liquidità attuale</div>
                  <strong>{fmtEUR(currentCash)}</strong>
                </div>
              </div>
            )}

            <GeneralForm<OperationItem, {portfolio_uid: string, operation: "deposit" | "withdraw" }>
              mode="create"
              fields={fields}
              params={{portfolio_uid: portfolio_uid, operation: kind}}
              createData={createCashOperation}
              createBtnProps={{
                label: kind === 'deposit' ? 'Conferma deposito' : 'Conferma prelievo',
              }}
              onSuccess={async () => {
                // chiudi e refresh
                setOpen(false);
                onSuccess?.();
              }}
            />
          </MDBModalBody>
        </MDBModalContent>
      </MDBModalDialog>
    </MDBModal>
  );
};

export default CashOperationModal;
