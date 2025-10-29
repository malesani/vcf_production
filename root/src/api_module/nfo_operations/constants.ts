import { FieldConfig } from '../../app_components/GeneralForm';
export type OperationInfo = {
    operation_uid: string;          // UID
    portfolio_uid: string;          // Portafoglio di riferimento
    nfo_uid: string;                // Riferimento notifica

    symbol: string;                 // Asset su cui eseguire l'operazione
    value: number;                  // Valore in euro dell'operazione

    value_afterOp: number | undefined;           // Controvalore totale dopo l'operazione (inserito dal cliente)
    unitaryPrice_afterOp: number | undefined;           // Valore di un azione relativo al controvalore inserito dopo l'operazione (inserito dal cliente)

    completed_date?: Date;
}


export const operationData: OperationInfo[] = [
    {
        operation_uid: '',
        portfolio_uid: '',
        nfo_uid: '',

        symbol: 'AAPL',
        value: 2500,

        value_afterOp: undefined,
        unitaryPrice_afterOp: undefined,
    }
]
