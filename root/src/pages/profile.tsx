import React, { useMemo, useEffect } from "react";
import {
    MDBBtn,
    MDBCard,
    MDBCardBody,
    MDBCardTitle,
    MDBCol,
    MDBContainer,
    MDBIcon,
    MDBProgress,
    MDBProgressBar,
    MDBRow,
    MDBTooltip,
} from "mdb-react-ui-kit";

import { useAuth } from "../auth_module/AuthContext";

import { useIsMobile } from "../app_components/ResponsiveModule";

const Profile: React.FC = () => {
    const isMobile = useIsMobile(992);

    const { userInfo } = useAuth();

    const level = useMemo(() => {
        const fallback = 1;
        const raw = userInfo?.extended_fields;
        if (!raw) return fallback;

        try {
            const parsed = JSON.parse(raw);
            const lvl = Number(parsed?.level);
            return Number.isFinite(lvl) && lvl > 0 ? lvl : fallback;
        } catch {
            return fallback;
        }
    }, [userInfo?.extended_fields]);

    // ✅ “KIT” RESPONSIVE (igual que Dashboard)
    const ui = useMemo(() => {
        return {
            // fuentes
            hSection: { fontSize: isMobile ? "14px" : "1rem" }, // títulos de secciones (header azul)
            subSection: { fontSize: isMobile ? "11px" : "0.8rem" }, // subtítulos header azul
            hCardTitle: { fontSize: isMobile ? "13px" : "" }, // strong en cards pequeñas
            pill: { fontSize: isMobile ? "10px" : "0.75rem" },
            textSmall: { fontSize: isMobile ? "12px" : "" },
            textBody: { fontSize: isMobile ? "13px" : "0.95rem" },
            numberBig: { fontSize: isMobile ? "1.6rem" : "2rem" },

            // paddings
            headerPadClass: isMobile ? "p-3" : "p-3 py-md-3 px-md-4",
            bodyPadClass: isMobile ? "p-3" : "p-3 p-md-4",

            // labels
            label: { color: "#21384A", fontWeight: 700, fontSize: isMobile ? "12px" : "13px" },

            // alerts
            alertText: { fontSize: isMobile ? "13px" : "14px" },
            alertFine: { fontSize: isMobile ? "12px" : "12px" },
        };
    }, [isMobile]);

    return (
        <MDBContainer fluid className="py-3 py-md-2 px-0">
            {/* ==================== TOP HEADER (titolo + pill) ==================== */}
            <MDBRow className="g-3 mb-4">
                <MDBCol xs="12">
                    <div>
                        <div className="d-flex flex-column gap-2">
                            <div className="d-flex align-items-center">
                                <span className="fs-4 fw-bold text-dark">
                                    Il mio profilo
                                </span>
                            </div>

                            <div className="text-muted" style={ui.textBody}>
                                Monitora i tuoi progressi, la formazione e l’evoluzione dei tuoi investimenti
                            </div>

                            <div className="pt-1">
                                <MDBBtn
                                    className="d-inline-flex align-items-center gap-2 px-4 py-2"
                                    style={{
                                        fontSize: isMobile ? "12px" : "13px",
                                        backgroundColor: "rgba(21, 93, 252, 1)",
                                        border: "3px solid rgba(21, 93, 252, 1)",
                                        borderRadius: "14px",
                                        boxShadow: "0 10px 22px rgba(21, 93, 252, 0.25)",
                                    }}
                                >
                                    <MDBIcon className="me-1" far icon="star" />
                                    <span>Livello {level} / 5</span>
                                    <span style={{ opacity: 0.75 }}>·</span>
                                    <span>In fase di risveglio</span>
                                </MDBBtn>
                            </div>
                        </div>
                    </div>

                </MDBCol>
            </MDBRow>

            {/* ==================== INFO CARD (stile “blue box” come Dashboard) ==================== */}
            <MDBRow className="g-3 mb-4">
                <MDBCol xs="12">
                    <MDBCard
                        className="border-0 rounded-4"
                        style={{
                            border: "1px solid rgba(190, 219, 255, 1)",
                            backgroundColor: "rgb(239,246,255)",
                        }}
                    >
                        <MDBCardBody className={ui.bodyPadClass}>
                            <div className="d-flex align-items-start gap-3">
                                <div className="flex-shrink-0" style={{ marginTop: 2 }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path
                                            d="M13.333 5.83325H18.333V10.8333"
                                            stroke="#155DFC"
                                            strokeWidth="1.66667"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M18.3337 5.83325L11.2503 12.9166L7.08366 8.74992L1.66699 14.1666"
                                            stroke="#155DFC"
                                            strokeWidth="1.66667"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </div>

                                <div style={{ minWidth: 0 }}>
                                    <MDBCardTitle className="fw-bold mb-1" style={ui.textBody}>
                                        Il tuo livello attuale
                                    </MDBCardTitle>

                                    <div className="fw-bold mb-0" style={{ color: "#155DFC", ...ui.textSmall }}>
                                        Hai iniziato il percorso e stai prendendo coscienza della tua situazione finanziaria. Continua ad
                                        acquisire le informazioni fondamentali per migliorare il tuo livello.
                                    </div>
                                </div>
                            </div>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>

            {/* ==================== TWO CARDS ROW ==================== */}
            <MDBRow className="g-3 mb-4">
                {/* Card 1 */}
                <MDBCol xs="12" md="6">
                    <MDBCard className="shadow-sm rounded-4 border-0">
                        <div
                            className={ui.headerPadClass}
                            style={{
                                backgroundColor: "rgb(38, 53, 80)",
                                color: "white",
                                borderTopRightRadius: "0.75rem",
                                borderTopLeftRadius: "0.75rem",
                            }}
                        >
                            <div className="d-flex align-items-center">
                                <MDBIcon fas icon="chart-column" className="me-2 fs-5 text-white" />
                                <span className="fw-bold" style={ui.hSection}>
                                    Problemi livello 1
                                </span>
                            </div>
                            <small className="text-white-50" style={ui.subSection}>
                                Monitora i tuoi progressi
                            </small>
                        </div>

                        <MDBCardBody className={ui.bodyPadClass}>
                            <p className="text-muted mb-3" style={ui.textBody}>
                                Monitora i tuoi progressi, la formazione e l’evoluzione dei tuoi investimenti
                            </p>

                            <MDBTooltip tag="div" title="Avanzamento rispetto al target sul valore attuale (cassa + asset)">
                                <div className="mb-1 d-flex justify-content-between" style={ui.textSmall}>
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
                <MDBCol xs="12" md="6">
                    <MDBCard className="shadow-sm rounded-4 border-0">
                        <div
                            className={ui.headerPadClass}
                            style={{
                                backgroundColor: "rgb(38, 53, 80)",
                                color: "white",
                                borderTopRightRadius: "0.75rem",
                                borderTopLeftRadius: "0.75rem",
                            }}
                        >
                            <div className="d-flex align-items-center">
                                <MDBIcon fas icon="chart-column" className="me-2 fs-5 text-white" />
                                <span className="fw-bold" style={ui.hSection}>
                                    Obiettivi livello 1
                                </span>
                            </div>
                            <small className="text-white-50" style={ui.subSection}>
                                Verso il livello successivo
                            </small>
                        </div>

                        <MDBCardBody className={ui.bodyPadClass}>
                            <p className="text-muted mb-3" style={ui.textBody}>
                                Stai risolvendo le problematiche del livello 1 che ti aiuteranno a progredire verso il livello successivo.
                            </p>

                            <MDBTooltip tag="div" title="Avanzamento rispetto al target sul valore attuale (cassa + asset)">
                                <div className="mb-1 d-flex justify-content-between" style={ui.textSmall}>
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

            {/* ==================== AWARENESS INDEX CARD (header come Dashboard) ==================== */}
            <MDBRow className="g-3 mb-4">
                <MDBCol xs="12">
                    <MDBCard className="shadow-sm rounded-4 border-0">
                        <div
                            className={ui.headerPadClass}
                            style={{
                                backgroundColor: "rgb(38, 53, 80)",
                                color: "white",
                                borderTopRightRadius: "0.75rem",
                                borderTopLeftRadius: "0.75rem",
                            }}
                        >
                            <div className="d-flex align-items-center mb-1">
                                <MDBIcon fas icon="chart-column" className="me-2 fs-5 text-white" />
                                <span className="fw-bold" style={ui.hSection}>
                                    Indice di consapevolezza finanziaria
                                </span>
                            </div>
                            <small className="text-white-50" style={ui.subSection}>
                                Simulazioni basate su capitale e versamenti
                            </small>
                        </div>

                        <MDBCardBody className={ui.bodyPadClass}>
                            <MDBRow className="justify-content-center text-center mb-4">
                                <MDBCol xs="12" md="6" lg="4">
                                    <div style={ui.textBody}>
                                        <span className="fw-bold">26</span>
                                        <span>/</span>
                                        <span>100</span>
                                    </div>

                                    <div className="text-muted mb-3" style={ui.textBody}>
                                        In formazione
                                    </div>

                                    <MDBProgress className="rounded" height="6">
                                        <MDBProgressBar width={26} striped />
                                    </MDBProgress>
                                </MDBCol>
                            </MDBRow>

                            <MDBRow className="g-3 mb-3">
                                <MDBCol xs="12" md="6">
                                    <MDBCard className="border rounded-4">
                                        <MDBCardBody className={isMobile ? "p-3" : "p-3"}>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="fw-bold" style={ui.textBody}>
                                                    Formazione
                                                </span>
                                                <span className="text-danger fw-bold" style={ui.textBody}>
                                                    10/100
                                                </span>
                                            </div>
                                            <p className="text-muted mb-3" style={ui.textBody}>
                                                Completa i corsi e la narrativa utile per il tuo livello.
                                            </p>
                                            <MDBProgress className="rounded" height="6">
                                                <MDBProgressBar width={10} striped />
                                            </MDBProgress>
                                        </MDBCardBody>
                                    </MDBCard>
                                </MDBCol>

                                <MDBCol xs="12" md="6">
                                    <MDBCard className="border rounded-4">
                                        <MDBCardBody className={isMobile ? "p-3" : "p-3"}>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span className="fw-bold" style={ui.textBody}>
                                                    Struttura
                                                </span>
                                                <span className="text-danger fw-bold" style={ui.textBody}>
                                                    10/100
                                                </span>
                                            </div>
                                            <p className="text-muted mb-3" style={ui.textBody}>
                                                Hai bisogno di strutturare meglio il tuo modo di investire.
                                            </p>
                                            <MDBProgress className="rounded" height="6">
                                                <MDBProgressBar width={10} striped />
                                            </MDBProgress>
                                        </MDBCardBody>
                                    </MDBCard>
                                </MDBCol>
                            </MDBRow>

                            {/* CTA blue card (stile Dashboard) */}
                            <MDBCard
                                className="border-0 rounded-4"
                                style={{
                                    border: "1px solid rgba(190, 219, 255, 1)",
                                    backgroundColor: "rgba(21, 93, 252, 1)",
                                }}
                            >
                                <MDBCardBody className={isMobile ? "p-3" : "p-3 p-md-4"}>
                                    <div className="d-flex align-items-center justify-content-between gap-3">
                                        <div style={{ color: "white", minWidth: 0 }}>
                                            <MDBCardTitle className="fw-bold mb-1" style={ui.textBody}>
                                                Vuoi aumentare il tuo indice?
                                            </MDBCardTitle>

                                            <div style={ui.textBody}>
                                                Guarda il prossimo video consigliato per continuare il tuo percorso di crescita.
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="btn btn-light ripple-surface-dark"
                                            style={{
                                                color: "rgba(21, 93, 252, 1)",
                                                fontSize: isMobile ? 12 : 13,
                                                padding: isMobile ? "8px 12px" : "10px 14px",
                                                borderRadius: 12,
                                                flex: "0 0 auto",
                                            }}
                                        >
                                            Guarda
                                        </button>
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>

            {/* ==================== VIDEOS + ROADMAP ==================== */}
            <MDBRow className="g-3 mb-4">
                {/* Video consigliati */}
                <MDBCol xs="12" md="6">
                    <MDBCard className="shadow-sm rounded-4 border-0">
                        <div
                            className={ui.headerPadClass}
                            style={{
                                backgroundColor: "rgb(38, 53, 80)",
                                color: "white",
                                borderTopRightRadius: "0.75rem",
                                borderTopLeftRadius: "0.75rem",
                            }}
                        >
                            <div className="d-flex align-items-center">
                                <MDBIcon fas icon="chart-column" className="me-2 fs-5 text-white" />
                                <span className="fw-bold" style={ui.hSection}>
                                    Video consigliati
                                </span>
                            </div>
                            <small className="text-white-50" style={ui.subSection}>
                                Contenuti suggeriti per il tuo livello
                            </small>
                        </div>

                        <MDBCardBody className={ui.bodyPadClass}>
                            <MDBCard
                                className="border"
                                style={{
                                    borderColor: "#E9EEF5",
                                    borderRadius: "14px",
                                    boxShadow: "0 1px 0 rgba(16,24,40,.02)",
                                }}
                            >
                                <MDBCardBody className="d-flex align-items-center justify-content-between" style={{ padding: "16px 16px" }}>
                                    <div className="pe-3" style={{ minWidth: 0 }}>
                                        <div className="fw-semibold text-dark" style={{ fontSize: isMobile ? 13 : 14, lineHeight: 1.2 }}>
                                            Iniziare a risparmiare
                                        </div>

                                        <div
                                            className="text-muted mt-1"
                                            style={{
                                                fontSize: isMobile ? 12 : 12,
                                                lineHeight: 1.3,
                                                display: "-webkit-box",
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: "vertical",
                                                overflow: "hidden",
                                            }}
                                        >
                                            Scopri come creare un budget efficace e iniziare a mettere da parte i tuoi risparmi.
                                        </div>

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
                                            <span style={{ color: "#155DFC", fontSize: isMobile ? 12 : 12 }}>ripasso</span>
                                        </div>
                                    </div>

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

                {/* Road map */}
                <MDBCol xs="12" md="6">
                    <MDBCard className="shadow-sm rounded-4 border-0">
                        <div
                            className={ui.headerPadClass}
                            style={{
                                backgroundColor: "rgb(38, 53, 80)",
                                color: "white",
                                borderTopRightRadius: "0.75rem",
                                borderTopLeftRadius: "0.75rem",
                            }}
                        >
                            <div className="d-flex align-items-center">
                                <MDBIcon fas icon="chart-column" className="me-2 fs-5 text-white" />
                                <span className="fw-bold" style={ui.hSection}>
                                    La tua road map
                                </span>
                            </div>
                            <small className="text-white-50" style={ui.subSection}>
                                Passi consigliati per progredire
                            </small>
                        </div>

                        <MDBCardBody className={ui.bodyPadClass}>
                            {/* ✅ dejo tu contenido igual, solo normalizo tamaños */}
                            {[
                                {
                                    done: true,
                                    level: "Livello 1",
                                    title: "Definire almeno un obiettivo finanziario",
                                    desc: "Completa il questionario e definisci il tuo obiettivo finanziario, capitale, età e i mercati.",
                                },
                                {
                                    done: false,
                                    level: "Livello 2",
                                    title: "Traccia entrate e uscite di un mese",
                                    desc: "Monitora per spese ed entrate del mese: tieni sotto controllo le tue finanze personali.",
                                },
                                {
                                    done: false,
                                    level: "Livello 3",
                                    title: "Imposta un risparmio mensile (anche piccolo)",
                                    desc: "Inizia a mettere da parte ogni mese una parte del tuo reddito, anche piccola. È una buona abitudine.",
                                },
                                {
                                    done: false,
                                    level: "Livello 4",
                                    title: "Guarda almeno un video base sulla gestione del denaro",
                                    desc: "Inizia la tua formazione guardando un video introduttivo.",
                                },
                            ].map((item) => (
                                <MDBCard
                                    key={item.level}
                                    role="button"
                                    className={`border mb-3 ${item.done ? "border-success alert-success" : ""}`}
                                    style={{
                                        borderRadius: "14px",
                                        backgroundColor: item.done ? undefined : "#F6FAFF",
                                        boxShadow: "0 1px 0 rgba(16,24,40,.02)",
                                    }}
                                >
                                    <MDBCardBody className="d-flex align-items-start justify-content-between" style={{ padding: "14px 16px" }}>
                                        <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                            <span
                                                aria-hidden="true"
                                                style={{
                                                    width: 22,
                                                    height: 22,
                                                    borderRadius: 999,
                                                    border: item.done ? "2px solid #198754" : "2px solid #155DFC",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    marginTop: 2,
                                                    background: "#fff",
                                                    flex: "0 0 auto",
                                                }}
                                            >
                                                {item.done ? (
                                                    <MDBIcon className="fs-6 text-success" fas icon="check" />
                                                ) : (
                                                    <span
                                                        style={{
                                                            width: 5,
                                                            height: 5,
                                                            borderRadius: 999,
                                                            background: "#155DFC",
                                                            display: "inline-block",
                                                        }}
                                                    />
                                                )}
                                            </span>

                                            <div style={{ minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: item.done ? "#198754" : "#155DFC",
                                                        fontWeight: 700,
                                                        letterSpacing: ".04em",
                                                        lineHeight: 1.1,
                                                    }}
                                                >
                                                    {item.level}
                                                </div>

                                                <div
                                                    className="text-dark mt-1"
                                                    style={{
                                                        fontSize: isMobile ? 13 : 14,
                                                        lineHeight: 1.25,
                                                        whiteSpace: "nowrap",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        maxWidth: "100%",
                                                    }}
                                                    title={item.title}
                                                >
                                                    {item.title}
                                                </div>

                                                <div
                                                    className="text-muted mt-2"
                                                    style={{
                                                        fontSize: isMobile ? 12 : 12,
                                                        lineHeight: 1.3,
                                                        display: "-webkit-box",
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: "vertical",
                                                        overflow: "hidden",
                                                    }}
                                                >
                                                    {item.desc}
                                                </div>
                                            </div>
                                        </div>

                                        <MDBIcon
                                            fas
                                            icon="chevron-right"
                                            style={{
                                                color: item.done ? "#198754" : "#155DFC",
                                                marginTop: 6,
                                                flex: "0 0 auto",
                                            }}
                                        />
                                    </MDBCardBody>
                                </MDBCard>
                            ))}

                            {/* Locked level */}
                            <MDBCard className="border mb-0" style={{ borderRadius: "14px", boxShadow: "0 1px 0 rgba(16,24,40,.02)" }}>
                                <MDBCardBody className="d-flex align-items-start justify-content-between" style={{ padding: "14px 16px" }}>
                                    <div className="d-flex align-items-start" style={{ gap: 12, minWidth: 0 }}>
                                        <span className="text-muted" style={{ marginTop: 2 }}>
                                            <MDBIcon fas icon="lock" />
                                        </span>

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
                                                    fontSize: isMobile ? 13 : 14,
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
                                                    fontSize: isMobile ? 12 : 12,
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
