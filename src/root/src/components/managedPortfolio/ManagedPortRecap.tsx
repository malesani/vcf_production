import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { ResponsiveLine } from '@nivo/line'

// Se il tuo tipo si chiama PortManagedInfo, rinomina l'import in PortManaged
// import { PortManagedInfo as PortManaged } from '../../api_module/portfolioManaged/PortManagedData';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';

import {
  MDBCard,
  MDBTable,
  MDBCardBody,
  MDBCardTitle,
  MDBCardText,
  MDBTableHead,
  MDBBadge,
  MDBBtn,
  MDBRow,
  MDBTableBody,
  MDBCol,
  MDBContainer
} from "mdb-react-ui-kit";

export interface PieDatum {
  id?: string | number;
  label?: string;
  value?: number;
  color?: string;
}

export interface ManagedPortRecapProps {
  data: PortManagedInfo;
  pieData: PieDatum[];
  onClickBuy?: () => void;
}

const fmtPct = (n: number, digits = 2) =>
  `${Number(n).toFixed(digits).replace('.', ',')}%`;

const ManagedPortRecap: React.FC<ManagedPortRecapProps> = ({ data, pieData, onClickBuy }) => {
  const advGrowth =
    data.adv_growthPercentTo !== undefined && data.adv_growthPercentTo !== null
      ? `${data.adv_growthPercentFrom}–${data.adv_growthPercentTo}%`
      : `${data.adv_growthPercentFrom}%+`;

  const advTimeRange =
    data.adv_timeRangeTo !== undefined && data.adv_timeRangeTo !== null
      ? `${data.adv_timeRangeFrom}–${data.adv_timeRangeTo}`
      : `${data.adv_timeRangeFrom}+`;

  const holdings = Array.isArray(data.assets) ? [...data.assets] : [];
  const sortedHoldings = holdings.sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0));
  const topHolding = sortedHoldings[0];
  const totalPct = holdings.reduce((acc, h) => acc + (h.percentage ?? 0), 0);
  const remainder = Math.max(0, Number((100 - totalPct).toFixed(2)));

  // statistiche semplici per i KPI
  const count = holdings.length;
  const median =
    count === 0
      ? 0
      : ((): number => {
        const arr = sortedHoldings.map(h => h.percentage ?? 0);
        const mid = Math.floor(arr.length / 2);
        if (arr.length % 2 === 0) return (arr[mid - 1] + arr[mid]) / 2;
        return arr[mid];
      })();

  const dataGraf = [
    {
      "id": "japan",
      "data": [
        {
          "x": "2022",
          "y": 100
        },
        {
          "x": "2023",
          "y": 5
        },
        {
          "x": "2024",
          "y": 208
        },
        {
          "x": "2025",
          "y": 272
        },
      ]
    }
  ]

  return (
    <>
      <div className="d-flex flex-column" style={{ width: '100%' }}>
        {/* HEADER */}
        <div className="card" style={{ width: '100%', margin: '20px 0', borderRadius: 12 }}>
          <div style={{ padding: '24px 28px' }}>
            <div className="d-flex align-items-center mb-2">
              {/* icona check stile tua card */}
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 20 20" fill="none">
                <g clipPath="url(#clip0_39_12)">
                  <path d="M18.3332 5.83334L11.2498 12.9167L7.08317 8.75001L1.6665 14.1667" stroke="#1A2238" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13.3335 5.83334H18.3335V10.8333" stroke="#1A2238" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <defs>
                  <clipPath id="clip0_39_12">
                    <rect width="20" height="20" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <span style={{ fontSize: 24, marginLeft: 10, fontWeight: 600, color: 'rgba(40, 53, 89, 1)' }}>
                {data.title}
              </span>
            </div>
            <div style={{ color: 'rgba(23, 28, 36, 1)', fontSize: 14 }}>
              {data.description}
            </div>

            {/* TAGS */}
            {Array.isArray(data.tags) && data.tags.length > 0 && (
              <div className="d-flex flex-wrap" style={{ gap: 8, marginTop: 12 }}>
                {data.tags.map((t, i) => (
                  <span key={i} style={{
                    fontSize: 12,
                    padding: '6px 10px',
                    background: 'rgba(241, 245, 249, 1)',
                    color: 'rgba(71, 85, 105, 1)',
                    borderRadius: 999
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* BODY: chart + KPI */}
          <div className="d-flex flex-wrap" style={{ padding: '8px 12px 24px 12px' }}>
            {/* PIE */}
            <div className="card" style={{ flex: '1 1 540px', minWidth: 480, height: 520, margin: '8px 12px', borderRadius: 12 }}>

            </div>

            {/* KPI PANEL */}
            <div className="card" style={{ flex: '1 1 380px', minWidth: 360, margin: '8px 12px', borderRadius: 12 }}>
              {/* Rendimento atteso */}
              <div className="d-flex justify-content-between" style={{ margin: '0% 6%', padding: '12px 8px', borderBottom: '0.5px solid #CBD5E1' }}>
                <div className="d-flex align-items-center" style={{ fontWeight: 700 }}>
                  <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                    <path d="M5.942 18V15.6194C6.4759 15.5568 6.99997 15.4281 7.50217 15.2361C8.24263 14.9629 8.88893 14.4822 9.36394 13.8513C9.79347 13.2624 10.0167 12.548 9.99902 11.819C10.0097 11.2251 9.86259 10.639 9.57273 10.1206C9.3017 9.67706 8.93264 9.30162 8.49395 9.02323C8.0431 8.74088 7.55506 8.52296 7.04398 8.37581C6.73658 8.28581 6.38859 8.1929 5.99709 8.08548C5.6665 7.99548 5.30981 7.91129 4.75302 7.79516C4.16096 7.67165 3.57925 7.50277 3.01305 7.29C2.6827 7.16627 2.38859 6.96165 2.15756 6.69484C1.96296 6.44801 1.86684 6.13762 1.88787 5.82387C1.88787 5.79484 1.88787 5.76581 1.88787 5.73677C1.90417 5.46469 2.00563 5.20465 2.17786 4.99355C2.44418 4.685 2.78887 4.45428 3.17544 4.32581C3.7691 4.13081 4.39251 4.04235 5.01691 4.06452C5.48212 4.06441 5.94529 4.12591 6.39439 4.24742C6.71556 4.33653 7.01878 4.48094 7.29047 4.67419C7.47383 4.80208 7.63128 4.96365 7.75446 5.15032L8.23586 5.87613L9.68583 4.91516L9.20444 4.18935C8.96192 3.82094 8.65197 3.50178 8.29095 3.24871C7.85636 2.94086 7.37162 2.71099 6.85838 2.56935C6.5577 2.48576 6.25147 2.42367 5.942 2.38355V0H4.20203V2.35452C3.66549 2.40221 3.13618 2.51131 2.62445 2.67968C1.93874 2.90877 1.32757 3.31903 0.855485 3.8671L0.832286 3.89613C0.409025 4.41295 0.166593 5.05438 0.142098 5.72226C0.0986202 6.45414 0.32341 7.17676 0.774287 7.75452L0.803286 7.78936C1.2285 8.29357 1.7756 8.68037 2.39246 8.9129C3.04447 9.15784 3.71442 9.35197 4.39632 9.49355C4.91251 9.60387 5.24311 9.68226 5.5563 9.78387C5.94199 9.87677 6.26679 9.96387 6.54808 10.0452C6.90169 10.1468 7.2394 10.2972 7.55147 10.4923C7.75389 10.6188 7.92613 10.7883 8.05606 10.9887C8.19695 11.2381 8.26808 11.5209 8.26195 11.8074C8.26195 11.8074 8.26195 11.8335 8.26195 11.8481C8.27289 12.1924 8.17105 12.5309 7.97196 12.8119C7.6944 13.176 7.31781 13.4522 6.88738 13.6074C6.28173 13.84 5.6364 13.9515 4.98791 13.9355H4.52972C3.92744 13.9062 3.33654 13.7603 2.78975 13.5058C2.44361 13.3249 2.14541 13.0642 1.91977 12.7452L1.41518 12.0368L0 13.0471L0.504592 13.7555C0.899487 14.3089 1.4217 14.759 2.02706 15.0677C2.71771 15.3898 3.46005 15.5864 4.21943 15.6484V18H5.942Z" fill="black" />
                  </svg>
                  <span style={{ margin: '0 8px' }}>Rendimento Annuale Atteso</span>
                </div>
                <span style={{ fontWeight: 600 }}>{advGrowth}</span>
              </div>

              {/* Orizzonte */}
              <div className="d-flex justify-content-between" style={{ margin: '0% 6%', padding: '12px 8px', borderBottom: '0.5px solid #CBD5E1' }}>
                <div className="d-flex align-items-center" style={{ fontWeight: 700 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="8" stroke="black" strokeWidth="1.5" />
                    <path d="M5 9.5H9.5V4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span style={{ margin: '0 8px' }}>Orizzonte Temporale Consigliato</span>
                </div>
                <span style={{ fontWeight: 600 }}>{advTimeRange} anni</span>
              </div>

              {/* Diversificazione */}
              <div className="d-flex justify-content-between" style={{ margin: '0% 6%', padding: '12px 8px', borderBottom: '0.5px solid #CBD5E1' }}>
                <div className="d-flex align-items-center" style={{ fontWeight: 700 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="2" width="6" height="6" stroke="black" strokeWidth="1.5" />
                    <rect x="10" y="2" width="6" height="6" stroke="black" strokeWidth="1.5" />
                    <rect x="2" y="10" width="6" height="6" stroke="black" strokeWidth="1.5" />
                    <rect x="10" y="10" width="6" height="6" stroke="black" strokeWidth="1.5" />
                  </svg>
                  <span style={{ margin: '0 8px' }}>Numero Asset</span>
                </div>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>

              {/* Top holding */}
              <div className="d-flex justify-content-between" style={{ margin: '0% 6%', padding: '12px 8px' }}>
                <div className="d-flex align-items-center" style={{ fontWeight: 700 }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 14L9 4L15 14H3Z" stroke="black" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                  <span style={{ margin: '0 8px' }}>Top Holding</span>
                </div>
                <span style={{ fontWeight: 600 }}>
                  {topHolding ? `${topHolding.symbol} • ${fmtPct(topHolding.percentage)}` : '—'}
                </span>
              </div>

              {/* Pillole statistiche */}
              <div className="d-flex" style={{ gap: 12, margin: '0% 6% 12px 6%' }}>
                <div style={{ background: 'rgba(249, 250, 251, 1)', borderRadius: 8, padding: '10px 12px', flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(75, 85, 99, 1)' }}>Mediana peso asset</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtPct(median)}</div>
                </div>
                <div style={{ background: 'rgba(249, 250, 251, 1)', borderRadius: 8, padding: '10px 12px', flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(75, 85, 99, 1)' }}>Somma pesi</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtPct(totalPct)}</div>
                </div>
                <div style={{ background: 'rgba(249, 250, 251, 1)', borderRadius: 8, padding: '10px 12px', flex: 1 }}>
                  <div style={{ fontSize: 12, color: 'rgba(75, 85, 99, 1)' }}>Liquidità</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtPct(remainder)}</div>
                </div>
              </div>

              {/* CTA */}
              <div className="d-flex" style={{ justifyContent: 'flex-start' }}>
                <MDBBtn
                  block
                  onClick={onClickBuy}
                  style={{
                    backgroundColor: 'rgba(34, 55, 74, 1)',
                    color: 'rgba(255, 255, 255, 1)',
                    borderRadius: 160,
                    margin: '0 6% 16px 6%',
                    padding: '10px 20px',
                    fontSize: 14,
                    border: 'none'
                  }}
                >
                  CALL TO ACTION
                </MDBBtn>
              </div>
            </div>
          </div>
        </div>

        {/* TABELLA TOP HOLDINGS */}
        <div className="card" style={{ width: '100%', borderRadius: 12, marginBottom: 16 }}>
          <div className="d-flex align-items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(40,53,89,1)' }}>Top holdings</span>
          </div>
          <div style={{ padding: '8px 20px 20px 20px', overflowX: 'auto' }}>
            <table className="table" style={{ marginBottom: 0 }}>
              <thead>
                <tr>
                  <th style={{ whiteSpace: 'nowrap' }}>#</th>
                  <th>Symbol</th>
                  <th className="text-end" style={{ whiteSpace: 'nowrap' }}>Peso</th>
                </tr>
              </thead>
              <tbody>
                {sortedHoldings.slice(0, 8).map((h, idx) => (
                  <tr key={h.symbol + idx}>
                    <td style={{ whiteSpace: 'nowrap' }}>{idx + 1}</td>
                    <td>{h.symbol}</td>
                    <td className="text-end" style={{ whiteSpace: 'nowrap' }}>{fmtPct(h.percentage)}</td>
                  </tr>
                ))}
                {sortedHoldings.length === 0 && (
                  <tr><td colSpan={3} style={{ color: '#64748B' }}>Nessun asset disponibile</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* LISTA COMPLETA ASSET */}
        <div className="card" style={{ width: '100%', borderRadius: 12, marginBottom: 40 }}>
          <div className="d-flex align-items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'rgba(40,53,89,1)' }}>Composizione completa</span>
          </div>
          <div className="d-flex flex-wrap" style={{ padding: '16px 20px', gap: 12 }}>
            {sortedHoldings.map((h, i) => (
              <div key={h.symbol + i}
                className="d-flex justify-content-between flex-column"
                style={{
                  minWidth: 180,
                  backgroundColor: 'rgba(249, 250, 251, 1)',
                  borderRadius: 8,
                  padding: 12
                }}
              >
                <div style={{ fontSize: 12, color: 'rgba(75, 85, 99, 1)' }}>Ticker</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{h.symbol}</div>
                <div style={{ fontSize: 12, color: 'rgba(75, 85, 99, 1)', marginTop: 6 }}>Peso</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{fmtPct(h.percentage)}</div>
              </div>
            ))}
            {sortedHoldings.length === 0 && (
              <div style={{ color: '#64748B' }}>Nessun asset disponibile</div>
            )}
          </div>
        </div>
      </div>

      {/* ///////////////////////// */}
      <MDBContainer>
        <MDBRow className='mb-6'>
          <MDBCol>
            <MDBCard className="shadow-sm border-0 rounded-3">
              <MDBCardBody>
                <div className="row">
                  {/* Colonna sinistra con testo */}
                  <div className="col-md-8">
                    <MDBCardTitle className="fw-bold mb-2">
                      Portafoglio di Crescita Aggressiva
                    </MDBCardTitle>
                    <MDBCardText className="text-muted mb-4">
                      Progettato per investitori che cercano un alto potenziale di crescita a lungo termine
                      e sono disposti ad accettare una maggiore volatilità in cambio di rendimenti potenzialmente superiori.
                    </MDBCardText>

                    {/* Info boxes */}
                    <div className="d-flex gap-3">
                      <div className="p-3 bg-light rounded-3 flex-fill">
                        <p className="mb-1 text-muted small">Livello di Rischio</p>
                        <span className="fw-bold text-danger">Alto</span>
                      </div>
                      <div className="p-3 bg-light rounded-3 flex-fill">
                        <p className="mb-1 text-muted small">Volatilità attesa</p>
                        <span className="fw-bold">18-25% Annuale</span>
                      </div>
                    </div>
                  </div>

                  {/* Colonna destra con placeholder chart */}
                  <div className="col-md-4 d-flex align-items-center justify-content-center">
                    <div
                      className="bg-light text-muted d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: "100%", height: "200px" }}
                    >


                      <ResponsiveLine
                        data={dataGraf}
                        margin={{ top: 10, right: 15, bottom: 25, left: 15 }}
                        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: true, reverse: false }}
                        axisBottom={{ legend: 'transportation', legendOffset: 36 }}
                        axisLeft={null}
                        pointSize={10}
                        enableGridY={false}
                        pointColor={{ theme: 'background' }}
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'seriesColor', modifiers: [] }}
                        pointLabelYOffset={-12}
                        enableTouchCrosshair={true}
                        useMesh={true}
                        colors={["rgb(38, 53, 80)"]}  // 👈 línea en el color que pediste
                      />



                    </div>
                  </div>
                </div>
              </MDBCardBody>
            </MDBCard>

          </MDBCol>
        </MDBRow >
        <MDBRow className='mb-6'>
          <MDBCol>
            <MDBCard className="shadow-sm border-0 rounded-3">
              <MDBCardBody>
                <MDBCardTitle className="fw-bold mb-4">
                  Composizione del Portafoglio
                </MDBCardTitle>

                <div className="row">
                  {/* Placeholder per grafico */}
                  <div className="col-md-4 d-flex align-items-center justify-content-center">
                    <div
                      className="bg-light text-muted d-flex align-items-center justify-content-center rounded-3"
                      style={{ width: "100%", height: "300px" }}
                    >
                      <div style={{ width: "100%" , height: '100%', padding: '16px 8px 8px 8px' }}>
                        <ResponsivePie
                          data={pieData}
                          margin={{ top: 10, right: 100, bottom: 20, left: 0 }}
                          innerRadius={0.5}
                          padAngle={0.6}
                          cornerRadius={2}
                          activeOuterRadiusOffset={8}
                          enableArcLinkLabels={false}
                          enableArcLabels={false}
                          legends={[
                            {
                              anchor: 'right',
                              direction: 'column',
                              justify: false,
                              translateX: 150,
                              translateY: 0,
                              itemsSpacing: 8,
                              itemWidth: 125,
                              itemHeight: 24,
                              symbolSize: 14,
                              symbolShape: 'square'
                            }
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tabella */}
                  <div className="col-md-8">
                    <MDBTable hover align="middle">
                      <MDBTableHead>
                        <tr>
                          <th>Attivo</th>
                          <th>Simbolo</th>
                          <th>Percentuale</th>
                        </tr>
                      </MDBTableHead>
                      <MDBTableBody>
                        <tr>
                          <td>Apple Inc.</td>
                          <td>AAPL</td>
                          <td>25.00%</td>
                        </tr>
                        <tr>
                          <td>Microsoft Corp.</td>
                          <td>MSFT</td>
                          <td>20.00%</td>
                        </tr>
                        <tr>
                          <td>Amazon.com, Inc.</td>
                          <td>AMZN</td>
                          <td>15.00%</td>
                        </tr>
                        <tr>
                          <td>NVIDIA Corp.</td>
                          <td>NVDA</td>
                          <td>15.00%</td>
                        </tr>
                        <tr>
                          <td>Tesla, Inc.</td>
                          <td>TSLA</td>
                          <td>10.00%</td>
                        </tr>
                        <tr>
                          <td>Alphabet Inc.</td>
                          <td>GOOGL</td>
                          <td>10.00%</td>
                        </tr>
                      </MDBTableBody>
                    </MDBTable>
                  </div>
                </div>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
        <MDBRow className='mb-6'>
          <MDBCol>
            <MDBCard className="shadow-sm border-0 rounded-3">
              <MDBCardBody>
                {/* Titolo */}
                <MDBCardTitle className="fw-bold mb-3">
                  Filosofia e Strategia di Investimento
                </MDBCardTitle>

                {/* Testo introduttivo */}
                <MDBCardText className="text-muted mb-4">
                  La strategia di questo portafoglio si concentra
                  sull'identificazione e selezione di aziende leader nei settori
                  tecnologici ad alto potenziale, con forte capacità di
                  innovazione e crescita esponenziale. Cerchiamo società con
                  vantaggi competitivi durevoli, modelli di business scalabili
                  e una comprovata storia di innovazione. La diversificazione
                  viene raggiunta attraverso l’esposizione a diversi sottosettori
                  tecnologici — come software, semiconduttori, intelligenza
                  artificiale ed e-commerce — mitigando i rischi legati alla
                  concentrazione in un’unica area.
                </MDBCardText>

                {/* Griglia di punti */}
                <div className="row">
                  <div className="col-md-6 mb-3 d-flex">
                    <div>
                      <strong>Focus sulla Crescita Accelerata</strong>
                      <p className="mb-0 small text-muted">
                        Priorità ad aziende con alti tassi di crescita dei ricavi e
                        espansione di mercato.
                      </p>
                    </div>
                  </div>

                  <div className="col-md-6 mb-3 d-flex">
                    <div>
                      <strong>Diversificazione Tecnologica</strong>
                      <p className="mb-0 small text-muted">
                        Investimenti in leader di molteplici sottosettori della
                        tecnologia globale.
                      </p>
                    </div>
                  </div>

                  <div className="col-md-6 mb-3 d-flex">
                    <div>
                      <strong>Alto Potenziale di Redditività</strong>
                      <p className="mb-0 small text-muted">
                        Orientato a ottenere rendimenti superiori alla media del
                        mercato nel lungo termine.
                      </p>
                    </div>
                  </div>

                  <div className="col-md-6 mb-3 d-flex">
                    <div>
                      <strong>Orizzonte di Investimento a Lungo Termine</strong>
                      <p className="mb-0 small text-muted">
                        Strategia pensata per maturare in un periodo di 5 anni o più.
                      </p>
                    </div>
                  </div>
                </div>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        </MDBRow>
      </MDBContainer>
    </>
  );
};

export default ManagedPortRecap;
