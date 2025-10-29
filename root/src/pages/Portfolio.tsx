import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  MDBTable,
  MDBTableBody,
  MDBTableHead,
  MDBBadge,
  MDBListGroup,
  MDBListGroupItem,
} from 'mdb-react-ui-kit';

import { General_ContentSwitcher } from '../app_components/General_ContentSwitcher';
import { General_Loading } from '../app_components/General_Loading';
import { FieldConfig, GeneralForm } from '../app_components/GeneralForm';
import GeneralTable, { ColumnConfig, ActionConfig } from '../app_components/GeneralTable';

import {
  PortfolioInfo,
  PortfolioAssets,
  get_portfolioByUID,
  get_assetPrices,
} from '../api_module/portfolio/PortfolioData';

import {
  fetchManagedPortfoliosActive,
  PortManagedInfo,
} from '../api_module/portfolioManaged/PortManagedData';

import PortfolioCard from '../components/portfolios/PortfolioCard';
import { NfoInfo, fetchNfoAlerts, fetchNfoReports } from '../api_module/nfo/NfoData';
import {
  ExecutedOperationRow,
  SuggestedAlertItem,
  SuggestedAlertsOps,
  OperationItem,
  SuggestedOperationsResponse,
  fetchSuggestedOperations,
  fetchOperationsPaginated,
  SuggestedReportOps,
  createOperation
} from '../api_module/operations/OperationsRequest';

import OperationsHistory from '../components/portfolios/OperationsList';

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

