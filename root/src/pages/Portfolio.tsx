import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  MDBRow,
  MDBCol,
  MDBCard,
  MDBBtn,
  MDBModal,
  MDBModalDialog,
  MDBModalContent,
  MDBModalBody,
  MDBModalHeader,
  MDBModalTitle,
  MDBIcon,
  MDBContainer,
  MDBCardBody,
  MDBBadge,
  MDBCardHeader,
  MDBCardTitle,
  MDBProgress,
  MDBProgressBar
} from 'mdb-react-ui-kit';

import { General_ContentSwitcher } from '../app_components/General_ContentSwitcher';
import { General_Loading } from '../app_components/General_Loading';
import { FieldConfig, GeneralForm } from '../app_components/GeneralForm';

import AlertsHistory from '../components/portfolios/AlertsHistory';
import SuggestedAlertsList from '../components/portfolios/SuggestedAlertsList';

import {
  PortfolioInfo,
  get_portfolioByUID,
  get_assetPrices,
  get_assetsEarnings,
  AssetEarning
} from '../api_module/portfolio/PortfolioData';

import {
  fetchManagedPortfoliosActive,
  PortManagedInfo,
} from '../api_module/portfolioManaged/PortManagedData';

import { CustomOperationComponent } from "../components/portfolios/CustomOperationComponent"
import { NfoInfo, get_validAlertsByManaged, get_validReportsByManaged } from '../api_module/nfo/NfoData';
import {
  OperationItem,
  fetch_portfolioAlignmentOperations,
  get_portfolioWeighing,
  createOperation,
  SymbolWeighing,
  OperationChangeImportMonth
} from '../api_module/operations/OperationsRequest';

import OperationsHistory from '../components/portfolios/OperationsList';

import PortfolioComposition from '../components/portfolios/PortfolioComposition';
import AssetAllocation from '../components/portfolios/AssetAllocation';

// opzionale: se nel tuo file OperationsRequest hai esportato il tipo riga
export type OperationRow = {
  operation_uid: string;
  portfolio_uid: string;
  managed_uid?: string | null;
  symbol: string;
  operation: 'buy' | 'sell';
  unitQuantity: number;
  unitaryPrice: number;
  executed_at: string;
  updated_at?: string;
};

const fmtEUR = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));

