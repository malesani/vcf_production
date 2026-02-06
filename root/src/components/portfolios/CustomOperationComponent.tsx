import { useEffect, useState } from "react";
import { MDBBadge, MDBBtn, MDBCard, MDBCardBody, MDBCardHeader, MDBCardTitle, MDBCol, MDBIcon, MDBInput, MDBRadio, MDBRow, MDBSelect, MDBTypography } from "mdb-react-ui-kit"

import { FieldConfig, SelectData, GeneralForm } from '../../app_components/GeneralForm';


import { PortfolioInfo, } from '../../api_module/portfolio/constants';
import { OperationItem, createOperation, } from "../../api_module/operations/OperationsRequest";
import { getStocksInfo } from '../../api_module_v1/FinancialDataRequest';


import General_Loading from "../../app_components/General_Loading";


interface CustomOperationProps {
    portfolioInfo: PortfolioInfo
    onReloadPrices?: (() => Promise<void>) | null;
    onReloadPortfolio?: (() => Promise<void>) | null;
    onReloadOperations?: (() => Promise<void>) | null;
    onReloadProfit?: (() => Promise<void>) | null;
    onReloadOperationsHistory?: (() => Promise<void>) | null;


}

export const CustomOperationComponent: React.FC<CustomOperationProps> = ({ portfolioInfo, onReloadPrices, onReloadPortfolio, onReloadOperations, onReloadProfit, onReloadOperationsHistory }) => {

    const [reloadKey, setReloadKey] = useState(0);

    const reloadComponent = () => setReloadKey(k => k + 1);

    const [loadingMode, setLoadingMode] = useState<boolean>(false);

    const [stocksInfoOptions, setStocksInfoOptions] = useState<SelectData[] | null>(null);
    const [stocksInfoOptionsPortfolio, setStocksInfoOptionsPortfolio] = useState<SelectData[] | null>(null);
    const operation_FieldConfig: FieldConfig<OperationItem>[] = [
        {
            name: "symbol", label: "Seleziona Asset", required: true, grid: { md: 6 },
            type: "selectbox", options: stocksInfoOptions as SelectData[],
            properties: {
                largeDataSearch: true
            },
        },
        {
            name: 'unitQuantity',
            label: 'Quantita',
            type: 'number',
            required: true,
            grid: { md: 3 },
        },
        {
            name: 'unitaryPrice',
            label: 'Valore Unitario',
            type: 'number',
            required: true,
            grid: { md: 3 },

        },

    ];


    useEffect(() => {
        setLoadingMode(true);
        setStocksInfoOptionsPortfolio(portfolioInfo.assets.map(stockInfo => ({ value: stockInfo.symbol, text: `${stockInfo.symbol} (${stockInfo.symbol})`, })))
        getStocksInfo()
            .then((resp) => {
                console.log(resp)
                if (resp.response.success && resp.data) {
                    setStocksInfoOptions(resp.data.map(stockInfo => ({
                        value: stockInfo.symbol,
                        text: `${stockInfo.name} (${stockInfo.symbol})`,
                    })))
                }
            })
            .catch((err) => {
                console.error("Errore caricamento Stocks Info:", err);
            })
    }, []);

    return (
        <>
            <MDBCard className="mt-4 mb-4">
                <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <MDBCardTitle tag="h5" className="m-0 d-flex align-items-center">
                            <MDBIcon fas icon="plus" className="me-2" />Acquisto asset
                        </MDBCardTitle>
                    </div>
                </MDBCardHeader>
                <MDBCardBody key={reloadKey} className="pt-2">
                    <GeneralForm<OperationItem, { portfolio_uid: string; operation: "buy" }>
                        mode="create"
                        fields={operation_FieldConfig}
                        params={{ portfolio_uid: portfolioInfo.portfolio_uid, operation: "buy" }}
                        createData={createOperation}
                        createBtnProps={{
                            icon: 'chart-line',
                            label: 'Conferma Acquisto',
                            labelSaving: 'Acquisto ...',
                            className: "bg-primary border-primary bg-gradient shadow-0"
                        }}
                        onSuccess={() => {
                            reloadComponent()
                            if (onReloadPortfolio) onReloadPortfolio();
                            if (onReloadPrices) onReloadPrices();
                            if (onReloadOperations) onReloadOperations();
                            if (onReloadProfit) onReloadProfit();
                            if (onReloadOperationsHistory) onReloadOperationsHistory();
                        }}


                    />
                </MDBCardBody>
            </MDBCard>
        </>
    )

}


export default CustomOperationComponent;