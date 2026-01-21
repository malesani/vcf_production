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
