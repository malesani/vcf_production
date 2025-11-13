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

  const [portfolioInfo, setPortfolioInfo] = useState<PortfolioInfo>();
  const [managedInfo, setManagedInfo] = useState<PortManagedInfo>();
  const [prices, setPrices] = useState<Record<string, number | null>>({});


  //da capire
  const [alertsInfo, setAlertsInfo] = useState<NfoInfo[]>([]);
  const [validReportInfo, setValidReportInfo] = useState<NfoInfo>();


  //per gestione pesature
  const [validReportWeighing, setValidReportWeighing] = useState<SymbolWeighing[]>();
  const [realOpsRes, setRealOpsRes] = useState<OperationItem[]>([]);

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
        pricesResp.data.map((p: any) => [p.symbol, p.currentPrice])
      );
      setPrices(map);
    }
  };

  // const fetchSuggestedOps = async (portfolio_uid: string, cancelled?: boolean) => {
  //   const sug = await fetchSuggestedOperations(portfolio_uid);
  //   if (!cancelled && sug.response.success) {
  //     setSuggestedOperations(sug.data ?? null);
  //     setSuggesteAlertPdf("");
  //   }
  // };

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


  // ===== FETCH BASE =====
  useEffect(() => {
    if (!portfolio_uid) return;

    let cancelled = false;

    const loadAll = async () => {
      try {
        setLoadingMode(true);

        await fetchPortfolioInfo(portfolio_uid, cancelled);
        await fetchPrices(portfolio_uid, cancelled);
        await fetchOperations(portfolio_uid, cancelled);

      } catch (err) {
        console.error("Errore caricamento dati portfolio:", err);
      } finally {
        if (!cancelled) setLoadingMode(false);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [portfolio_uid, dateLastOperation]);

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

        setAlertsInfo(alerts.response.success ? alerts.data ?? [] : []);
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
    return <General_Loading theme="pageLoading" title="Dashboard Portafoglio" />;
  }

  const totalCurrentValue = portfolioInfo?.cash_position + totalAssetValue;
  const progress = Math.min((totalCurrentValue / portfolioInfo?.target) * 100, 100);


  return (
    <>
      <MDBContainer>
        <MDBRow>
          <MDBCol className="mb-3" md="12">
            <MDBRow className="d-flex justify-content-center align-items-center">
              {/* recap portolio */}
              <MDBCol xs="12" className="mb-4">
                <MDBCard className="shadow-sm">
                  <MDBCardHeader
                    className="py-3 px-4 border-bottom"
                    style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                  >
                    <MDBRow className="align-items-center gy-2 gx-3">
                      {/* Titolo e badge */}
                      <MDBCol xs="12" md="8">
                        <MDBCardTitle
                          tag="h5"
                          className="mb-0 d-flex align-items-center flex-wrap text-truncate"
                        >
                          <MDBIcon fas icon="chart-line" className="me-2" />

                          <span className='me-2'>
                            {portfolioInfo.title}
                          </span>

                          {(portfolioInfo.type === "managed" && managedInfo?.title) && (
                            <MDBBadge color="light" className="text-dark  mt-2 mt-md-0" style={{ maxWidth: "100%" }}>
                              Gestito | {managedInfo.title}
                            </MDBBadge>
                          )}
                        </MDBCardTitle>
                      </MDBCol>

                      {/* Valore attuale */}
                      <MDBCol
                        xs="12"
                        md="4"
                        className="text-md-end text-start"
                        style={{ color: "white" }}
                      >
                        <p className="mb-1 small">Valore Attuale (Cassa + Asset)</p>
                        <p className="mb-0 h6 fw-bold">
                          {fmtEUR(portfolioInfo.cash_position + totalAssetValue)}
                        </p>
                      </MDBCol>
                    </MDBRow>
                  </MDBCardHeader>

                  <MDBCardBody className="bg-white">
                    <MDBCol xs="12" className='d-flex align-items-center justify-content-between small'>
                      <p className="m-0">
                        Addebito Mensile
                        <b className="ms-2">{fmtEUR(toNumber(portfolioInfo.automatic_savings))}</b>
                      </p>
                      <p className="m-0">Ogni 15 del mese</p>
                    </MDBCol>
                    <MDBRow className="gy-3 gx-2">
                      {/* Target e progresso */}
                      <MDBCol xs="12">
                        <MDBRow className="align-items-center justify-content-between">
                          <MDBCol xs="12" md="6" className="m-0">
                            <span className="">Obiettivo: </span>
                            <span className="fw-bold">{portfolioInfo.target}€</span>
                            <span className="text-muted ms-2">in {portfolioInfo.time_horizon_years} anni</span>
                          </MDBCol>
                          <MDBCol xs="12" md="6" className="text-md-end text-start mt-2 mt-md-0">
                            <span className="text-muted me-1">Progresso</span>
                            <span className="fw-bold">{progress.toFixed(1)}%</span>
                          </MDBCol>
                        </MDBRow>
                      </MDBCol>

                      {/* Barra di progresso */}
                      <MDBCol xs="12">
                        <MDBProgress className="mb-3 rounded" style={{ height: "10px" }}>
                          <MDBProgressBar
                            width={progress}
                            bgColor="info"
                            valuemin={0}
                            valuemax={100}
                            animated
                          />
                        </MDBProgress>
                      </MDBCol>

                      {/* Dati finanziari */}
                      <MDBCol xs="12" md="6">
                        <p className="mb-0">
                          <span className="text-muted">Liquidità: </span>
                          <span className="fw-bold">
                            {fmtEUR(portfolioInfo.cash_position)}
                          </span>
                        </p>
                      </MDBCol>
                      <MDBCol xs="12" md="6" className="text-md-end text-start">
                        <p className="mb-0">
                          <span className="text-muted">
                            Valore asset (prezzi attuali):{" "}
                          </span>
                          <span className="fw-bold">{fmtEUR(totalAssetValue)}</span>
                        </p>
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
                        Composizione Portafoglio
                      </MDBCardTitle>
                    </div>
                  </MDBCardHeader>
                  <MDBCardBody className="bg-white d-flex flex-wrap">
                    <PortfolioComposition
                      portfolio={portfolioInfo}
                      managedInfo={managedInfo}
                      assetPrices={prices}
                      onReloadPrices={() => fetchPrices(portfolio_uid!)}
                      onReloadPortfolio={() => fetchPortfolioInfo(portfolio_uid!)}
                      onReloadOperations={() => fetchOperations(portfolio_uid!)}
                    />
                  </MDBCardBody>
                </MDBCard>
              </MDBCol>

              {/* pesatura portafolio */}
              {portfolioInfo.type === "managed" &&
                <MDBCol md="12" className="mb-3" >
                  <MDBCard className="">
                    <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <MDBCardTitle tag="h5" className="mb-2 mb-md-0 w-100">
                          <div className='d-flex align-items-center justify-content-between'>
                            <div>
                              <MDBIcon fas icon="balance-scale" className="me-2" />
                              Pesatura Portafoglio

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
                        onSuccess={() => {
                          fetchPrices(portfolio_uid!);
                          fetchPortfolioInfo(portfolio_uid!);
                          fetchOperations(portfolio_uid!);
                        }}
                        pesature={validReportWeighing}
                        realOps={realOpsRes}
                      />
                    </MDBCardBody>
                  </MDBCard>
                </MDBCol>
              }

              {/* visualizzazione operazioni custom */}
              {portfolioInfo.type === "custom" &&
                <MDBCol md="12" className="mb-3">
                  <CustomOperationComponent
                    portfolioInfo={portfolioInfo}
                  />
                </MDBCol>
              }


              {/* {realOpsRes && */}
              <SuggestedAlertsList
                alertsInfo={validReportWeighing}
                realOpsRes= {realOpsRes}
                setSelectedOp={setSelectedOp}
                setOpenExecuteModal={setOpenExecuteModal}
                setOpenPreviewModal={setOpenPreviewModal}
              />
              {/* } */}


              {/* Switcher contenuti */}
              <MDBCol md="12">
                <MDBCard>
                  <MDBCardHeader className="py-3 px-4 border-bottom" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                      <MDBCardTitle tag="h5" className="mb-2 mb-md-0 d-flex align-items-center">
                        <MDBIcon fas icon="bars" />
                        <span className='mx-2'>Gestione Portafoglio</span>
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

        {/* MODALE ESEGUI OPERAZIONE */}
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

                      await createOperation(item)

                      setDateLastOperation("now")
                    } catch (err) {
                      console.error('Errore caricamento dati portfolio:', err);
                    } finally {
                      setLoadingMode(false);
                    }
                    return { response: { success: true, message: 'OK', data: formData }, data: formData };
                  }}
                  createBtnProps={{ label: 'Conferma operazione' }}
                  onSuccess={async () => {
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
