import { MDBCard, MDBCardHeader, MDBCardTitle, MDBCardBody, MDBListGroup, MDBListGroupItem, MDBIcon, MDBAlert, MDBBadge, MDBRow, MDBCol, MDBBtn, MDBModal, MDBModalBody, MDBModalContent, MDBModalDialog, MDBModalHeader, MDBModalTitle } from "mdb-react-ui-kit";


import OperationModel from "../../components/portfolios/OperationModel"
import CashOperationModal from "../../components/portfolios/CashOperationModal";

import { PortfolioInfo } from '../../api_module/portfolio/PortfolioData';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExecutedOperationSelect, createCashOperation } from "../../api_module/operations/OperationsRequest";
import { ResponsivePie } from '@nivo/pie'

import { GeneralForm, FieldConfig } from "../../app_components/GeneralForm";
import { OperationChangeImportMonth } from "../../api_module/operations/OperationsRequest";

import { General_Loading } from '../../app_components/General_Loading';

interface Props {
    portfolio: PortfolioInfo;
    managedInfo?: PortManagedInfo;
    assetPrices?: Record<string, number | null>;
    onReloadPrices?: (() => Promise<void>) | null;
    onReloadPortfolio?: (() => Promise<void>) | null;
    onReloadOperations?: (() => Promise<void>) | null;
}


const toNumber = (val: any): number => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? 0 : num;
};

const fmtEUR = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(toNumber(n));

type ChartDatum = {
    id: string;
    label: string;
    value: number;
    color: string;
};

