import { useEffect, useState } from "react";
import { MDBBadge, MDBBtn, MDBCard, MDBCardBody, MDBCardHeader, MDBCardTitle, MDBCol, MDBIcon, MDBInput, MDBRadio, MDBRow, MDBSelect, MDBTypography } from "mdb-react-ui-kit"

import { FieldConfig, SelectData, GeneralForm } from '../../app_components/GeneralForm';

import { GeneralInput } from "../../app_components/GeneralInput";


import { PortfolioInfo, PortfolioAssets, } from '../../api_module/portfolio/constants';
import { OperationItem, createOperation, fetchOperationsPaginated, ExecutedOperationSelect } from "../../api_module/operations/OperationsRequest";
import { getStocksInfo } from '../../api_module_v1/FinancialDataRequest';


import General_Loading from "../../app_components/General_Loading";


interface CustomOperationProps {
    portfolioInfo: PortfolioInfo
}

export const CustomOperationComponent: React.FC<CustomOperationProps> = ({ portfolioInfo }) => {

    const [loadingMode, setLoadingMode] = useState<boolean>(false);

    const [stocksInfoOptions, setStocksInfoOptions] = useState<SelectData[] | null>(null);
    const [stocksInfoOptionsPortfolio, setStocksInfoOptionsPortfolio] = useState<SelectData[] | null>(null);

    const operation_FieldConfig: FieldConfig<OperationItem>[] = [
        {
            name: 'operation',
            label: "operazione da esseguire",
            type: "selectbox",
            grid: { md: 12 },

            options: [
                {
                    text: "Compra", value: "buy", renderCard: ({ isSelected, onSelect }) => (
                        <div
                            onClick={onSelect}
                            style={{
                                backgroundColor: isSelected ? "#4caf50" : "#c8e6c9",
                                color: "white",
                                padding: "8px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                textAlign: "center",
                            }}
                        >
                            <MDBIcon fas icon="chart-line" className="" />
                            <span className="mx-2">Compra</span>
                        </div>
                    ),
                },
                {
                    text: "Vendi", value: "sell",
                    renderCard: ({ isSelected, onSelect }) => (

                        <div
                            onClick={onSelect}
                            style={{
                                backgroundColor: isSelected ? "#ff4d4d" : "#ffcccc",
                                color: "white",
                                padding: "8px 12px",
                                borderRadius: 6,
                                cursor: "pointer",
                                textAlign: "center"

                            }}
                        >
                            <MDBIcon fas icon="euro-sign" />
                            <span className="mx-2">Vendi</span>
                        </div>
                    ),

                }
            ],
            customElementKey: "cards",

        },
        {
            name: "symbol", label: "Seleziona Stock", required: true, grid: { md: 8 },
            type: "selectbox", options: stocksInfoOptions as SelectData[],
            properties: {
                largeDataSearch: true
            },
        },
        {
            name: 'unitQuantity',
            label: 'Quantita',
            type: 'number',
            properties: { defaultValue: Number(0) },
            required: true,
            grid: { md: 6 },
        },
        {
            name: 'unitaryPrice',
            label: 'Valore Unitario',
            type: 'number',
            properties: { defaultValue: 0 },
            required: true,
            grid: { md: 6 },
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


    // if (loadingMode) {
    //     return (<General_Loading theme="pageLoading" title='' />);
    // }

    return (
        <>
            <MDBCard className="mt-4 mb-4">
                <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
                            Ricerca e Acquisto Azioni
                        </MDBCardTitle>
                    </div>
                </MDBCardHeader>
                <MDBCardBody>
                    <GeneralForm<OperationItem, {}>
                        mode="create"
                        fields={operation_FieldConfig}
                        createData={async (formData) => {
                            console.log(formData, "formdata")
                            try {
                                let item = {
                                    portfolio_uid: portfolioInfo.portfolio_uid,
                                    symbol: formData?.symbol,
                                    operation: formData.operation,
                                    unitaryPrice: formData.unitaryPrice,
                                    unitQuantity: formData.unitQuantity
                                } as OperationItem

                                await createOperation(item)
                                // setDateLastOperation("now")
                            } catch (err) {
                                console.error('Errore caricamento dati portfolio:', err);
                            } finally {
                                // setLoadingMode(false);
                            }

                            return { response: { success: true, message: 'OK', data: formData }, data: formData };
                        }}
                        createBtnProps={{ label: 'Conferma operazione', className: " bg-primary border-primary bg-gradient shadow-0" }}
                        onSuccess={async () => {
                            return { response: { success: true, message: 'OK' }};
                        }}
                    />
                </MDBCardBody>


            </MDBCard>
        </>
    )

}


export default CustomOperationComponent;