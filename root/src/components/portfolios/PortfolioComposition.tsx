import { MDBCard, MDBCardHeader, MDBCardTitle, MDBCardBody, MDBListGroup, MDBListGroupItem, MDBIcon, MDBAlert, MDBBadge, MDBRow, MDBCol, MDBBtn, MDBModal, MDBModalBody, MDBModalContent, MDBModalDialog, MDBModalHeader, MDBModalTitle } from "mdb-react-ui-kit";


import OperationModel from "../../components/portfolios/OperationModel"
import CashOperationModal from "../../components/portfolios/CashOperationModal";

import { PortfolioInfo } from '../../api_module/portfolio/PortfolioData';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';
import { useCallback, useEffect, useMemo, useState } from "react";
import { ExecutedOperationSelect, createCashOperation } from "../../api_module/operations/OperationsRequest";
import { ResponsivePie } from '@nivo/pie'
import { SymbolWeighing, OperationItem } from '../../api_module/operations/OperationsRequest';

import { GeneralForm, FieldConfig } from "../../app_components/GeneralForm";
import { OperationChangeImportMonth } from "../../api_module/operations/OperationsRequest";
import { General_Loading } from '../../app_components/General_Loading';
import { useIsMobile } from "../../app_components/ResponsiveModule";

interface Props {
    portfolio: PortfolioInfo;
    managedInfo?: PortManagedInfo;
    pesature: SymbolWeighing[] | undefined;
    realOps: OperationItem[];
    assetPrices?: Record<string, number | null>;
    profit: any[];
    onReloadPrices?: (() => Promise<void>) | null;
    onReloadPortfolio?: (() => Promise<void>) | null;
    onReloadOperations?: (() => Promise<void>) | null;
    onReloadProfit?: (() => Promise<void>) | null;
}


const toNumber = (val: any): number => {
    if (val == null) return 0;
    if (typeof val === 'number') return Number.isFinite(val) ? val : 0;

    const s = String(val)
        .trim()
        .replace(/\s/g, '')
        .replace('€', '')
        .replace(/\.(?=\d{3}(\D|$))/g, '') // quita separador miles tipo 1.234,56
        .replace(',', '.')
        .replace(/[^0-9.-]/g, '');

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
};

const fmtEUR = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(toNumber(n));



type ChartDatum = {
    id: string;
    label: string;
    value: number;
    color: string;
};