const PortfolioComposition: React.FC<Props> = ({ portfolio, managedInfo, assetPrices, onReloadPrices, onReloadPortfolio, onReloadOperations }) => {


    const { title, type, target, time_horizon_years, cash_position, automatic_savings, assets = [] } = portfolio;
    const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;

    const [data, setData] = useState<ChartDatum[]>([]);

    const [loadingSync, setLoadingSync] = useState(false);
    const [selectedOp, setSelectedOp] = useState<ExecutedOperationSelect | null>(null);
    const [cashKind, setCashKind] = useState<'deposit' | 'withdraw' | null>(null);
    const [cashOpen, setCashOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editMonthPayment, setEditMonthPayment] = useState(false);
    const [pricesMap, setPricesMap] = useState<Record<string, number | null>>(assetPrices || {});

    //useEffect
    useEffect(() => {
        if (!assets || assets.length === 0) return;
        const formattedAssets: ChartDatum[] = assets
            .filter(a => a.unitQuantity > 0)
            .map(a => ({
                id: a.symbol,
                label: a.symbol,
                value: a.value_now as number,
                color: randomColor(),
            }));

        const liquidita: ChartDatum = {
            id: "liquidita",
            label: "Liquidità",
            value: Math.abs(cash_position),
            color: "red",
        };

        setData([...formattedAssets, liquidita]);
    }, [assets, cash_position]);


    //useMemo
    const { totalAssetsNow } = useMemo(() => {
        let invested = 0;
        let now = 0;
        for (const a of assets) {
            const qty = toNumber(a.unitQuantity);
            const purchase = toNumber(a.unitaryPrice_now);
            const current = toNumber(pricesMap[a.symbol] ?? purchase);
            invested += qty * purchase;
            now += qty * current;
        }
        return {
            totalAssetsNow: now,
        };
    }, [assets, pricesMap, cash_position]);


    //template 
    const renderAssetRows = () => {
        const total = totalAssetsNow || 0;
        var assets_li = assets.map((a) => {
            const qty = toNumber(a.unitQuantity);
            if (qty <= 0) { return null; }
            const purchase = toNumber(a.unitaryPrice_now);
            const current = pricesMap[a.symbol] != null ? toNumber(pricesMap[a.symbol]) : purchase;

            const amountNow = qty * current;

            const diffPct = purchase > 0 ? (current / purchase - 1) * 100 : 0; // FIX: segno corretto
            const diffVal = qty * (current - purchase); // FIX: P/L in €

            const trendColor = diffPct > 0 ? 'success' : diffPct < 0 ? 'danger' : 'muted';
            const trendIcon = diffPct > 0 ? 'arrow-up' : diffPct < 0 ? 'arrow-down' : 'minus';
            const sign = diffPct > 0 ? '+' : diffPct < 0 ? '' : '';

            return (
                <MDBListGroupItem key={a.symbol} className="w-100 d-flex justify-content-between align-items-center gap-2 small text-nowrap">
                    <div className='d-flex align-items-center w-20'>
                        <span className="fw-bold">{a.symbol}</span>
                    </div>

                    <div className='d-flex flex-row align-items-center gap-3'>
                        <span className="fw-bold">{qty} asset</span>
                        <span className="fw-bold text-muted">{a.unitaryPrice_now} €/un</span>
                    </div>

                    <div className='d-flex align-items-center'>
                        <small className={`text-${trendColor}`}>
                            <MDBIcon fas icon={trendIcon} className="me-1" />
                            {sign}{diffPct.toFixed(1)}% ({fmtEUR(diffVal)})
                        </small>
                    </div>

                    <div className="d-flex align-center">
                        <MDBBtn
                            size="sm"
                            color="danger"
                            className="text-muted p-0"
                            onClick={() => {
                                setSelectedOp(a as ExecutedOperationSelect);
                                setEditOpen(true);
                            }}
                            title="vendi"
                        >
                            <b className="text-white p-2">Sell</b>
                        </MDBBtn>

                        <MDBBtn
                            size="sm"
                            color="success"
                            className="text-muted p-0 ms-1"
                            onClick={() => {
                                setSelectedOp(a as ExecutedOperationSelect);
                                setEditOpen(true);
                            }}
                            title="compra"
                        >
                            <b className="text-white p-2">Buy</b>

                        </MDBBtn>
                    </div>
                </MDBListGroupItem>
            );
        });
        return <MDBListGroup className="mx-2" light>
            {assets_li}
        </MDBListGroup>;
    };


    // Campi del form (un solo campo: importo)
    const fields: FieldConfig<OperationChangeImportMonth>[] = [
        {
            name: 'day',
            label: 'Giorno di adebbito',
            type: 'number',
            required: true,
            properties: {
                minValue: 1,
                maxValue: 28,
            },
            grid: { md: 12 },
        },
        {
            name: 'automatic_savings',
            label: 'Nuovo Importo',
            type: 'number',
            required: true,
            properties: {
                minValue: 1,
            },
            grid: { md: 12 },
        },
    ];
    return (
        <>
            {loadingSync && (
                <General_Loading theme="formLoading" text="Caricamento Portafogli" />
            )}
            <div className="d-flex flex-wrap justify-content-center w-100">
                {assets.length > 0 &&
                <div className="flex-shrink-1" style={{ maxWidth: "650px", minWidth: "350px", minHeight: "300px" }}>
                    <ResponsivePie
                        data={data}
                        margin={{ top: 40, right: 90, bottom: 40, left: 90 }}
                        innerRadius={0.5}
                        padAngle={0.6}
                        cornerRadius={2}
                        activeOuterRadiusOffset={8}
                        arcLinkLabelsSkipAngle={10}
                        arcLinkLabelsTextColor="#333333"
                        arcLinkLabelsThickness={2}
                        arcLinkLabelsColor={{ from: 'color' }}
                        arcLabelsSkipAngle={10}
                        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                    />
                </div>}
                <div className="d-flex flex-column flex-nowrap flex-grow-1 justify-content-center overflow-auto p-3">
                    <MDBAlert open className='d-flex align-items-center justify-content-between m-0 py-2 px-2 ps-3 gap-2' color='light' style={{ minWidth: "100%" }}>
                        <div className="d-flex align-items-center text-nowrap">
                            <MDBIcon fas icon="credit-card" className="text-dark me-2" />
                            <span className="me-2 fw-bold">Liquidità Disponibile: </span>
                        </div>
                        <span className="fw-bold text-muted">{fmtEUR(toNumber(cash_position))}</span>
                        <div className="d-flex gap-2">
                            <MDBBadge
                                color="danger" light
                                style={{ cursor: "pointer" }}
                                className="d-flex align-items-center justify-content-center border border-1 border-danger"
                                onClick={() => { setCashKind('withdraw'); setCashOpen(true); }}
                                disabled={loadingSync}
                                title="Preleva"
                            >
                                <span color="danger">PRELEVA</span>
                            </MDBBadge>

                            <MDBBadge
                                color="success" light
                                style={{ cursor: "pointer" }}
                                className="d-flex align-items-center justify-content-center border border-1 border-success"
                                onClick={() => { setCashKind('deposit'); setCashOpen(true); }}
                                disabled={loadingSync}
                                title="Deposita"
                            >
                                <span color="danger">DEPOSITA</span>
                            </MDBBadge>
                        </div>
                    </MDBAlert>
                    {assets.length > 0 ? renderAssetRows() : <div className="w-100 d-flex justify-content-center align-items-center gap-2 small text-nowrap"><p className="s-muted small mt-2 mb-0">Nessun asset presente.</p></div>}
                    <div className="d-flex flex-column justify-content-between">
                        <div className="">
                            {assets.filter((a) => a.unitQuantity === 0)
                                .map((a) => (
                                    <div key={a.symbol} className="d-flex justify-content-between align-items-center small mb-3">
                                        <div className='d-flex align-items-center w-25 '>
                                            <span className="fw-bold">{a.symbol}</span>
                                        </div>

                                        <div className='d-flex align-items-center w-25'>
                                            <span className="fw-bold">0 asset</span>
                                        </div>

                                        <div className='d-flex align-items-center'>
                                            <span className="fw-bold text-info mx-3">Target pesatura ottimale</span>
                                            <span className="fw-bold text-info">22</span>

                                        </div>
                                        <div className="d-flex justify-content-end w-100%">
                                            <MDBBtn
                                                size="sm"
                                                color="success"
                                                className="text-muted p-0 ms-2"
                                                onClick={() => {
                                                    setSelectedOp(a as ExecutedOperationSelect);
                                                    setEditOpen(true);
                                                }}
                                                title="Modifica"
                                            >
                                                <b className="text-white p-2">Buy</b>
                                            </MDBBtn>
                                        </div>
                                    </div>

                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
            <OperationModel
                portfolio_uid={portfolio.portfolio_uid}
                selectedOp={selectedOp}
                editOpen={editOpen}
                setEditOpen={setEditOpen}
                onSuccess={() => {
                    if (onReloadPortfolio) onReloadPortfolio();
                    if (onReloadPrices) onReloadPrices();
                    if (onReloadOperations) onReloadOperations();
                }}

            />

            <CashOperationModal
                portfolio_uid={portfolio.portfolio_uid}
                open={cashOpen}
                setOpen={setCashOpen}
                kind={cashKind!}
                currentCash={cash_position}
                onSuccess={() => {
                    if (onReloadPortfolio) onReloadPortfolio();
                    if (onReloadPrices) onReloadPrices();
                    if (onReloadOperations) onReloadOperations();
                }}
            />


            <MDBModal open={editMonthPayment} setOpen={setEditMonthPayment} tabIndex={-1}>
                <MDBModalDialog>
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle className="d-flex align-items-center gap-2">
                                Gestione Importo Mensile
                            </MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={() => setEditMonthPayment(false)} />
                        </MDBModalHeader>

                        <MDBModalBody>
                            <GeneralForm<OperationChangeImportMonth, { portfolio_uid: string }>
                                mode="create"
                                fields={fields}
                                params={{ portfolio_uid: portfolio.portfolio_uid }}
                                createData={async (payload: OperationChangeImportMonth & { portfolio_uid: string }) => {
                                    // TODO: replace with real API call to change monthly import
                                    // For now return a mocked resolved promise matching the expected Promise return type
                                    return Promise.resolve({
                                        response: "ok",
                                        data: payload
                                    } as any);
                                }}
                                createBtnProps={{
                                    label: "Modifica",
                                }}

                                onSuccess={async () => {
                                    // chiudi e refresh
                                    setEditMonthPayment(false);
                                    //da fare il refresh
                                }}
                            />
                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>


        </>
    )

}

export default PortfolioComposition; 