const Portfolio: React.FC = () => {
  const { portfolio_uid } = useParams<{ portfolio_uid: string }>();

  const [loadingMode, setLoadingMode] = useState(true);

  const [portfolioInfo, setPortfolioInfo] = useState<PortfolioInfo>();
  const [managedInfo, setManagedInfo] = useState<PortManagedInfo>();
  const [prices, setPrices] = useState<Record<string, number | null>>({});

  const [alertsInfo, setAlertsInfo] = useState<NfoInfo[]>([]);
  const [reportInfo, setReportInfo] = useState<NfoInfo[]>([]);
  const [suggestedOperations, setSuggestedOperations] = useState<SuggestedOperationsResponse | null>(
    null
  );

  //last operation
  const [dateLastOperation, setDateLastOperation] = useState<string>("");

  // storico operazioni (paginato)
  const [opsRows, setOpsRows] = useState<ExecutedOperationRow[]>([]);
  const [opsMeta, setOpsMeta] = useState<{ page: number; per_page: number; pages_num?: number; items_num?: number }>({
    page: 1,
    per_page: 25,
  });

  // Modale anteprima HTML NFO
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');
  const [openPreviewModal, setOpenPreviewModal] = useState(false);

  // Modale esecuzione operazione (singola)
  const [openExecuteModal, setOpenExecuteModal] = useState<boolean>(false);
  const [selectedOp, setSelectedOp] = useState<
    | {
      symbol: string;
      operation: 'buy' | 'sell';
      unitQuantity: number;
      unitaryPrice: number;
      source?: 'report' | 'alert';
      nfo_uid?: string;
    }
    | undefined
  >(undefined);

  // Flag create/update/delete disabilitati
  const disableCUDFalse = useRef({ create: false, update: false, delete: false });

  // ===== FETCH BASE =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!portfolio_uid) return;

      try {
        setLoadingMode(true);

        const portResp = await get_portfolioByUID({ portfolio_uid });
        if (!cancelled && portResp.response.success && portResp.data) {
          setPortfolioInfo(portResp.data);

          // (opzionale) dettagli managed “attivo”; anche se non trovato, gli alert ora vengono fetchati usando direttamente managed_uid dal portfolio
          if (portResp.data.type === 'managed' && portResp.data.managed_uid) {
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

        // prezzi correnti
        const pricesResp = await get_assetPrices({ portfolio_uid });
        if (!cancelled && pricesResp.response.success && pricesResp.data) {
          const map = Object.fromEntries(pricesResp.data.map((p: any) => [p.symbol, p.currentPrice]));
          setPrices(map);
        }

        // suggerimenti operazioni
        const sug = await fetchSuggestedOperations(portfolio_uid);
        if (!cancelled && sug.response.success) {
          setSuggestedOperations(sug.data ?? null);
        }

        // storico operazioni (pag.1)
        const opsRes = await fetchOperationsPaginated({
          portfolio_uid,
          page: 1,
          per_page: 25,
        });
        if (!cancelled && opsRes.response.success) {
          const rows = (opsRes.data as any)?.rows ?? [];
          const meta = (opsRes.data as any)?.meta ?? { page: 1, per_page: 25 };
          setOpsRows(rows);
          setOpsMeta(meta);
        }
      } catch (err) {
        console.error('Errore caricamento dati portfolio:', err);
      } finally {
        if (!cancelled) setLoadingMode(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolio_uid, dateLastOperation ]);

  // ===== FETCH ALERT/REPORT: usa direttamente managed_uid dal PORTFOLIO =====
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const managedUid = portfolioInfo?.type === 'managed' ? portfolioInfo?.managed_uid : undefined;
      if (!managedUid) {
        setAlertsInfo([]);
        setReportInfo([]);
        return;
      }
      try {
        const [alerts, reports] = await Promise.all([
          fetchNfoAlerts({ managed_uid: managedUid }),
          fetchNfoReports({ managed_uid: managedUid }),
        ]);

        if (cancelled) return;

        setAlertsInfo(alerts.response.success ? alerts.data ?? [] : []);
        setReportInfo(reports.response.success ? reports.data ?? [] : []);
      } catch (e) {
        if (!cancelled) {
          setAlertsInfo([]);
          setReportInfo([]);
        }
        console.error('Errore caricamento alert/report:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [portfolioInfo?.managed_uid, portfolioInfo?.type]);

  // ===== COLONNE =====
  // tabella Assets del portafoglio (valori derivati mostrati lato cell renderer di GeneralTable, se serve)
  const assetColumns = useMemo<ColumnConfig<PortfolioAssets>[]>(
    () => [
      { field: 'symbol', label: 'Asset' },
      { field: 'unitQuantity', label: 'Quantità' },
      { field: 'unitaryPrice_lastOp', label: 'Prezzo ultimo acquisto' },
      { field: 'unitaryPrice_now', label: 'Prezzo attuale' },
      { field: 'value_now', label: 'Valore attuale' },
    ],
    [prices]
  );

  // tabelle liste NFO (storico notifiche)
  const alertsInfoColumns = useMemo<ColumnConfig<NfoInfo>[]>(
    () => [
      { field: 'title', label: 'Titolo' },
      { field: 'description', label: 'Descrizione' },
      { field: 'status', label: 'Stato' },
    ],
    []
  );

  const reportsInfoColumns = useMemo<ColumnConfig<NfoInfo>[]>(
    () => [
      { field: 'year', label: 'Anno' },
      { field: 'month_num', label: 'Mese' },
      { field: 'title', label: 'Titolo' },
      { field: 'description', label: 'Descrizione' },
      { field: 'status', label: 'Stato' },
    ],
    []
  );

  // ===== FORM ESECUZIONE OPERAZIONE =====
  const operation_FieldConfig: FieldConfig<OperationItem>[] = [
    {
      name: 'unitaryPrice',
      label: 'Valore Unitario',
      type: 'number',
      properties: { defaultValue: Number(selectedOp?.unitaryPrice) ?? 0 },
      required: true,
      grid: { md: 12 },
    },
  ];

  // ===== RENDER SUGGERIMENTI (REPORT + ALERTS) =====
  const renderSuggestedFromReport = (sugReportOps: SuggestedReportOps) => {
    if (!sugReportOps) { return null; }

    const report = sugReportOps;
    if (!report || !Array.isArray(report.operations) || report.operations.length === 0) return null;

    const title = sugReportOps.nfo_info?.title ?? 'Report';
    return (
      <MDBCardBody>
        <div className="d-flex align-items-center mb-3">
          <MDBIcon fas icon="file-alt" className="text-primary me-2" />
          <h5 className="mb-0">{title}</h5>
        </div>
        <MDBTable align="middle" hover responsive>
          <MDBTableHead light>
            <tr>
              <th>Symbol</th>
              <th>Operazione</th>
              <th>N° Azioni</th>
              <th>Prezzo unitario</th>
              <th>Azioni</th>
            </tr>
          </MDBTableHead>
          <MDBTableBody>
            {report.operations.map((op, idx) => (
              <tr key={`rep-${idx}`}>
                <td>{op.symbol}</td>
                <td>
                  <MDBBadge color={op.operation === 'buy' ? 'success' : 'danger'}>
                    {op.operation === 'buy' ? 'Compra' : 'Vendi'}
                  </MDBBadge>
                </td>
                <td>
                  <b>{op.unitQuantity}</b>
                </td>
                <td>{fmtEUR(op.unitaryPrice)} /cad.</td>
                <td>
                  <MDBBtn
                    color="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedOp({
                        symbol: op.symbol,
                        operation: op.operation,
                        unitQuantity: op.unitQuantity,
                        unitaryPrice: op.unitaryPrice,
                        source: 'report',
                        nfo_uid: suggestedOperations?.report_operations?.nfo_info?.nfo_uid,
                      });
                      setOpenExecuteModal(true);
                    }}
                  >
                    <MDBIcon fas icon="play" className="me-2" />
                    Esegui
                  </MDBBtn>
                </td>
              </tr>
            ))}
          </MDBTableBody>
        </MDBTable>
      </MDBCardBody>
    );
  };

  const renderSuggestedFromAlerts = (report_operationsLength: number, suggAlertOps: SuggestedAlertsOps) => {
    if (!suggAlertOps) return null;


    const alerts = suggAlertOps.operations_byAlert ?? {};
    const entries = Object.entries(alerts); // Record<string, SuggestedAlertItem>

    if (entries.length === 0) return null;

    if (report_operationsLength == 0) {
      return (
        <>
          {entries.map(([alertId, alert]) => {
            const alertBlock = alert as SuggestedAlertItem;
            const rows = alertBlock?.operations ?? [];
            if (rows.length === 0) return null;

            const title = alertBlock.alert_title ?? 'Alert operativo';

            return (
              <MDBCardBody key={alertId}>
                <div className="d-flex align-items-center mb-3">
                  <MDBIcon fas icon="exclamation-circle" className="text-warning me-2" />
                  <h5 className="mb-0">{title}</h5>
                  {alertBlock.scheduled_at && (
                    <MDBBadge color="light" className="ms-2">
                      {alertBlock.scheduled_at}
                    </MDBBadge>
                  )}
                </div>

                <MDBTable align="middle" hover responsive>
                  <MDBTableHead light>
                    <tr>
                      <th>Symbol</th>
                      <th>Operazione</th>
                      <th>N° Azioni</th>
                      <th>Prezzo unitario</th>
                      <th>Azioni</th>
                    </tr>
                  </MDBTableHead>
                  <MDBTableBody>
                    {rows.map((op, idx) => (
                      <tr key={`alert-${alertId}-${idx}`}>
                        <td>{op.symbol}</td>
                        <td>
                          <MDBBadge color={op.operation === 'buy' ? 'success' : 'danger'}>
                            {op.operation === 'buy' ? 'Compra' : 'Vendi'}
                          </MDBBadge>
                        </td>
                        <td>
                          <b>{op.unitQuantity}</b>
                        </td>
                        <td>{fmtEUR(op.unitaryPrice)} /cad.</td>
                        <td>
                          <MDBBtn
                            color="primary"
                            size="sm"
                            onClick={() => {
                              setSelectedOp({
                                symbol: op.symbol,
                                operation: op.operation,
                                unitQuantity: op.unitQuantity,
                                unitaryPrice: op.unitaryPrice,
                                source: 'alert',
                              });
                              setOpenExecuteModal(true);
                            }}
                          >
                            <MDBIcon fas icon="play" className="me-2" />
                            Esegui
                          </MDBBtn>
                        </td>
                      </tr>
                    ))}
                  </MDBTableBody>
                </MDBTable>
              </MDBCardBody>
            );
          })}
        </>
      );
    } else {
      return (
        <MDBCardBody className="pt-0">
          <hr className="mt-0"></hr>
          <div className="d-flex flex-column align-items-start mb-3">
            <h5 className="mb-0"><MDBIcon fas icon="exclamation-circle" className="text-warning me-2" />Nuovi Alert</h5>
            <p className="mb-0">Allinea il report per procedere con gli accumuli.</p>
          </div>
          <MDBListGroup style={{ minWidth: '22rem' }}>
            {entries.map(([alertId, alert]) => {
              const alertBlock = alert as SuggestedAlertItem;
              const rows = alertBlock?.operations ?? [];
              if (rows.length === 0) return null;

              const title = alertBlock.alert_title ?? 'Alert operativo';

              return (
                <MDBListGroupItem key={alertId} noBorders color='warning' className='px-3 mb-2 rounded-3'>
                  <div className="d-flex align-items-center justify-content-between">
                    <h5 className="mb-0">{title}</h5>
                    {alertBlock.scheduled_at && (
                      <MDBBadge pill className='me-2 text-dark' color='light'>
                        {new Date(alertBlock.scheduled_at)
                          .toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </MDBBadge>
                    )}
                  </div>
                </MDBListGroupItem>
              );
            })}
          </MDBListGroup>
        </MDBCardBody>
      );
    }


  };


  if (loadingMode || !portfolioInfo) {
    return <General_Loading theme="pageLoading" title="Dashboard Portafoglio" />;
  }

  return (
    <>
      <MDBContainer>
        {/* Header pagina */}
        <MDBRow className="mb-4">
          <MDBCol>
            <div className="py-2 mb-3">
              <div className="d-flex flex-row align-items-center">
                <span className="fs-2 fw-bold text-dark">{portfolioInfo.title}</span>
              </div>
              <div className="d-flex">
                <span className="text-muted fs-5">Dettaglio Portafoglio</span>
              </div>
            </div>
          </MDBCol>
        </MDBRow>

        <MDBRow>
          <MDBCol className="mb-3" md="12">
            <MDBRow className="d-flex justify-content-center align-items-center">
              {/* Modal anteprima HTML */}
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

              {/* Card riepilogo portafoglio */}
              <MDBCol md="12" className="mb-3">
                <PortfolioCard
                  portfolio={portfolioInfo}
                  managedInfo={managedInfo}
                  assetPrices={prices}
                />
              </MDBCol>

              {/* SUGGERIMENTI OPERAZIONI */}
              {suggestedOperations &&
                <MDBCard className="mb-4">
                  {renderSuggestedFromReport(suggestedOperations.report_operations)}
                  {renderSuggestedFromAlerts(suggestedOperations.report_operations?.operations.length ?? 0, suggestedOperations.alert_operations)}
                </MDBCard>
              }
              {/* Switcher contenuti */}
              <MDBCol md="12">
                <MDBCard>
                  <MDBCardBody>
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
                              portfolio_tipe={portfolioInfo.type}  
                            />
                            </MDBCol>
                          ),
                        },
                        {
                          title: 'Asset del Portafoglio',
                          startOpen: true,
                          className: 'p-1',
                          contentElement: (
                            <MDBCol md="12" className="mb-3 ">
                              <MDBCard className="p-4 mb-3">
                                <GeneralTable<PortfolioAssets, {}, {}>
                                  title="Composizione Portafoglio"
                                  icon="list-alt"
                                  columns={assetColumns}
                                  fields={[
                                    { name: 'symbol', label: 'Asset', required: true, grid: { md: 3 } },
                                    { name: 'unitQuantity', label: 'Quantità', required: true, grid: { md: 3 } },
                                    {
                                      name: 'unitaryPrice_lastOp',
                                      label: 'Prezzo ultimo acquisto',
                                      required: true,
                                      grid: { md: 6 },
                                    },
                                  ]}
                                  data={portfolioInfo.assets}
                                  showSearch={false}
                                  disableNotVisible={disableCUDFalse.current}
                                />
                              </MDBCard>
                            </MDBCol>
                          ),
                        },
                        {
                          title: 'Storico Notifiche',
                          startOpen: false,
                          className: 'p-1',
                          contentElement: (
                            <>
                              <MDBCol md="12" className="mb-3 ">
                                <MDBCard className="p-4 mb-3">
                                  <GeneralTable<NfoInfo, {}, {}>
                                    title="Alerts"
                                    icon="exclamation-circle"
                                    columns={alertsInfoColumns}
                                    fields={[
                                      { name: 'title', label: 'Titolo', required: true, grid: { md: 4 } },
                                      { name: 'description', label: 'Descrizione', required: true, grid: { md: 8 } },
                                    ]}
                                    data={alertsInfo}
                                    enableCreate={false}
                                    showSearch={false}
                                    disableNotVisible={disableCUDFalse.current}
                                    actions={[
                                      {
                                        icon: 'eye',
                                        buttonProps: { color: 'primary' },
                                        onClick: (row) => {
                                          setHtmlPreview(row.html_body || '');
                                          setModalTitle(row.title || 'Anteprima');
                                          setOpenPreviewModal(true);
                                        },
                                      },
                                    ]}
                                  />
                                </MDBCard>
                              </MDBCol>
                              <MDBCol md="12" className="mb-3 ">
                                <MDBCard className="p-4 mb-3">
                                  <GeneralTable<NfoInfo, {}, {}>
                                    title="Reports"
                                    icon="file-alt"
                                    columns={reportsInfoColumns}
                                    fields={[
                                      { name: 'year', label: 'Anno', required: true, grid: { md: 3 } },
                                      { name: 'month_num', label: 'Mese', required: true, grid: { md: 3 } },
                                      { name: 'title', label: 'Titolo', required: true, grid: { md: 6 } },
                                    ]}
                                    data={reportInfo}
                                    showSearch={false}
                                    disableNotVisible={disableCUDFalse.current}
                                    actions={[
                                      {
                                        icon: 'eye',
                                        buttonProps: { color: 'primary' },
                                        onClick: (row) => {
                                          setHtmlPreview(row.html_body || '');
                                          setModalTitle(row.title || 'Anteprima');
                                          setOpenPreviewModal(true);
                                        },
                                      },
                                    ]}
                                  />
                                </MDBCard>
                              </MDBCol>
                            </>
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
                    console.log(selectedOp)
                    try {
                      let item = {
                        portfolio_uid: portfolio_uid,   
                        symbol: selectedOp?.symbol,            
                        operator: selectedOp?.operation,
                        unitaryPrice: formData.unitaryPrice,
                        unitQuantity: selectedOp?.unitQuantity
                      } as OperationItem
                      const response = await createOperation(item)
                      console.log(response)
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
                    // refresh storico e suggested
                    if (portfolio_uid) {
                      const [ops, sug] = await Promise.all([
                        fetchOperationsPaginated({ portfolio_uid, page: opsMeta.page, per_page: opsMeta.per_page }),
                        fetchSuggestedOperations(portfolio_uid),
                      ]);
                      if (ops.response.success && ops.data?.rows) {
                        setOpsRows(ops.data.rows);
                        setOpsMeta(ops.data.meta ?? opsMeta);
                      }
                      if (sug.response.success) {
                        setSuggestedOperations(sug.data ?? null);
                      }
                    }
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