const PortfolioComposition: React.FC<Props> = ({ realOps, portfolio, assetPrices, profit, onReloadProfit, onReloadPrices, onReloadPortfolio, onReloadOperations, pesature = [] }) => {

    const { cash_position, assets = [] } = portfolio;
    const randomColor = () => `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
    const isMobile = useIsMobile(992);
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
                color: "green",
            }));

        const liquidita: ChartDatum = {
            id: "Liquidita",
            label: "Liquidita",
            value: Math.abs(cash_position),
            color: "red",
        };

        setData([...formattedAssets, liquidita]);
    }, [assets, cash_position, profit]);

    useEffect(() => {
        setPricesMap(assetPrices || {});
    }, [assetPrices]);

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

            const purchase = toNumber(profit.find(p => p.symbol === a.symbol)?.unitaryPrice_avg);
            const current = pricesMap[a.symbol] != null ? toNumber(pricesMap[a.symbol]) : purchase;

            console.log(current, "current")
            console.log(purchase, "purchase")
            
            console.log(purchase > 0 ? (current / purchase - 1) * 100 : 0, "purchase")

            const diffPct = purchase > 0 ? (current / purchase - 1) * 100 : 0; // FIX: segno corretto
            const diffVal = qty * (current - purchase); // FIX: P/L in €

            console.log(diffPct, diffVal, "diffPct diffVal")

            const trendColor = diffPct > 0 ? 'success' : diffPct < 0 ? 'danger' : 'muted';
            const trendIcon = diffPct > 0 ? 'arrow-up' : diffPct < 0 ? 'arrow-down' : 'minus';
            const sign = diffPct > 0 ? '+' : diffPct < 0 ? '' : '';

            return (
                <MDBListGroupItem key={a.symbol} className="w-100 d-flex justify-content-between align-items-center gap-2 small text-nowrap p-3 mb-3 flex-wrap flex-md-nowrap" style={{ borderRadius: "15px", background: "rgb(239,246,255)", border: "rgba(190, 219, 255, 1) solid 1px" }}>
                    <div className="d-flex align-items-center w-50 ">
                        {!isMobile &&
                            <div className='me-3 d-flex align-center justify-content-center w-25' style={{ borderRadius: "15px", background: "green", color: "white", padding: "7px 16px" }}>
                                <span className="fw-bold">{a.symbol}</span>
                            </div>
                        }
                        <div className=' gap-3'>
                            <div className="text-uppercase fw-bold">
                                {a.symbol}
                            </div>
                            <span className="fw-bold me-3">{qty} asset</span>
                            <span className="fw-bold text-muted">{a.unitaryPrice_now} €/un</span>
                        </div>
                    </div>

                    <div className={isMobile ? 'w-100' : ""}>
                        <div className='d-flex align-items-center justify-content-md-end mb-2'>
                            <small className={`text-${trendColor}`}>
                                <MDBIcon fas icon={trendIcon} className="me-1" />
                                {sign}{diffPct.toFixed(1)}% ({fmtEUR(diffVal)})
                            </small>
                        </div>
                        <div className={isMobile ? 'w-100 d-flex' : ""}>
                            <MDBBtn
                                size="sm"
                                color="danger"
                                className={isMobile ? 'w-50 text-muted p-0 ms-1' : "text-muted p-0 ms-1"}
                                onClick={() => {
                                    setSelectedOp(a as ExecutedOperationSelect);
                                    setEditOpen(true);
                                }}
                                title="vendi"
                            >
                                <span className="text-white p-2">Vendi</span>
                            </MDBBtn>

                            <MDBBtn
                                size="sm"
                                color="success"
                                className={isMobile ? 'w-50 text-muted p-0 ms-1' : "text-muted p-0 ms-1"}

                                onClick={() => {
                                    setSelectedOp(a as ExecutedOperationSelect);
                                    setEditOpen(true);
                                }}
                                title="compra"
                            >
                                <b className="text-white p-2">Compra</b>

                            </MDBBtn>
                        </div>
                    </div>
                </MDBListGroupItem>
            );
        });
        return <MDBListGroup className="mx-1" light>
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
            <div className="align-items-center d-flex flex-wrap justify-content-center w-100">
                {assets.length > 0 &&
                    <div
                        className="w-100 flex-grow-1 flex-md-grow-0"
                        style={{
                            height: 250,
                            maxWidth: 450,
                            minWidth: 300,
                        }}
                    >
                        <ResponsivePie /* or Pie for fixed dimensions */
                            data={data}
                            margin={{ top: 10, right: 140, bottom: 10, left: 30 }}
                            innerRadius={0.5}
                            padAngle={0.6}
                            cornerRadius={2}
                            activeOuterRadiusOffset={8}
                            enableArcLinkLabels={false}
                            arcLinkLabelsSkipAngle={10}
                            arcLinkLabelsTextColor="#333333"
                            arcLinkLabelsThickness={2}
                            arcLinkLabelsColor={{ from: 'color' }}
                            enableArcLabels={false}
                            arcLabelsSkipAngle={10}
                            arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
                            legends={[
                                {
                                    anchor: 'right',
                                    direction: 'column',
                                    translateX: 135,
                                    translateY: 0,
                                    itemWidth: 100,
                                    itemHeight: 30,
                                    symbolShape: 'circle'
                                }
                            ]}
                        />
                    </div>
                }
                <div className="d-flex flex-column flex-nowrap flex-grow-1 justify-content-center overflow-auto">
                    <div className='d-flex flex-wrap align-items-center justify-content-between m-0 py-2 px-2 gap-2' style={{ minWidth: "100%" }}>
                        <div className="d-flex align-items-center text-nowrap">
                            <span className="me-2 fw-bold text-muted">Liquidità Disponibile: </span>
                            <span className="fw-bold text-muted">{fmtEUR(toNumber(cash_position))}</span>
                        </div>
                        <div className={isMobile ? 'w-100 my-2 d-flex gap-2' : "d-flex gap-2"}>
                            <MDBBadge
                                color="danger" light
                                style={{ cursor: "pointer", background: "none" }}
                                className={isMobile ? 'w-50 d-flex align-items-center justify-content-center border border-1 border-danger' : "d-flex align-items-center justify-content-center border border-1 border-danger"}

                                onClick={() => { setCashKind('withdraw'); setCashOpen(true); }}
                                disabled={loadingSync}
                                title="Preleva"
                            >
                                <span color="danger">Preleva</span>
                            </MDBBadge>

                            <MDBBadge
                                color="success" light
                                style={{ cursor: "pointer", background: "none" }}
                                className={isMobile ? 'w-50 d-flex align-items-center justify-content-center border border-1 border-success' : "d-flex align-items-center justify-content-center border border-1 border-success"}
                                onClick={() => { setCashKind('deposit'); setCashOpen(true); }}
                                disabled={loadingSync}
                                title="Deposita"
                            >
                                <span color="danger">Deposita</span>
                            </MDBBadge>
                        </div>
                    </div>
                    {assets.length > 0 ? renderAssetRows() : <div className="w-100 d-flex justify-content-center align-items-center gap-2 small text-nowrap border-bottom"><p className="s-muted small my-2">Nessun asset presente.</p></div>}
                    <div className="d-flex flex-column justify-content-between">
                        <div className="">
                            <MDBListGroup className="mx-1" light >
                                {pesature
                                    .filter(a => a.unitQuantity_now === 0)
                                    .map(a => {

                                        // QUI ottieni l'oggetto corrispondente di realOps ⬇⬇⬇
                                        const realOp = realOps.find(op => op.symbol === a.symbol);

                                        if (!realOp) return null; // se non corrisponde nulla, non renderizzare

                                        return (
                                            <MDBListGroupItem className="w-100 d-flex justify-content-between align-items-center gap-2 small text-nowrap flex-wrap flex-md-nowrap p-3 mb-3" style={{ borderRadius: "15px", background: "rgb(239,246,255)", border: "rgba(190, 219, 255, 1) solid 1px" }} key={a.symbol}>
                                                <div className="d-flex align-items-center w-50 ">
                                                    {!isMobile &&
                                                        <div className='me-3 d-flex align-center justify-content-center w-25' style={{ borderRadius: "15px", background: "green", color: "white", padding: "7px 16px" }}>
                                                            <span className="fw-bold">{a.symbol}</span>
                                                        </div>
                                                    }
                                                    <div className=' gap-3'>
                                                        <div className="text-uppercase fw-bold">
                                                            {a.symbol}
                                                        </div>
                                                        <span className="fw-bold me-3">{a.unitQuantity_now} asset</span>
                                                        <span className="fw-bold text-muted">{realOp.unitaryPrice} €/un</span>
                                                    </div>
                                                </div>

                                                <div className='d-flex align-items-center gap-2'>
                                                    <span className="fw-bold text-info">Target:</span>
                                                    <span className="fw-bold text-info">{a.unitQuantity_suggested}</span>
                                                </div>
                                                <div
                                                    className={isMobile ? 'w-100 d-flex justify-content-end' : "d-flex justify-content-end"}>
                                                    <MDBBtn
                                                        size="sm"
                                                        color="success"
                                                        className={isMobile ? 'w-100 text-muted p-0 ms-1' : "text-muted p-0 ms-1"}
                                                        onClick={() => {
                                                            const el = {
                                                                portfolio_uid: realOp.portfolio_uid,
                                                                symbol: realOp.symbol,
                                                                unitQuantity: realOp.unitQuantity,
                                                                unitaryPrice_lastOp: 0,
                                                                unitaryPrice_now: realOp.unitaryPrice,
                                                                value_now: realOp.unitaryPrice,
                                                            }
                                                            setSelectedOp(el as ExecutedOperationSelect);
                                                            setEditOpen(true);
                                                        }}
                                                        title="Modifica"
                                                    >
                                                        <b className="text-white p-2">Buy</b>
                                                    </MDBBtn>
                                                </div>

                                            </MDBListGroupItem>
                                        );
                                    })
                                }
                            </MDBListGroup>

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
                    if (onReloadProfit) onReloadProfit();
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
                    if (onReloadProfit) onReloadProfit();
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