const toNumber = (val: any): number => {
  const num = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const Portfolio: React.FC = () => {
  const { portfolio_uid } = useParams<{ portfolio_uid: string }>();

  const [loadingMode, setLoadingMode] = useState(true);

  const [managedInfo, setManagedInfo] = useState<PortManagedInfo>();

  //forse autoreload prezzi
  const [portfolioInfo, setPortfolioInfo] = useState<PortfolioInfo>();
  const [prices, setPrices] = useState<Record<string, number | null>>({});

  const [alertsInfo, setAlertsInfo] = useState<NfoInfo[]>([]);
  const [validReportInfo, setValidReportInfo] = useState<NfoInfo>();

  //per reload di operazioni cronologia
  const [shouldRefreshA, setShouldRefreshA] = useState<number>(0);

  //per gestione pesature
  const [validReportWeighing, setValidReportWeighing] = useState<SymbolWeighing[]>();
  const [realOpsRes, setRealOpsRes] = useState<OperationItem[]>([]);

  //profit soldi
  const [profit, setProfit] = useState<AssetEarning[]>([]);

  //last operation
  const [dateLastOperation, setDateLastOperation] = useState<string>("");

  // Modale anteprima HTML NFO
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [openPreviewModal, setOpenPreviewModal] = useState(false);
  const [editMonthPayment, setEditMonthPayment] = useState(false);

  // Modale esecuzione operazione (singola)
  const [openExecuteModal, setOpenExecuteModal] = useState<boolean>(false);
  const [selectedOp, setSelectedOp] = useState<OperationItem>();


  // callBack chiamate api
  const fetchPortfolioInfo = async (portfolio_uid: string, cancelled?: boolean) => {
    const portResp = await get_portfolioByUID({ portfolio_uid });
    if (!cancelled && portResp.response.success && portResp.data) {
      setPortfolioInfo(portResp.data);
      console.log(portResp.data, " info portfolio");
      // Si es un portfolio managed, obtiene info adicional
      if (portResp.data.type === "managed" && portResp.data.managed_uid) {
        const mp = await fetchManagedPortfoliosActive();
        if (mp.response.success && mp.data) {
          const match = mp.data.find((m) => m.managed_uid === portResp.data!.managed_uid);
          setManagedInfo(match);
        } else {
          setManagedInfo(undefined);
        }
      } else {
        setManagedInfo(undefined);
      }
    }
  };

  const fetchPrices = async (portfolio_uid: string, cancelled?: boolean) => {
    const pricesResp = await get_assetPrices({ portfolio_uid });
    if (!cancelled && pricesResp.response.success && pricesResp.data) {
      const map = Object.fromEntries(
        pricesResp.data.map((p: any) => [p.symbol, p.currentPrice, p.unitaryPrice_avg])
      );
      console.log(map, "prezzi fetchati");
      setPrices(map);
    }
  };


  const fetchProfit = async (portfolio_uid: string, cancelled?: boolean) => {
    try {
      // 🔹 Recupero report di pesatura
      const pesRes = await get_assetsEarnings({ portfolio_uid });
      console.log(pesRes.data, "profit fetchati")
      if (pesRes.response.success && pesRes.data) {
        setProfit(pesRes.data)
      } else {
        console.warn("⚠️ Nessuna operazione trovata.");
      }

    } catch (err) {
      console.error("Errore nel fetch delle operazioni o pesatura:", err);
    }
  }


  const fetchOperations = async (portfolio_uid: string, cancelled?: boolean) => {
    try {
      // 🔹 Recupero report di pesatura
      const pesRes = await get_portfolioWeighing(portfolio_uid);

      // Recupero operations valide 
      const realOpsRes = await fetch_portfolioAlignmentOperations(portfolio_uid)
      if (realOpsRes.response.success && realOpsRes.data) {
        setRealOpsRes(realOpsRes.data)
      } else {
        console.warn("⚠️ Nessuna operazione trovata.");
      }


      if (pesRes.response.success) {
        console.log("✅ Report di pesatura valido:", pesRes.data);
        // eventualmente potresti salvare il report in uno stato:
        setValidReportWeighing(pesRes.data);
      } else {
        console.warn("⚠️ Nessun report di pesatura valido trovato.");
      }


    } catch (err) {
      console.error("Errore nel fetch delle operazioni o pesatura:", err);
    }
  };


  const RefreshOperationsHistory = () => {
    // lógica en el padre
    setShouldRefreshA((n) => n + 1); // gatillo para A
  };


  // ===== FETCH BASE =====
  useEffect(() => {
    if (!portfolio_uid) return;

    let cancelled = false;

    const loadAll = async () => {
      try {
        setLoadingMode(true);
        // ricarica dati portfolio
        await fetchPortfolioInfo(portfolio_uid, cancelled);
        await fetchPrices(portfolio_uid, cancelled);

        // ricarica operazioni e pesatura
        await fetchOperations(portfolio_uid, cancelled);
        await fetchProfit(portfolio_uid, cancelled);

      } catch (err) {
        console.error("Errore caricamento dati portfolio:", err);
      } finally {
        if (!cancelled) setLoadingMode(false);
      }
    };

    loadAll();
  }, [portfolio_uid]);

  // ===== FETCH ALERT/REPORT: usa direttamente managed_uid dal PORTFOLIO =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const managedUid = portfolioInfo?.type === 'managed' ? portfolioInfo?.managed_uid : undefined;
      if (!managedUid) {
        setAlertsInfo([]);
        setValidReportInfo(undefined);
        return;
      }
      try {
        const [alerts, reports] = await Promise.all([
          get_validAlertsByManaged(managedUid),
          get_validReportsByManaged(managedUid),
        ]);

        if (cancelled) return;

        setAlertsInfo(alerts.response.success && alerts.response.data ? alerts.response.data.items : []);
        setValidReportInfo(reports.response.success ? reports.data : undefined);
      } catch (e) {
        if (!cancelled) {
          setAlertsInfo([]);
          setValidReportInfo(undefined);
        }
        console.error('Errore caricamento alert/report:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolioInfo?.managed_uid, portfolioInfo?.type]);


  //useMemo
  const totalAssetValue = useMemo(() => {
    if (!portfolioInfo?.assets || portfolioInfo.assets.length === 0) return 0;
    return portfolioInfo.assets.reduce((sum, a) => sum + (a.value_now ?? 0), 0);
  }, [portfolioInfo]);



  // ===== FORM ESECUZIONE OPERAZIONE =====
  const operation_FieldConfig: FieldConfig<OperationItem>[] = [
    {
      name: 'unitaryPrice',
      label: 'Valore Unitario',
      type: 'number',
      properties: { defaultValue: Number(selectedOp?.unitaryPrice) ?? 0, },
      required: true,
      grid: { md: 12 },

    },
  ];

  const autoSaving_FieldConfig: FieldConfig<OperationChangeImportMonth>[] = [
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
    }
  ];


  if (loadingMode || !portfolioInfo) {
    return <General_Loading theme="pageLoading" title="" />;
  }

  const totalCurrentValue = portfolioInfo?.cash_position + totalAssetValue;
  const progress = Math.min((totalCurrentValue / portfolioInfo?.target) * 100, 100);


  return (
    <>
      <MDBContainer fluid>
        <MDBRow>
          <MDBCol className="mb-3 p-0" md="12">
            <MDBRow className="d-flex justify-content-center align-items-center">
              {/* recap portolio */}
              <MDBCol xs="12" className="mb-4">
                <MDBCard className="shadow-sm" style={{ backgroundColor: "rgba(33, 56, 74, 1)", color: "white" }}>
                  <MDBCardHeader
                    className="py-3 px-4 border-bottom"

                  >
                    <MDBRow className="align-items-center gy-2 gx-3">
                      {/* Titolo e badge */}
                      <MDBCol xs="12" md="8">
                        <MDBCardTitle
                          tag="h5"
                          className="mb-0 d-flex align-items-center flex-wrap text-truncate"
                        >
                          <span className='me-2 fs-6 mb-2 mb-sm-0' style={{ background: "rgba(69, 85, 108, 1)", borderRadius: "8px", padding: "3px 6px", fontWeight: "400" }}>
                            {portfolioInfo.title}
                          </span>

                          {(portfolioInfo.type === "managed" && managedInfo?.title) && (
                            <span className='me-2  fs-6' style={{ background: "rgba(69, 85, 108, 1)", borderRadius: "8px", padding: "3px 6px", fontWeight: "400" }}>
                              Gestito | {managedInfo.title}
                            </span>
                          )}
                        </MDBCardTitle>
                      </MDBCol>


                    </MDBRow>
                  </MDBCardHeader>

                  <MDBCardBody className="">
                    <MDBRow className="gy-3 gx-2">
                      {/* Valore attuale */}
                      <MDBCol
                        xs="12"
                        md="12"
                        className="text-start"
                        style={{ color: "white" }}
                      >

                        <span className="mb-1 small">Valore Attuale (Cassa + Asset)</span>
                        <p className="mb-0 h6 fw-bold fs-5">
                          {fmtEUR(portfolioInfo.cash_position + totalAssetValue)}
                        </p>
                      </MDBCol>
                      <MDBCol xs="12" md="12" className="text-start mb-3">
                        <p className="mb-0">
                          <span className="">
                            Guadagni o Perdite Realizzate:
                          </span><br />
                          <span className="fw-bold fs-5"> {(profit.reduce((sum, item) => sum + item.earning_cash, 0)).toFixed(2).replace('.', ',')} €</span>
                        </p>
                      </MDBCol>
                    </MDBRow>
                    {/* cards nuove */}
                    <MDBRow>
                      <MDBCol className='mb-3' xs="12" md="4">
                        <MDBCard className="shadow-sm p-3" style={{ backgroundColor: "rgb(42,71,93)", color: "white", minHeight: "110px" }}>
                          <p className="m-0">
                            <MDBIcon fas icon="chart-line" className="me-2" />
                            Addebito Mensile
                          </p>
                          <p className="m-0"><b className="">{fmtEUR(toNumber(portfolioInfo.automatic_savings))}</b> Ogni 15 del mese</p>
                          <MDBCol xs="12" md="12" className="m-0">
                            <span className="">Obiettivo: </span>
                            <span className="fw-bold">{portfolioInfo.target}€ in {portfolioInfo.time_horizon_years} anni</span>
                          </MDBCol>
                        </MDBCard>
                      </MDBCol>

                      <MDBCol className='mb-3' xs="12" md="4">
                        <MDBCard className="shadow-sm p-3" style={{ backgroundColor: "rgb(42,71,93)", color: "white", minHeight: "110px" }}>
                          <MDBCol xs="12" md="12" className="text-start">
                            <MDBIcon far icon="calendar" className="me-2" />
                            <span className="">Progresso</span> <br />
                            <span className="fw-bold">{progress.toFixed(1)}%</span>
                          </MDBCol>
                          <MDBProgress className="mb-3 rounded" style={{ height: "10px" }}>
                            <MDBProgressBar
                              width={progress}
                              bgColor="info"
                              valuemin={0}
                              valuemax={100}
                              animated
                            />
                          </MDBProgress>
                        </MDBCard>
                      </MDBCol>

                      <MDBCol className='mb-3' xs="12" md="4">
                        <MDBCard className="shadow-sm p-3" style={{ backgroundColor: "rgb(42,71,93)", color: "white", minHeight: "110px" }}>
                          <p className="mb-0">
                            <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 17 17" fill="none" className='me-2'>
                              <circle cx="8.5" cy="8.5" r="2" stroke="#ECEFF3" />
                              <circle cx="8.5" cy="8.5" r="5" stroke="#ECEFF3" />
                              <circle cx="8.5" cy="8.5" r="8" stroke="#ECEFF3" />
                            </svg>
                            <span className="">Liquidità</span><br />
                            <span className="fw-bold">
                              {fmtEUR(portfolioInfo.cash_position)}
                            </span>
                          </p>
                          <MDBCol xs="12" md="12" className="text-start">
                            <p className="mb-0">
                              <span className="">
                                Valore asset prezzi attuali:{" "}
                              </span>
                              <span className="fw-bold">{fmtEUR(totalAssetValue)}</span>
                            </p>
                          </MDBCol>
                        </MDBCard>
                      </MDBCol>
                    </MDBRow>
                  </MDBCardBody>
                </MDBCard>
              </MDBCol>

              {/* composition portafoglio */}
              <MDBCol md="12" className="mb-3">
                <MDBCard className="">
                  <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                      <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
                        <MDBIcon fas icon="wallet" className="me-2" />
                        Composizione
                      </MDBCardTitle>
                    </div>
                  </MDBCardHeader>
                  <MDBCardBody className="bg-white d-flex flex-wrap px-2">
                    <PortfolioComposition
                      portfolio={portfolioInfo}
                      managedInfo={managedInfo}
                      assetPrices={prices}
                      realOps={realOpsRes}
                      profit={profit}
                      pesature={validReportWeighing}
                      onReloadProfit={() => fetchProfit(portfolio_uid!)} 
                      onReloadPrices={() => fetchPrices(portfolio_uid!)}
                      onReloadPortfolio={() => fetchPortfolioInfo(portfolio_uid!)}
                      onReloadOperations={() => fetchOperations(portfolio_uid!)}

                    />
                  </MDBCardBody>
                </MDBCard>
              </MDBCol>

              {/* pesatura portafolio */}
              {portfolioInfo.type === "managed" &&
                <>
                  <MDBCol md="12" className="mb-3" >
                    <MDBCard className="">
                      <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                          <MDBCardTitle tag="h5" className="mb-2 mb-md-0 w-100">
                            <div className='d-flex align-items-center justify-content-between'>
                              <div>
                                <MDBIcon fas icon="balance-scale" className="me-2" />
                                Pesatura

                              </div>
                              <MDBIcon fas icon="question-circle" style={{ cursor: "help" }}
                                onClick={() => {
                                  if (validReportInfo) {
                                    setHtmlPreview(validReportInfo.html_body);
                                    setModalTitle(validReportInfo.title || 'Anteprima');
                                    setOpenPreviewModal(true);
                                  } else {
                                    setHtmlPreview("");
                                    setModalTitle("Nessun report disponibile");
                                    setOpenPreviewModal(true);
                                  }
                                }}
                              />
                            </div>
                          </MDBCardTitle>
                        </div>
                      </MDBCardHeader>
                      <MDBCardBody className="bg-white"  >
                        <AssetAllocation
                          portfolio={portfolioInfo}
                          managedInfo={managedInfo}
                          pesature={validReportWeighing}
                          realOps={realOpsRes}
                          onSuccess={() => {
                            fetchPrices(portfolio_uid!);
                            fetchPortfolioInfo(portfolio_uid!);
                            fetchOperations(portfolio_uid!);
                          }}
                        />
                      </MDBCardBody>
                    </MDBCard>

                  </MDBCol>
                  <MDBCol md="12" className="mb-3" >
                    {/* {realOpsRes && */}
                    <SuggestedAlertsList
                      validReportWeighing={validReportWeighing}
                      alertsInfo={alertsInfo}
                      realOpsRes={realOpsRes}
                      setSelectedOp={setSelectedOp}
                      setOpenExecuteModal={setOpenExecuteModal}
                      setOpenPreviewModal={setOpenPreviewModal}
                    />
                    {/* } */}
                  </MDBCol>
                </>
              }

              {/* visualizzazione operazioni custom */}
              {portfolioInfo.type === "custom" &&
                <MDBCol md="12" className="mb-3">
                  <CustomOperationComponent
                    portfolioInfo={portfolioInfo}
                  />
                </MDBCol>
              }


              {/* Switcher contenuti */}
              <MDBCol md="12">
                <MDBCard>
                  <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                      <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
                        <MDBIcon fas icon="bars" />
                        <span className='mx-2'>Gestione</span>
                      </MDBCardTitle>
                    </div>
                  </MDBCardHeader>

                  <MDBCardBody className="">
                    <General_ContentSwitcher
                      switchMode="tabs"
                      properties={{ fill: true }}
                      contents={[
                        {
                          title: 'Storico Operazioni',
                          startOpen: false,
                          className: 'p-1',
                          contentElement: (
                            <MDBCol md="12" className="mb-3 ">
                              <OperationsHistory
                                portfolio_uid={portfolio_uid!}
                                onReloadPrices={() => fetchPrices(portfolio_uid!)}
                                onReloadPortfolio={() => fetchPortfolioInfo(portfolio_uid!)}
                                onReloadOperations={() => fetchOperations(portfolio_uid!)}


                              />
                            </MDBCol>
                          ),
                        },
                        {
                          title: 'Storico Alerts',
                          startOpen: false,
                          className: 'p-1',
                          contentElement: (
                            <MDBCol md="12" className="mb-3 ">
                              <AlertsHistory
                                portfolio_uid={portfolio_uid!}
                              />
                            </MDBCol>
                          ),
                        },
                      ]}
                    />
                  </MDBCardBody>

                </MDBCard>
              </MDBCol>
            </MDBRow>
          </MDBCol>
        </MDBRow>

        {/* MODALE ESEGUI OPERAZIONE // OPERAZIONI CONSIGLIATE */}
        <MDBModal open={openExecuteModal} setOpen={setOpenExecuteModal} tabIndex={-1}>
          <MDBModalDialog>
            <MDBModalContent>
              <MDBModalHeader>
                <MDBModalTitle>Esegui Operazione</MDBModalTitle>
                <MDBBtn className="btn-close" color="none" onClick={() => setOpenExecuteModal(false)} />
              </MDBModalHeader>
              <MDBModalBody>
                {/* header sintetico */}
                {selectedOp && (
                  <div className="rounded bg-light p-2 mb-3 small">
                    <div className="d-flex justify-content-between">
                      <div>
                        <strong>{selectedOp.symbol}</strong> —{' '}
                        <MDBBadge color={selectedOp.operation === 'buy' ? 'success' : 'danger'}>
                          {selectedOp.operation === 'buy' ? 'Compra' : 'Vendi'}
                        </MDBBadge>
                      </div>
                      <div>
                        Qta: <strong>{selectedOp.unitQuantity}</strong> · Prezzo:{' '}
                        <strong>{fmtEUR(selectedOp.unitaryPrice)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                <GeneralForm<OperationItem, {}>
                  mode="create"
                  fields={operation_FieldConfig}
                  createData={async (formData) => {
                    try {
                      let item = {
                        portfolio_uid: portfolio_uid,
                        symbol: selectedOp?.symbol,
                        operation: selectedOp?.operation,
                        unitaryPrice: formData.unitaryPrice,
                        unitQuantity: selectedOp?.unitQuantity,
                        source: selectedOp?.source,
                        nfo_uid: selectedOp?.nfo_uid
                      } as OperationItem;

                      const result = await createOperation(item)
                      setDateLastOperation("now")
                    } catch (err) {
                      console.error('Errore caricamento dati portfolio:', err);
                    } finally {
                      setLoadingMode(false);
                    }
                    return { response: { success: true, message: 'OK', data: formData }, data: formData };
                  }}
                  createBtnProps={{ label: 'Conferma operazione' }}
                  onSuccess={() => {
                    fetchPrices(portfolio_uid!);
                    fetchPortfolioInfo(portfolio_uid!);
                    fetchOperations(portfolio_uid!);
                    setOpenExecuteModal(false);
                  }}
                />
              </MDBModalBody>
            </MDBModalContent>
          </MDBModalDialog>
        </MDBModal>

        {/* Modal anteprima HTML di PDF */}
        {htmlPreview && (
          <MDBModal open={openPreviewModal} setOpen={setOpenPreviewModal} tabIndex={-1}>
            <MDBModalDialog size="xl" centered scrollable>
              <MDBModalContent className="shadow-4 rounded-6">
                <MDBModalHeader className="bg-primary text-white">
                  <MDBIcon fas icon="file-pdf" className="me-2" />
                  <MDBModalTitle>{modalTitle}</MDBModalTitle>
                  <MDBBtn
                    className="btn-close btn-close-white"
                    color="none"
                    onClick={() => setOpenPreviewModal(false)}
                  ></MDBBtn>
                </MDBModalHeader>
                <MDBModalBody className="bg-light p-4">
                  <div
                    className="bg-white p-3 rounded-5 shadow-sm"
                    dangerouslySetInnerHTML={{ __html: htmlPreview }}
                  />
                </MDBModalBody>
              </MDBModalContent>
            </MDBModalDialog>
          </MDBModal>
        )}

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
                  fields={autoSaving_FieldConfig}
                  params={{ portfolio_uid: portfolio_uid! }}
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
      </MDBContainer>
    </>
  );
};

export default Portfolio;
