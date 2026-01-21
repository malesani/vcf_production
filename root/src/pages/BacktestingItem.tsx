import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBBtn, MDBIcon, MDBCardTitle, MDBCardFooter, MDBBadge, MDBTable, MDBTableBody, MDBTableHead, MDBProgress, MDBProgressBar } from "mdb-react-ui-kit";
import { GeneralForm, FieldConfig } from '../app_components/GeneralForm';
import { ResponsiveLine } from '@nivo/line';
import { ResponsivePie } from '@nivo/pie'

import { useEffect, useState } from "react";
import type { BacktestWithAssets } from "../components/backtesting/contans";
import type { BacktestConfig } from "../components/backtesting/contans";
import { backtestingsList } from "../components/backtesting/contans";
import { useParams } from 'react-router-dom';


const data = [
    {
        id: "strategy_A",
        data: [
            { x: "2024-01-01", y: 100 },
            { x: "2024-01-02", y: 102 },
            { x: "2024-01-03", y: 98 },
            { x: "2024-01-04", y: 105 },
            { x: "2024-01-05", y: 110 },
            { x: "2024-01-06", y: 108 },
            { x: "2024-01-07", y: 115 },
            { x: "2024-01-08", y: 118 },
            { x: "2024-01-09", y: 112 },
            { x: "2024-01-10", y: 120 }
        ]
    }
];


const dataPie = [
    {
        "id": "go",
        "label": "go",
        "value": 157,
        "color": "hsl(160, 70%, 50%)"
    },
    {
        "id": "css",
        "label": "css",
        "value": 215,
        "color": "hsl(12, 70%, 50%)"
    },
    {
        "id": "make",
        "label": "make",
        "value": 149,
        "color": "hsl(339, 70%, 50%)"
    },
    {
        "id": "haskell",
        "label": "haskell",
        "value": 55,
        "color": "hsl(58, 70%, 50%)"
    },
    {
        "id": "lisp",
        "label": "lisp",
        "value": 279,
        "color": "hsl(80, 70%, 50%)"
    }
]

const funds = [
    {
        name: "Vanguard Total Stock Market Index Fund",
        index: "CRSP U.S.",
        performance: 12.4,
        color: "primary",
        allocation: 20,
    },
    {
        name: "iShares S&P Global 100 Index Fund",
        index: "S&P 100",
        performance: 15.2,
        color: "secondary",
        allocation: 30,
    },
    {
        name: "Fidelity 500 Index Fund",
        index: "S&P 500",
        performance: 18.7,
        color: "info",
        allocation: 20,
    },
    {
        name: "Vanguard S&P 500 ETF",
        index: "S&P 500",
        performance: 19.1,
        color: "success",
        allocation: 30,
    },
];


//creazione del form
const Simulation_FormFields: FieldConfig<BacktestConfig>[] = [
    {
        name: "totalInvested",
        label: "",
        required: false,
        grid: { md: 12 },
        type: "number",
        properties: { minValue: 500, maxValue: 10000, defaultValue: 1000 },
        extraElements: [{
            position: "before",
            grid: { md: 12 },
            element:

                <div className="">
                    Totale investito
                </div>

        }]

    },
    {
        name: "periodYears",
        label: "",
        required: false, grid: { md: 12 },
        type: "number",
        properties: {
            minValue: 1,
            maxValue: 50,
            defaultValue: 1
        },
        extraElements: [{
            position: "before",
            grid: { md: 12 },
            element:

                <div className="">
                    Orizzonte Temporale
                </div>

        }]
    },
    {
        name: "monthlyContribution",
        label: "",
        required: false,
        grid: { md: 12 },
        type: "number",
        properties: {
            minValue: 100,
            maxValue: 10000,
            defaultValue: 500
        },
        extraElements: [{
            position: "before",
            grid: { md: 12 },
            element:

                <div className="">
                    Contributo mensile
                </div>

        }]
    },
]




