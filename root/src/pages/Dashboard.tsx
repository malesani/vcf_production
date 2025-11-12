import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBTypography,
  MDBBtn,
  MDBIcon,
  MDBProgress,
} from "mdb-react-ui-kit";

import { ResponsiveLine } from '@nivo/line'

interface DashboardProps {
  userName?: string;
  pageName?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userName, pageName }) => {
  let info = userName + '' + pageName;
  const rankings = [
    { id: 1, name: "TechMaster_2024", subtitle: "Portfolio AI & Robotica", percentage: "+24.8%", color: "success", progress: 95, medal: "trophy" },
    { id: 2, name: "GreenInvestor", subtitle: "Energia Sostenibile", percentage: "+19.2%", color: "success", progress: 80, medal: "2" },
    { id: 3, name: "CryptoWave", subtitle: "Blockchain & DeFi", percentage: "+16.7%", color: "success", progress: 70, medal: "3" },
    { id: 7, name: "Tu (Tech Innovation)", subtitle: "Il tuo portafoglio", percentage: "+15.4%", color: "success", progress: 65, medal: "7" },
  ];

  const indicators = [
    { name: "S&P 500", value: "4,567.89", change: "+1.23%", positive: true, icon: "chart-bar" },
    { name: "NASDAQ", value: "14,234.56", change: "-0.45%", positive: false, icon: "chart-bar" },
    { name: "FTSE MIB", value: "28,945.12", change: "+0.78%", positive: true, icon: "chart-bar" },
    { name: "Oro", value: "$1,987.45", change: "+0.32%", positive: true, icon: "bitcoin" },
    { name: "Petrolio WTI", value: "$78.92", change: "-1.12%", positive: false, icon: "oil-can" },
    { name: "EUR/USD", value: "1.0845", change: "+0.15%", positive: true, icon: "circle-info" },
  ];

  const dataGraf = [
    {
      "id": "japan",
      "data": [
        { "x": "2022", "y": 100 },
        { "x": "2023", "y": -5 },
        { "x": "2024", "y": 208 },
        { "x": "2025", "y": 272 },
      ]
    }
  ]

  return (
    <MDBContainer className="py-4">
      <MDBRow>
        {/* ==================== COLUMNA IZQUIERDA ==================== */}
        <MDBCol md="8">
          {/* === PANORAMICA GLOBALE === */}
          <div>
            <div
              style={{
                backgroundColor: "rgb(38, 53, 80)",
                color: "white",
                borderTopRightRadius: "0.5rem",
                borderTopLeftRadius: "0.5rem",
                padding: "20px"
              }}
            >
              <div className="d-flex align-items-center">
                <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                <span className="fs-2 fw-bold text-white">Panoramica Globale</span>
              </div>
              <span className="text-light fs-5">
                Dettaglio Globale Portafogli
              </span>
            </div>
            <MDBCard className="p-4 mb-4">

              <MDBRow className="mb-4 mt-3">
                <MDBCol md="6" className="mb-3">
                  <MDBCard className="border-0 bg-light h-100">
                    <MDBCardBody>
                      <MDBTypography tag="h6" className="text-muted mb-1">
                        Valore Totale Portafogli
                      </MDBTypography>
                      <MDBTypography tag="h3" className="fw-bold text-dark">
                        127.362,68 €
                      </MDBTypography>
                      <small className="text-danger">-0.07% oggi</small>
                    </MDBCardBody>
                  </MDBCard>
                </MDBCol>

                <MDBCol md="6" className="mb-3">
                  <MDBCard className="border-0 bg-light h-100">
                    <MDBCardBody>
                      <MDBTypography tag="h6" className="text-muted mb-1">
                        Profitto/Perdita Totale
                      </MDBTypography>
                      <MDBTypography tag="h3" className="fw-bold text-success">
                        +€12.450
                      </MDBTypography>
                      <small className="text-danger">-0.07% oggi</small>
                    </MDBCardBody>
                  </MDBCard>
                </MDBCol>
              </MDBRow>

              <div
                className="bg-light text-muted d-flex align-items-center justify-content-center rounded-3 mb-5"
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
                  colors={["rgb(38, 53, 80)"]}
                />
              </div>

              <div>
                <div className="d-flex align-items-center mb-3">
                  <MDBIcon fas icon="lightbulb" className="text-info me-2 fs-5" />
                  <MDBTypography tag="h6" className="fw-semibold mb-0">
                    Azioni Consigliate
                  </MDBTypography>
                </div>

                <MDBCard className="border rounded-3 mb-3">
                  <MDBCardBody className="d-flex justify-content-between align-items-center">
                    <span>Considera di diversificare nel settore tecnologico</span>
                    <MDBBtn color="dark" size="sm">
                      Esplora
                    </MDBBtn>
                  </MDBCardBody>
                </MDBCard>

                <MDBCard className="border rounded-3">
                  <MDBCardBody className="d-flex justify-content-between align-items-center">
                    <span>Il tuo portafoglio "Crescita" sta performando bene</span>
                    <MDBBtn outline color="dark" size="sm">
                      Vedi Dettagli
                    </MDBBtn>
                  </MDBCardBody>
                </MDBCard>
              </div>
            </MDBCard>
          </div>

          {/* === INDICATORI DI MERCATO === */}
          <div>
            <div
              style={{
                backgroundColor: "rgb(38, 53, 80)",
                color: "white",
                borderTopRightRadius: "0.5rem",
                borderTopLeftRadius: "0.5rem",
                padding: "20px"
              }}
              className="d-flex justify-content-between align-items-center"
            >
              <MDBTypography tag="h5" className="fw-bold mb-0 text-white">
                Indicatori di Mercato Principali
              </MDBTypography>
              <a href="#" className="text-white fw-semibold text-decoration-none">
                Vedi tutti gli indicatori <MDBIcon fas icon="arrow-right" />
              </a>
            </div>
            <MDBCard className="p-4">

              <MDBRow className="g-3">
                {indicators.map((item, index) => (
                  <MDBCol md="4" sm="6" key={index}>
                    <MDBCard className="border-0 bg-light h-100 shadow-0">
                      <MDBCardBody className="p-3 d-flex flex-column justify-content-between">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <MDBTypography tag="h6" className="fw-bold mb-0">
                            {item.name}
                          </MDBTypography>
                          <MDBIcon fas icon={item.icon} className="text-muted small" />
                        </div>
                        <MDBTypography className="fw-bold text-dark fs-6 mb-1">
                          {item.value}
                        </MDBTypography>
                        <div className="d-flex align-items-center justify-content-between">
                          <MDBTypography
                            className={`fw-semibold ${item.positive ? "text-success" : "text-danger"} fs-6`}
                          >
                            {item.change}
                          </MDBTypography>
                          <div
                            className={`d-flex align-items-center justify-content-center rounded-3 ${item.positive ? "bg-success bg-opacity-10" : "bg-danger bg-opacity-10"}`}
                            style={{ width: "36px", height: "22px" }}
                          >
                            <MDBIcon
                              fas
                              icon="chart-line"
                              className={item.positive ? "text-success fs-6" : "text-danger fs-6"}
                            />
                          </div>
                        </div>
                      </MDBCardBody>
                    </MDBCard>
                  </MDBCol>
                ))}
              </MDBRow>
            </MDBCard>
          </div>
        </MDBCol>

        {/* ==================== COLUMNA DERECHA ==================== */}
        <MDBCol md="4">
          {/* === I MIEI PORTAFOGLI === */}
          <div>
            <div
              style={{
                backgroundColor: "rgb(38, 53, 80)",
                color: "white",
                borderTopRightRadius: "0.5rem",
                borderTopLeftRadius: "0.5rem",
                padding: "20px 20px"
              }}
              className="d-flex justify-content-between align-items-center"
            >
              <MDBTypography tag="h5" className="fw-bold mb-0 text-white">
                I Miei Portafogli
              </MDBTypography>
            </div>
            <MDBCard className="p-4 mb-4">
              <div className="overflow-auto" style={{ height: "650px", scrollbarWidth: "none" }}>

                {/* Portafogli Gestiti dal Team */}
                <div className="mb-3">
                  <MDBIcon fas icon="users" className="text-primary me-2" />
                  <MDBTypography tag="h6" className="d-inline">Portafogli Gestiti dal Team</MDBTypography>
                </div>

                {[
                  { name: "Crescita Bilanciata Pro", value: "€65.420", change: "+12.34%", color: "dark", btn: "Gestito" },
                  { name: "Dividendi Elite", value: "€42.180", change: "+8.76%", color: "dark", btn: "Gestito" },
                ].map((p, i) => (
                  <MDBCard key={i} className="border-0 bg-light mb-3">
                    <MDBCardBody>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <MDBTypography tag="h6" className="fw-bold mb-0">{p.name}</MDBTypography>
                          <MDBTypography className="fw-bold text-dark fs-6 mb-0">{p.value}</MDBTypography>
                          <MDBTypography className="text-success fs-6">{p.change}</MDBTypography>
                        </div>
                        <MDBBtn color="dark" size="sm">{p.btn}</MDBBtn>
                      </div>
                    </MDBCardBody>
                  </MDBCard>
                ))}

                <hr />

                {/* Portafogli Personalizzati */}
                <div className="mb-3">
                  <MDBIcon fas icon="user" className="text-secondary me-2" />
                  <MDBTypography tag="h6" className="d-inline">I Miei Portafogli Personalizzati</MDBTypography>
                </div>

                {[
                  { name: "Tech Innovation", value: "€28.650", change: "+15.42%", color: "success", btn: "Attivo" },
                  { name: "Green Energy Mix", value: "€19.200", change: "-2.15%", color: "warning", btn: "Monitoraggio" },
                ].map((p, i) => (
                  <MDBCard key={i} className="border-0 bg-light mb-3">
                    <MDBCardBody>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <MDBTypography tag="h6" className="fw-bold mb-0">{p.name}</MDBTypography>
                          <MDBTypography className="fw-bold text-dark fs-6 mb-0">{p.value}</MDBTypography>
                          <MDBTypography className={`${p.change.startsWith("+") ? "text-success" : "text-danger"} fs-6`}>
                            {p.change}
                          </MDBTypography>
                        </div>
                        <MDBBtn color={p.color as ("success"|"warning")} size="sm">{p.btn}</MDBBtn>
                      </div>
                    </MDBCardBody>
                  </MDBCard>
                ))}

                <hr />
                {/* Portafogli Gaming */}
                <div className="mb-3">
                  <MDBIcon fas icon="gamepad" className="text-info me-2" />
                  <MDBTypography tag="h6" className="d-inline">Portafogli Gaming</MDBTypography>
                </div>

                {[
                  { name: "Gaming Giants", value: "€15.800", change: "+22.1%", color: "dark", btn: "Gaming" },
                  { name: "Esports & Streaming", value: "€8.950", change: "+18.3%", color: "dark", btn: "Gaming" },
                ].map((p, i) => (
                  <MDBCard key={i} className="border-0 bg-light mb-3">
                    <MDBCardBody>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <MDBTypography tag="h6" className="fw-bold mb-0">{p.name}</MDBTypography>
                          <MDBTypography className="fw-bold text-dark fs-6 mb-0">{p.value}</MDBTypography>
                          <MDBTypography className={`${p.change.startsWith("+") ? "text-success" : "text-danger"} fs-6`}>
                            {p.change}
                          </MDBTypography>
                        </div>
                        <MDBBtn color={p.color as ("dark")} size="sm">{p.btn}</MDBBtn>
                      </div>
                    </MDBCardBody>
                  </MDBCard>
                ))}

              </div>
              <div className="text-center mt-3">
                <MDBBtn outline color="dark" className="w-100">
                  <MDBIcon far icon="eye" className="me-2" />
                  Vedi i miei Portafogli
                </MDBBtn>
              </div>
            </MDBCard>

          </div>

          {/* === CLASSIFICA === */}
          <div>
            <div
              style={{
                backgroundColor: "rgb(38, 53, 80)",
                color: "white",
                borderTopRightRadius: "0.5rem",
                borderTopLeftRadius: "0.5rem",
                padding: "20px 20px"
              }}
              className="d-flex align-items-center"
            >
              <MDBIcon fas icon="trophy" className="text-warning me-2 fs-4" />
              <MDBTypography tag="h5" className="fw-bold mb-0 text-white">
                Classifica Portafogli Personalizzati
              </MDBTypography>
            </div>
            <MDBCard className=" p-4">

              {rankings.map((item) => (
                <MDBCard key={item.id} className="border-0 bg-light mb-3 p-2 rounded-3">
                  <MDBCardBody className="d-flex align-items-center justify-content-between p-2">
                    <div className="d-flex align-items-center">
                      {item.id === 1 ? (
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-warning text-white fw-bold me-3" style={{ width: "32px", height: "32px" }}>
                          <MDBIcon fas icon="trophy" />
                        </div>
                      ) : (
                        <div className="d-flex align-items-center justify-content-center rounded-circle bg-light border me-3 text-dark fw-bold" style={{ width: "32px", height: "32px" }}>
                          {item.medal}
                        </div>
                      )}
                      <div>
                        <MDBTypography tag="h6" className="fw-bold mb-0">{item.name}</MDBTypography>
                        <MDBTypography className="text-muted" style={{ fontSize: "0.9rem" }}>
                          {item.subtitle}
                        </MDBTypography>
                      </div>
                    </div>
                    <div className="text-end" style={{ minWidth: "100px" }}>
                      <MDBTypography className="fw-bold text-success mb-1">{item.percentage}</MDBTypography>
                      <MDBProgress height="6" className="rounded-pill" value={item.progress} color={item.color} />
                    </div>
                  </MDBCardBody>
                </MDBCard>
              ))}

              <MDBTypography className="text-center text-muted mt-3" style={{ fontSize: "0.9rem" }}>
                Aggiornato ogni ora • Concorso mensile
              </MDBTypography>
            </MDBCard>
          </div>
        </MDBCol>
      </MDBRow>
    </MDBContainer >
  );
}


export default Dashboard;