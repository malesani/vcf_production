import React from "react";
import {
    MDBBtn,
    MDBCard,
    MDBCardBody,
    MDBCardHeader,
    MDBCardTitle,
    MDBCol,
    MDBContainer,
    MDBIcon,
    MDBProgress,
    MDBProgressBar,
    MDBRow,
    MDBTooltip,
} from "mdb-react-ui-kit";

const Profile: React.FC = () => {
    return (
        <MDBContainer>
            {/* Header + pill button */}
            <MDBRow className="g-3 mb-4">
                <MDBCol sm="12" style={{}}>
                    <div className="py-2 mb-2">
                        <div className="d-flex flex-row align-items-center">
                            <span className="fs-3 fw-bold text-dark">Il mio profilo</span>
                        </div>
                        <div className="d-flex">
                            <span className="text-muted fs-6">
                                Monitora i tuoi progressi, la formazione e l’evoluzione dei tuoi
                                investimenti
                            </span>
                        </div>
                    </div>

                    <MDBBtn
                        className="d-inline-flex align-items-center gap-2 px-4 py-2"
                        style={{
                            fontSize: "12px",
                            backgroundColor: "rgba(21, 93, 252, 1)",
                            border: "3px solid rgba(21, 93, 252, 1)",
                            borderRadius: "14px",
                            boxShadow: "0 10px 22px rgba(21, 93, 252, 0.25)",
                        }}
                    >
                        <MDBIcon className="me-1" far icon="star" />
                        <span>Livello 1 / 5</span>
                        <span style={{ opacity: 0.75 }}>·</span>
                        <span>In fase di risveglio</span>
                    </MDBBtn>
                </MDBCol>
            </MDBRow>

            {/* Info card */}
            <MDBRow className="align-items-center mb-4">
                <MDBCol className="col-12">
                    <MDBCard
                        style={{
                            border: "solid 1px rgba(190, 219, 255, 1)",
                            backgroundColor: "rgb(239,246,255)",
                        }}
                    >
                        <MDBCardBody className="d-flex flex-row py-3">
                            <div className="me-3">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 20 20"
                                    fill="none"
                                >
                                    <path
                                        d="M13.333 5.83325H18.333V10.8333"
                                        stroke="#000000"
                                        strokeWidth="1.66667"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M18.3337 5.83325L11.2503 12.9166L7.08366 8.74992L1.66699 14.1666"
                                        stroke="#000000"
                                        strokeWidth="1.66667"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>

                            <div>
                                <MDBCardTitle className="small fw-bold mb-1">
                                    Il tuo livello attuale
                                </MDBCardTitle>

                                <div className="fw-bold small mb-0">
                                    <span style={{ color: "#155DFC" }}>
                                        Hai iniziato il percorso e stai prendendo coscienza della tua
                                        situazione finanziaria. Continua ad acquisire le informazioni
                                        fondamentali per migliorare il tuo livello.
                                    </span>
                                </div>
                            </div>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>

            {/* Two cards row */}
            <MDBRow className="g-3 mb-4">
                {/* Card 1 */}
                <MDBCol sm="12" md="6">
                    <MDBCard>
                        <MDBCardHeader
                            className="py-3 px-4 border-bottom"
                            style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <MDBCardTitle tag="h5" className="mb-0 d-flex align-items-center">
                                    <MDBIcon fas icon="chart-column" className="me-2" />
                                    Problemi livello 1
                                </MDBCardTitle>
                            </div>
                        </MDBCardHeader>

                        {/* ✅ No MDBCol directly inside CardBody: use normal divs or Row/Col */}
                        <MDBCardBody className="bg-white">
                            <p className="text-muted fs-6 mb-3">
                                Monitora i tuoi progressi, la formazione e l’evoluzione dei tuoi
                                investimenti
                            </p>

                            <MDBTooltip
                                tag="div"
                                title="Avanzamento rispetto al target sul valore attuale (cassa + asset)"
                            >
                                {/* ✅ Remove text-md-end conflict; keep flex for left/right */}
                                <div className="mb-1 small d-flex justify-content-between">
                                    <span>Progresso</span>
                                    <span className="text-muted">20%</span>
                                </div>
                            </MDBTooltip>

                            <MDBProgress className="rounded" height="6">
                                <MDBProgressBar width={50} striped />
                            </MDBProgress>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>

                {/* Card 2 */}
                <MDBCol sm="12" md="6">
                    <MDBCard>
                        <MDBCardHeader
                            className="py-3 px-4 border-bottom"
                            style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <MDBCardTitle tag="h5" className="mb-0 d-flex align-items-center">
                                    <MDBIcon fas icon="chart-column" className="me-2" />
                                    Problemi livello 1
                                </MDBCardTitle>
                            </div>
                        </MDBCardHeader>

                        <MDBCardBody className="bg-white">
                            <p className="text-muted fs-6 mb-3">
                                Stai risolvendo le problematiche del livello 1 che ti aiuteranno a
                                progredire verso il livello successivo.
                            </p>

                            <MDBTooltip
                                tag="div"
                                title="Avanzamento rispetto al target sul valore attuale (cassa + asset)"
                            >
                                <div className="mb-1 small d-flex justify-content-between">
                                    <span>Progresso</span>
                                    <span className="text-muted">20%</span>
                                </div>
                            </MDBTooltip>

                            <MDBProgress className="rounded" height="6">
                                <MDBProgressBar width={70} striped />
                            </MDBProgress>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>

            {/* Big awareness index card */}
            <MDBRow className="g-3 mb-4">
                <MDBCol sm="12">
                    <MDBCard>
                        <MDBCardHeader
                            className="py-3 px-4 border-bottom"
                            style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                        >
                            <MDBCardTitle tag="h5" className="mb-0 d-flex flex-column">
                                <div className="mb-2 d-flex align-items-center">
                                    <MDBIcon fas icon="chart-column" className="me-2" />
                                    Indice di consapevolezza finanziaria
                                </div>
                                <div className="text-muted fs-6">
                                    Simulazioni basate sul tuo capitale iniziale, sui tuoi versamenti
                                    mensili e su rendimenti annui ipotetici.
                                </div>
                            </MDBCardTitle>
                        </MDBCardHeader>

                        <MDBCardBody className="bg-white">
                            {/* ✅ Use Row/Col properly */}
                            <MDBRow className="justify-content-center text-center mb-4">
                                <MDBCol sm="12" md="6" lg="4">
                                    <div className="fs-6">
                                        <span>26</span>
                                        <span>/</span>
                                        <span>100</span>
                                    </div>

                                    <div className="mb-3">In formazione</div>

                                    <MDBProgress className="rounded" height="6">
                                        <MDBProgressBar width={26} striped />
                                    </MDBProgress>
                                </MDBCol>
                            </MDBRow>

                            <MDBRow className="g-3 mb-3">
                                <MDBCol sm="12" md="6">
                                    <MDBCard className="border">
                                        <MDBCardBody className="bg-white">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="fw-bold">Formazione</span>
                                                <span className="text-danger">10/100</span>
                                            </div>
                                            <p className="text-muted fs-6 mb-3">
                                                Completa i corsi e la narrativa utile per il tuo livello.
                                            </p>
                                            <MDBProgress className="rounded" height="6">
                                                <MDBProgressBar width={10} striped />
                                            </MDBProgress>
                                        </MDBCardBody>
                                    </MDBCard>
                                </MDBCol>

                                <MDBCol sm="12" md="6">
                                    <MDBCard className="border">
                                        <MDBCardBody className="bg-white">
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="fw-bold">Struttura</span>
                                                <span className="text-danger">10/100</span>
                                            </div>
                                            <p className="text-muted fs-6 mb-3">
                                                Hai bisogno di strutturare meglio il tuo modo di investire.
                                            </p>
                                            <MDBProgress className="rounded" height="6">
                                                <MDBProgressBar width={10} striped />
                                            </MDBProgress>
                                        </MDBCardBody>
                                    </MDBCard>
                                </MDBCol>
                            </MDBRow>
                            <MDBRow className="align-items-center mb-4">
                                <MDBCol className="col-12">
                                    <MDBCard
                                        style={{
                                            border: "solid 1px rgba(190, 219, 255, 1)",
                                            backgroundColor: "rgba(21, 93, 252, 1)",
                                        }}
                                    >
                                        <MDBCardBody className="d-flex me-3 align-items-center justify-content-between">
                                            <div className="" style={{ color: "white" }}>
                                                <MDBCardTitle className="small fw-bold mb-1">
                                                    Vuoi aumentare il tuo indice?
                                                </MDBCardTitle>

                                                <div className="small mb-0">
                                                    <span>
                                                        Guarda il prossimo video consigliato per continuare il tuo percorso di crescita.
                                                    </span>
                                                </div>
                                            </div>
                                            <button type="button" className="btn btn-light ripple-surface-dark" style={{ color: "rgba(21, 93, 252, 1)" }}>Guarda</button>
                                        </MDBCardBody>
                                    </MDBCard>
                                </MDBCol>
                            </MDBRow>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>

            <MDBRow className="g-3 mb-4">
                {/* Card 1 */}
                <MDBCol sm="12" md="6">
                    <MDBCard>
                        <MDBCardHeader
                            className="py-3 px-4 border-bottom"
                            style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <MDBCardTitle tag="h5" className="mb-0 d-flex align-items-center">
                                    <MDBIcon fas icon="chart-column" className="me-2" />
                                    Video consigliati
                                </MDBCardTitle>
                            </div>
                        </MDBCardHeader>

                        {/* ✅ No MDBCol directly inside CardBody: use normal divs or Row/Col */}
                        <MDBCardBody className="bg-white">
                            <MDBCard
                                className="border mb-3"
                                style={{
                                    borderColor: "#E9EEF5",
                                    borderRadius: "14px",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",
                                }}
                            >
                                <MDBCardBody
                                    className="d-flex align-items-center justify-content-between"
                                    style={{ padding: "16px 16px" }}
                                >
                                    {/* Left content */}
                                    <div className="pe-3" style={{ minWidth: 0 }}>
                                        <div
                                            className="fw-semibold text-dark"
                                            style={{ fontSize: "14px", lineHeight: 1.2 }}
                                        >
                                            Iniziare a risparmiare ai tuoi
                                        </div>

                                        <div
                                            className="text-muted mt-1"
                                            style={{
                                                fontSize: "12px",
                                                lineHeight: 1.3,
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                            }}
                                        >
                                            Scopri come creare un budget efficace e iniziare a mettere da parte i tuoi risparmi.
                                        </div>

                                        {/* Tag row */}
                                        <div className="d-flex align-items-center gap-2 mt-2">
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    borderRadius: 999,
                                                    border: "2px solid #155DFC",
                                                    display: "inline-block",
                                                }}
                                            />
                                            <span style={{ color: "#155DFC", fontSize: "12px" }}>ripasso</span>
                                        </div>
                                    </div>

                                    {/* Right play button */}
                                    <MDBBtn
                                        type="button"

                                        className="d-inline-flex align-items-center justify-content-center p-0"
                                        style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 999,
                                            backgroundColor: "#155DFC",
                                            border: "1px solid rgba(21,93,252,.25)",
                                            boxShadow: "0 10px 18px rgba(21,93,252,.28)",
                                            flex: "0 0 auto",
                                        }}
                                    >
                                        <MDBIcon fas icon="play" style={{ fontSize: "16px" }} />
                                    </MDBBtn>
                                </MDBCardBody>
                            </MDBCard>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>

                {/* Card 2 */}
                <MDBCol sm="12" md="6">
                    <MDBCard>
                        <MDBCardHeader
                            className="py-3 px-4 border-bottom"
                            style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <MDBCardTitle tag="h5" className="mb-0 d-flex align-items-center">
                                    <MDBIcon fas icon="chart-column" className="me-2" />
                                    La tua road map
                                </MDBCardTitle>
                            </div>
                        </MDBCardHeader>

                        <MDBCardBody className="bg-white">
                            <MDBCard
                                role="button"
                                className="border border-success mb-3 alert-success"
                                style={{

                                    borderRadius: "14px",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",

                                }}
                            >
                                <MDBCardBody
                                    className="d-flex align-items-start justify-content-between"
                                    style={{ padding: "14px 16px" }}
                                >
                                    {/* Left: radio + text */}
                                    <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                        {/* Radio */}
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 999,
                                                border: `2px solid`,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginTop: 2,
                                                background: "#fff",
                                                flex: "0 0 auto",
                                            }}
                                            className="border-success"
                                        >
                                            <MDBIcon className="fs-6" fas icon="check" />


                                        </span>

                                        {/* Text */}
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                className="text-success"
                                                style={{
                                                    fontSize: 11,

                                                    fontWeight: 700,
                                                    letterSpacing: ".04em",
                                                    lineHeight: 1.1,
                                                }}
                                            >
                                                Livello 1
                                            </div>

                                            <div
                                                className="text-dark mt-1"
                                                style={{
                                                    fontSize: 14,
                                                    lineHeight: 1.25,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%",
                                                }}
                                                title="Definire almeno un obiettivo finanziario"
                                            >
                                                Definire almeno un obiettivo finanziario
                                            </div>

                                            <div
                                                className="text-muted mt-2"
                                                style={{
                                                    fontSize: 12,
                                                    lineHeight: 1.3,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                Completa il questionario e definisci il tuo obiettivo finanziario, capitale, età e i mercati.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right chevron */}
                                    <MDBIcon
                                        fas
                                        icon="chevron-right"
                                        style={{

                                            marginTop: 6,
                                            flex: "0 0 auto",
                                        }}
                                        className="text-success"
                                    />
                                </MDBCardBody>
                            </MDBCard>
                            <MDBCard
                                role="button"
                                className="border mb-3"
                                style={{

                                    borderRadius: "14px",
                                    backgroundColor: "#F6FAFF",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",

                                }}
                            >
                                <MDBCardBody
                                    className="d-flex align-items-start justify-content-between"
                                    style={{ padding: "14px 16px" }}
                                >
                                    {/* Left: radio + text */}
                                    <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                        {/* Radio */}
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 999,
                                                border: `2px solid #155DFC`,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginTop: 2,
                                                background: "#fff",
                                                flex: "0 0 auto",
                                            }}
                                        >

                                            <span
                                                style={{
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: 999,
                                                    background: "#155DFC",
                                                    display: "inline-block",
                                                }}
                                            />

                                        </span>

                                        {/* Text */}
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                className=""
                                                style={{
                                                    fontSize: 11,
                                                    color: "#155DFC",
                                                    fontWeight: 700,
                                                    letterSpacing: ".04em",
                                                    lineHeight: 1.1,
                                                }}
                                            >
                                                Livello 2
                                            </div>

                                            <div
                                                className="text-dark mt-1"
                                                style={{
                                                    fontSize: 14,
                                                    lineHeight: 1.25,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%",
                                                }}
                                                title="Traccia entrate e uscite di un mese"
                                            >
                                                Traccia entrate e uscite di un mese
                                            </div>

                                            <div
                                                className="text-muted mt-2"
                                                style={{
                                                    fontSize: 12,
                                                    lineHeight: 1.3,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                Monitora per spese ed entrate del mese: tieni sotto controllo le tue finanze personali.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right chevron */}
                                    <MDBIcon
                                        fas
                                        icon="chevron-right"
                                        style={{
                                            color: "#155DFC",
                                            marginTop: 6,
                                            flex: "0 0 auto",
                                        }}
                                    />
                                </MDBCardBody>
                            </MDBCard>
                            <MDBCard
                                role="button"
                                className="border mb-3"
                                style={{

                                    borderRadius: "14px",
                                    backgroundColor: "#F6FAFF",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",

                                }}
                            >
                                <MDBCardBody
                                    className="d-flex align-items-start justify-content-between"
                                    style={{ padding: "14px 16px" }}
                                >
                                    {/* Left: radio + text */}
                                    <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                        {/* Radio */}
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 999,
                                                border: `2px solid #155DFC`,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginTop: 2,
                                                background: "#fff",
                                                flex: "0 0 auto",
                                            }}
                                        >

                                            <span
                                                style={{
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: 999,
                                                    background: "#155DFC",
                                                    display: "inline-block",
                                                }}
                                            />

                                        </span>

                                        {/* Text */}
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                className=""
                                                style={{
                                                    fontSize: 11,
                                                    color: "#155DFC",
                                                    fontWeight: 700,
                                                    letterSpacing: ".04em",
                                                    lineHeight: 1.1,
                                                }}
                                            >
                                                Livello 3
                                            </div>

                                            <div
                                                className="text-dark mt-1"
                                                style={{
                                                    fontSize: 14,
                                                    lineHeight: 1.25,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%",
                                                }}
                                                title="Imposta un risparmio mensile (anche piccolo)"
                                            >
                                                Imposta un risparmio mensile (anche piccolo)
                                            </div>

                                            <div
                                                className="text-muted mt-2"
                                                style={{
                                                    fontSize: 12,
                                                    lineHeight: 1.3,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                Inizia a mettere da parte ogni mese una parte del tuo reddito, anche piccola. È una buona abitudine.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right chevron */}
                                    <MDBIcon
                                        fas
                                        icon="chevron-right"
                                        style={{
                                            color: "#155DFC",
                                            marginTop: 6,
                                            flex: "0 0 auto",
                                        }}
                                    />
                                </MDBCardBody>
                            </MDBCard>
                            <MDBCard
                                role="button"
                                className="border mb-3"
                                style={{

                                    borderRadius: "14px",
                                    backgroundColor: "#F6FAFF",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",

                                }}
                            >
                                <MDBCardBody
                                    className="d-flex align-items-start justify-content-between"
                                    style={{ padding: "14px 16px" }}
                                >
                                    {/* Left: radio + text */}
                                    <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                        {/* Radio */}
                                        <span
                                            aria-hidden="true"
                                            style={{
                                                width: 22,
                                                height: 22,
                                                borderRadius: 999,
                                                border: `2px solid #155DFC`,
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                marginTop: 2,
                                                background: "#fff",
                                                flex: "0 0 auto",
                                            }}
                                        >

                                            <span
                                                style={{
                                                    width: 5,
                                                    height: 5,
                                                    borderRadius: 999,
                                                    background: "#155DFC",
                                                    display: "inline-block",
                                                }}
                                            />

                                        </span>

                                        {/* Text */}
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                className=""
                                                style={{
                                                    fontSize: 11,
                                                    color: "#155DFC",
                                                    fontWeight: 700,
                                                    letterSpacing: ".04em",
                                                    lineHeight: 1.1,
                                                }}
                                            >
                                                Livello 4
                                            </div>

                                            <div
                                                className="text-dark mt-1"
                                                style={{
                                                    fontSize: 14,
                                                    lineHeight: 1.25,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%",
                                                }}
                                                title="Guarda almeno un video base sulla gestione del denaro"
                                            >
                                                Guarda almeno un video base sulla gestione del denaro
                                            </div>

                                            <div
                                                className="text-muted mt-2"
                                                style={{
                                                    fontSize: 12,
                                                    lineHeight: 1.3,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                Inizia la tua formazione guardando un video introduttivo.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right chevron */}
                                    <MDBIcon
                                        fas
                                        icon="chevron-right"
                                        style={{
                                            color: "#155DFC",
                                            marginTop: 6,
                                            flex: "0 0 auto",
                                        }}
                                    />
                                </MDBCardBody>
                            </MDBCard>
                            <MDBCard
                                role="button"
                                className="border mb-3"
                                style={{

                                    borderRadius: "14px",
                                    backgroundColor: "",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",

                                }}
                            >
                                <MDBCardBody
                                    className="d-flex align-items-start justify-content-between"
                                    style={{ padding: "14px 16px" }}
                                >
                                    {/* Left: radio + text */}
                                    <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                        {/* Radio */}
                                        <span className="text-muted">
                                            <MDBIcon fas icon="lock" />
                                        </span>

                                        {/* Text */}
                                        <div style={{ minWidth: 0 }}>
                                            <div
                                                className="text-muted"
                                                style={{
                                                    fontSize: 11,
                                                    fontWeight: 700,
                                                    letterSpacing: ".04em",
                                                    lineHeight: 1.1,
                                                }}
                                            >
                                                Livello 5
                                            </div>

                                            <div
                                                className="text-muted mt-1"
                                                style={{
                                                    fontSize: 14,
                                                    lineHeight: 1.25,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%",
                                                }}
                                                title="Completa tutti i passi del livello attuale per sbloccare il prossimo"
                                            >
                                                Completa tutti i passi del livello attuale per sbloccare il prossimo
                                            </div>

                                            <div
                                                className="text-muted mt-2"
                                                style={{
                                                    fontSize: 12,
                                                    lineHeight: 1.3,
                                                    display: "-webkit-box",
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: "vertical",
                                                    overflow: "hidden",
                                                }}
                                            >
                                                Segui tutti i passaggi del livello corrente per accedere al livello successivo e nuove funzionalità.
                                            </div>
                                        </div>
                                    </div>


                                </MDBCardBody>
                            </MDBCard>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>
        </MDBContainer>
    );
};

export default Profile;