const BacktestingItem: React.FC = () => {
    const { bt_item_uid } = useParams<{ bt_item_uid: string }>();

    //cons mutabili per manipolare il rendirizzato della pagina 
    const [investimentoIniziale, setInvestimentoInizialeProp] = useState<number>();
    const [contributoMensile, setContributoMensile] = useState<number>();
    const [tempoInvestimento, setTempoInvestimento] = useState<number>();

    const [backtest, setBacktest] = useState<BacktestWithAssets | null>(null);
    const [loading, setLoading] = useState(true);

    const totalAllocation = funds.reduce((acc, f) => acc + f.allocation, 0);

    function getBacktestingById(
        test_uid: string
    ): Promise<BacktestWithAssets | undefined> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const backtest = backtestingsList.find(
                    (bt) => bt.test_uid === test_uid
                );
                resolve(structuredClone(backtest));
            }, 300);
        });
    }

    useEffect(() => {
        if (!bt_item_uid) return;

        setLoading(true);

        getBacktestingById(bt_item_uid)
            .then((data) => {
                setBacktest(data ?? null);
                console.log(data)
                // opcional: inicializar tus 3 estados con los valores del backtest
                if (data) {
                    setInvestimentoInizialeProp(data.totalInvested);
                    setContributoMensile(data.monthlyContribution);
                    setTempoInvestimento(data.periodYears);
                }
            })
            .finally(() => setLoading(false));
    }, [bt_item_uid]);

    return (
        <>
            <MDBContainer>
                <MDBRow className='align-items-center mb-3'>
                    <MDBCol>
                        <div className="py-2 mb-2">
                            <div className="d-flex flex-row align-items-center">
                                {/* <i className="fas fa-list-alt me-2"></i> */}
                                <span className="fs-3 fw-bold text-dark">
                                    TEST SV
                                </span>
                            </div>
                            <div className="d-flex">
                                <span className="text-muted fs-6">
                                    Lorem ipsum dolor sit amet consectetur.
                                </span>
                            </div>
                        </div>
                    </MDBCol>
                </MDBRow>
                <MDBRow className="align-items-stretch mb-4">
                    <MDBCol className="col-6 h-100">
                        <MDBCard className="h-100" style={{ minHeight: "600px" }}>
                            <MDBCardBody className="d-flex flex-column">
                                <MDBCardTitle className=" small mb-3">
                                    Parametri
                                </MDBCardTitle>

                                <div className="d-flex justify-content-center flex-grow-1">
                                    <GeneralForm<BacktestConfig>
                                        mode="create"
                                        fields={Simulation_FormFields}
                                        disableSubmit={false}
                                        createBtnProps={
                                            {
                                                icon: "save",
                                                label: "Salva",
                                                labelSaving: "Salvataggio in corso",
                                                color: "primary"
                                            }
                                        }
                                        createData={async (payload: BacktestConfig) => {
                                            return {
                                                response: {
                                                    success: true,
                                                    message: "Created successfully"
                                                },
                                                data: payload
                                            };
                                        }}
                                        onChange={(formData) => {
                                            setInvestimentoInizialeProp(formData.periodYears || 0);
                                            setContributoMensile(formData.monthlyContribution || 0);
                                            setTempoInvestimento(formData.totalInvested || 0);
                                        }}
                                    />
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>

                    {/* COLUMNA DERECHA */}
                    <MDBCol className="col-6 h-100">
                        <MDBCard className="d-flex flex-column" style={{ minHeight: "600px", maxHeight: "600px" }}>
                            <MDBCardBody className="flex-grow-1">
                                <MDBCardTitle className="small mb-3">
                                    Allocazione Portafoglio
                                </MDBCardTitle>

                                <div style={{ width: "100%", height: "250px" }}>
                                    <ResponsivePie
                                        data={dataPie}
                                        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                                        innerRadius={0.5}
                                        padAngle={0.6}
                                        cornerRadius={2}
                                        activeOuterRadiusOffset={8}
                                        arcLinkLabelsSkipAngle={10}
                                        arcLinkLabelsTextColor="#333333"
                                        arcLinkLabelsThickness={2}
                                        arcLinkLabelsColor={{ from: "color" }}
                                        arcLabelsSkipAngle={10}
                                        arcLabelsTextColor={{
                                            from: "color",
                                            modifiers: [["darker", 2]]
                                        }}
                                    />
                                </div>
                            </MDBCardBody>

                            <MDBCardFooter className="text-muted py-0 pb-3" style={{ border: "none" }}>
                                <MDBTable align="middle" hover responsive small>
                                    <MDBTableHead>
                                        <tr>
                                            <th>Fondo</th>
                                            <th>Indice</th>
                                            <th>Performance</th>
                                            <th>Assegnazione</th>
                                        </tr>
                                    </MDBTableHead>

                                    <MDBTableBody>
                                        {funds.map((fund) => (
                                            <tr key={fund.name}>
                                                <td>{fund.name}</td>
                                                <td>{fund.index}</td>
                                                <td>
                                                    <MDBBadge color="success" light>
                                                        +{fund.performance}%
                                                    </MDBBadge>
                                                </td>
                                                <td style={{ minWidth: 140 }}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        <MDBProgress height="6" className="flex-grow-1">
                                                            <MDBProgressBar
                                                                width={fund.allocation}
                                                                backgroundColor={fund.color}
                                                            />
                                                        </MDBProgress>
                                                        <small>{fund.allocation}%</small>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </MDBTableBody>
                                </MDBTable>

                                {/* <div className="d-flex justify-content-end mt-2">
                                    <small>
                                        Allocazione totale:&nbsp;
                                        <span className="text-success fw-bold">{totalAllocation}%</span>
                                    </small>
                                </div> */}
                            </MDBCardFooter>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                <MDBRow className='align-items-center mb-3'>
                    <MDBCol className="col-12">
                        <MDBCard className="" style={{ minHeight: "208px" }}>
                            <MDBCardBody className="d-flex flex-column align-items-center justify-content-center">
                                <div style={{ width: "100%", height: "400px" }}>
                                    <ResponsiveLine
                                        data={data}
                                        margin={{ top: 50, right: 110, bottom: 50, left: 60 }}
                                        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false }}
                                        axisBottom={{ legend: 'date', legendOffset: 36 }}
                                        axisLeft={{ legend: 'value', legendOffset: -40 }}
                                        enableGridY={false}
                                        pointSize={10}
                                        useMesh={true}
                                        colors={["rgb(21,93,252)"]}
                                    />
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>

                </MDBRow>
                <MDBRow className='align-items-center mb-4'>
                    <MDBCol className="" style={{ width: "calc(100% / 5)" }}>
                        <MDBCard className="" style={{ minHeight: "80px" }}>
                            <MDBCardBody className="d-flex flex-column justify-content-center">
                                <div className="my-2 text-muted" style={{ fontSize: "12px" }}>Importo investito</div>
                                <div className="f-6" style={{ fontSize: "14px" }}>
                                    10.000 €
                                </div>

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="" style={{ width: "calc(100% / 5)" }}>
                        <MDBCard className="" style={{ minHeight: "80px" }}>
                            <MDBCardBody className="d-flex flex-column justify-content-center">

                                <div className="my-2 text-muted" style={{ fontSize: "12px" }}>Crescita annuale composta</div>
                                <div className="f-6" style={{ fontSize: "14px" }}>
                                    27,51%
                                </div>

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="" style={{ width: "calc(100% / 5)" }}>
                        <MDBCard className="" style={{ minHeight: "80px" }}>
                            <MDBCardBody className="d-flex flex-column justify-content-center">

                                <div className="my-2 text-muted" style={{ fontSize: "12px" }}>Valore patrimoniale netto</div>
                                <div className="f-6" style={{ fontSize: "14px" }}>
                                    22.938 €
                                </div>

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="" style={{ width: "calc(100% / 5)" }}>
                        <MDBCard className="" style={{ minHeight: "80px" }}>
                            <MDBCardBody className="d-flex flex-column justify-content-center">

                                <div className="my-2 text-muted" style={{ fontSize: "12px" }}>Deviazione standard</div>
                                <div className="f-6 " style={{ fontSize: "14px" }}>
                                    59,19%
                                </div>

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="" style={{ width: "calc(100% / 5)" }}>
                        <MDBCard className="" style={{ minHeight: "80px" }}>
                            <MDBCardBody className="d-flex flex-column justify-content-center">
                                <div className="my-2 text-muted" style={{ fontSize: "12px" }}>Rapporto di Sharpe</div>
                                <div className="f-6 " style={{ fontSize: "14px" }}>
                                    0,66
                                </div>

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>
            </MDBContainer>
        </>
    )
}

export default BacktestingItem;


