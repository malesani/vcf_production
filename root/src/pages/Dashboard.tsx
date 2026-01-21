import {
    MDBContainer,
    MDBRow,
    MDBCol,
    MDBCard,
    MDBCardBody,
    MDBTypography,
    MDBBtn,
    MDBIcon,
    MDBAlert,
    MDBCardFooter,
    MDBInput,
    MDBRange,
    MDBCheckbox,
} from "mdb-react-ui-kit";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import React, { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { activateAccountRequest } from "../auth_module/SingupFunctions";
import { useIsMobile } from "../app_components/ResponsiveModule";

// qua i presets
import { getPresets } from "../api_module_v1/PresetDataRequest";

interface DashboardProps {
    userName?: string;
    pageName?: string;
}

type Perfil = "tranquilo" | "dinamico" | "ambizioso";
type Stat = { label: string; value: string };

// ======= TIPOS PARA NIVO LINE =======
type LinePoint = { x: string; y: number };
type LineSerie = { id: string; data: LinePoint[]; color: string };

// ======= PIE =======
const data2 = [
    { id: "erlang", label: "Liquidita", value: 90, color: "hsl(108, 70%, 50%)" },
    { id: "php", label: "Investiti", value: 441, color: "hsl(206, 70%, 50%)" },
];

// ======= HELPERS =======
const parseNum = (v: string) => {
    const cleaned = String(v).replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
};

const yearsToReachTarget = (
    P0: number,
    m: number,
    target: number,
    annual: number,
    maxYears = 40
) => {
    if (target <= 0) return 1;
    if (P0 >= target) return 1;

    const rM = Math.pow(1 + annual, 1 / 12) - 1;
    let balance = P0;

    for (let month = 1; month <= maxYears * 12; month++) {
        balance += m;
        balance *= 1 + rM;

        if (balance >= target) return Math.ceil(month / 12);
    }
    return maxYears;
};

const buildLineSeries = (P0: number, m: number, Y: number): LineSerie[] => {
    const startYear = new Date().getFullYear();

    const scenarios = [
        { id: "Banca / assicurazioni", annual: 0.02, color: "#E11D2E" },
        { id: "Autodidatta", annual: 0.05, color: "#E4A119" },
        { id: "Strategie MIPAI", annual: 0.1, color: "#007A55" },
    ];

    const toMonthlyRate = (annual: number) => Math.pow(1 + annual, 1 / 12) - 1;

    return scenarios.map(({ id, annual, color }) => {
        const rM = toMonthlyRate(annual);

        let balance = P0;
        const data: LinePoint[] = [];

        for (let i = 0; i < Y; i++) {
            for (let month = 0; month < 12; month++) {
                balance += m;
                balance *= 1 + rM;
            }

            data.push({
                x: String(startYear + i),
                y: Math.round(balance),
            });
        }

        return { id, color, data };
    });
};

const buildPastSeries = (
    P0: number,
    m: number,
    Ypast: number,
    annual: number
): LineSerie[] => {
    const endYear = new Date().getFullYear();
    const startYear = endYear - Ypast;

    const rM = Math.pow(1 + annual, 1 / 12) - 1;

    let balance = P0;
    const data: LinePoint[] = [];

    for (let y = 1; y <= Ypast; y++) {
        for (let month = 0; month < 12; month++) {
            balance += m;
            balance *= 1 + rM;
        }

        data.push({
            x: String(startYear + y),
            y: Math.round(balance),
        });
    }

    return [
        {
            id: "Andamento di crescita per i passati " + Ypast + " anni",
            color: "#155DFC",
            data,
        },
    ];
};

// ======= RESPONSIVE HOOK (md breakpoint) =======


const Dashboard: React.FC<DashboardProps> = ({ userName, pageName }) => {
    const isMobile = useIsMobile(992);
    const [perfil, setPerfil] = useState<Perfil>("tranquilo");
    const [invest, setInvest] = useState<number>(0);
    // ===== Backtest =====
    const [backtestData, setBacktestData] = useState<LineSerie[]>([]);

    const [pastYears, setPastYears] = useState("5");
    const [capitalBacktesting, setCapitalBacktesting] = useState("");
    const [monthlyBacktesting, setMonthlyBacktesting] = useState("");

    useEffect(() => {
        const P0 = parseNum(capitalBacktesting);
        const m = parseNum(monthlyBacktesting);
        const Ypast = Math.max(1, parseInt(pastYears, 10) || 1);

        const annual =
            perfil === "tranquilo" ? 0.02 : perfil === "dinamico" ? 0.05 : 0.1;

        setBacktestData(buildPastSeries(P0, m, Ypast, annual));
    }, [capitalBacktesting, monthlyBacktesting, pastYears, perfil]);

    const backtestSummary = useMemo(() => {
        const yearsN = Math.max(1, parseInt(pastYears, 10) || 1);
        const P0 = parseNum(capitalBacktesting);
        const m = parseNum(monthlyBacktesting);

        const totalVersato = P0 + m * 12 * yearsN;

        const lastY =
            backtestData?.[0]?.data?.[backtestData[0].data.length - 1]?.y ?? 0;

        const capitaleOggi = Number(lastY) || 0;

        const gainEUR_raw = capitaleOggi - totalVersato;
        const gainEUR = Math.max(0, gainEUR_raw);

        const gainPct_raw = totalVersato > 0 ? (gainEUR / totalVersato) * 100 : 0;
        const gainPct = Math.max(0, gainPct_raw);

        return { yearsN, totalVersato, capitaleOggi, gainEUR, gainPct };
    }, [pastYears, capitalBacktesting, monthlyBacktesting, backtestData]);

    // ===== Future sim =====
    const [capital, setCapital] = useState("");
    const [monthly, setMonthly] = useState("");
    const [years, setYears] = useState("");
    const [objCapital, setObjCapital] = useState("");
    const [autoYears, setAutoYears] = useState(false);

    const [lineData, setLineData] = useState<LineSerie[]>([]);

    const [options, setOptions] = useState({
        option1: false,
        option2: false,
        option3: false,
    });

    const handleChange = (e: any) => {
        const { name, checked } = e.target;
        setOptions({ ...options, [name]: checked });
    };

    const fmtEUR = (n: number) =>
        new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
        }).format(n);

    const stats: Stat[] = useMemo(() => {
        const yearsN = parseInt(pastYears, 10) || 0;
        const totalContrib = parseNum(monthlyBacktesting) * 12 * yearsN;
        const finalCapital = backtestData?.[0]?.data?.[backtestData[0].data.length - 1]?.y ?? 0;

        return [
            { label: "Anni trascorsi", value: String(yearsN) },
            { label: "Capitale iniziale", value: fmtEUR(parseNum(capitalBacktesting)) },
            { label: "Somma versamenti", value: fmtEUR(totalContrib) },
            { label: "Capitale stimato oggi", value: fmtEUR(finalCapital) },
        ];
    }, [pastYears, monthlyBacktesting, capitalBacktesting, backtestData]);

    useEffect(() => {
        if (!autoYears) return;

        const P0 = parseNum(capital);
        const m = parseNum(monthly);
        const target = parseNum(objCapital);
        const annual = 0.1;
        const neededYears = yearsToReachTarget(P0, m, target, annual, 40);
        setYears(String(neededYears));
    }, [autoYears, capital, monthly, objCapital]);

    useEffect(() => {
        const P0 = parseNum(capital);
        const m = parseNum(monthly);
        const Y = Math.max(1, parseInt(years, 10) || 1);

        setLineData(buildLineSeries(P0, m, Y));
    }, [capital, monthly, years]);


    // ===== Activation banner =====
    type Banner = { type: "success" | "error"; text: string } | null;

    const location = useLocation();
    const navigate = useNavigate();

    const [banner, setBanner] = useState<Banner>(null);
    const [activationBusy, setActivationBusy] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const token = params.get("activation_token");

        if (!token) return;

        setActivationBusy(true);

        activateAccountRequest({ token })
            .then(({ response }) => {
                if (response.success) {
                    const msgKey = response.message;

                    if (msgKey === "signup.activation.already_done") {
                        setBanner({ type: "success", text: "Account già attivato." });
                    } else {
                        setBanner({ type: "success", text: "Account attivato correttamente." });
                    }
                } else {
                    setBanner({
                        type: "error",
                        text:
                            response.message ||
                            "Impossibile attivare l’account. Il link potrebbe essere scaduto.",
                    });
                }
            })
            .catch(() => {
                setBanner({ type: "error", text: "Errore durante l’attivazione account." });
            })
            .finally(() => {
                setActivationBusy(false);

                const next = new URLSearchParams(location.search);
                next.delete("activation_token");
                navigate(
                    { pathname: location.pathname, search: next.toString() ? `?${next.toString()}` : "" },
                    { replace: true }
                );
            });
    }, [location.search, location.pathname, navigate]);

    // ===== Presets (quiz -> presets) =====
    useEffect(() => {
        // metti qui la versione che stai usando nel quiz (es: "1.1")
        const QUIZ_VERSION = "1.1";

        getPresets({ quiz_version: QUIZ_VERSION })
            .then(({ response, data }) => {
                if (!response.success) {
                    console.log("[PRESETS] fetch failed:", response.message, response.error);
                    return;
                }

                const preset = data?.preset;
                if (!preset) {
                    console.log("[PRESETS] Nessun preset trovato per versione", QUIZ_VERSION);
                    return;
                }

                // ✅ QUI: vedi il contenuto che arriva dal quiz (preset_json.answers)
                console.log("[PRESETS] preset row:", preset);
                console.log("[PRESETS] quiz answers:", preset.preset_json?.answers);
                //capitale
                setCapitalBacktesting(preset.preset_json.answers.step_2.available_savings);
                setCapital(preset.preset_json.answers.step_2.available_savings);

                //mensile
                setMonthlyBacktesting(preset.preset_json.answers.step_3.monthly_invest_capacity);
                setMonthly(preset.preset_json.answers.step_3.monthly_invest_capacity);

                setObjCapital(preset.preset_json.answers.step_3.target_capital);
                setAutoYears(true)
                setInvest(preset.preset_json.answers.step_2.invested_capital || 0);
            })
            .catch((err) => {
                console.log("[PRESETS] fetch error:", err);
            });
    }, []);


    return (
        <>
            {banner && (
                <MDBContainer>
                    <div
                        className={`alert alert-${banner.type === "success" ? "success" : "danger"} mb-0`}
                    >
                        {banner.text}
                    </div>
                </MDBContainer>
            )}

            <MDBContainer className="py-3 py-md-4 px-0">
                <MDBRow className="g-3 mb-4">
                    {/* ==================== LEFT ==================== */}
                    <MDBCol xs="12" md="6" lg="4">
                        <div className="d-flex flex-column gap-3">
                            {/* Card 1 */}
                            <MDBCard className="shadow-sm rounded-4">
                                <div
                                    className="p-3 p-md-4"
                                    style={{
                                        backgroundColor: "rgb(38, 53, 80)",
                                        color: "white",
                                        borderTopRightRadius: "0.75rem",
                                        borderTopLeftRadius: "0.75rem",
                                    }}
                                >
                                    <div className="d-flex align-items-center mb-1">
                                        <MDBIcon fas icon="chart-line" className="me-2 fs-5 text-white" />
                                        <span className="fw-bold">Patrimonio totale</span>
                                    </div>
                                    <small className="text-white-50">Situazione attuale dei tuoi assets</small>
                                </div>

                                <MDBCardBody className="p-3 p-md-4">
                                    <MDBTypography tag="h3" className="fw-bold mb-3 mb-md-4">
                                        { Number(capital) + Number(invest) } €
                                    </MDBTypography>

                                    <div className="d-flex flex-column flex-sm-row gap-3">
                                        <div
                                            className="flex-fill rounded-3 p-3"
                                            style={{ backgroundColor: "#FFF7E6", border: "1px solid #FFE2A8" }}
                                        >
                                            <small className="text-warning fw-semibold">Liquidità</small>
                                            <div className="fw-bold mt-1">{capital} €</div>
                                        </div>

                                        <div
                                            className="flex-fill rounded-3 p-3"
                                            style={{ backgroundColor: "#EEF5FF", border: "1px solid #D6E6FF" }}
                                        >
                                            <small className="text-primary fw-semibold">Investiti</small>
                                            <div className="fw-bold mt-1">{invest} €</div>
                                        </div>
                                    </div>
                                </MDBCardBody>
                            </MDBCard>

                            {/* Card 2 (Pie) */}
                            <MDBCard className="shadow-sm rounded-4">
                                <div
                                    className="p-3 p-md-4"
                                    style={{
                                        backgroundColor: "rgb(38, 53, 80)",
                                        color: "white",
                                        borderTopRightRadius: "0.75rem",
                                        borderTopLeftRadius: "0.75rem",
                                    }}
                                >
                                    <div className="d-flex align-items-center mb-1">
                                        <MDBIcon fas icon="chart-pie" className="me-2 fs-5 text-white" />
                                        <span className="fw-bold">Distribuzione patrimonio</span>
                                    </div>
                                    <small className="text-white-50">Situazione attuale dei tuoi assets</small>
                                </div>

                                <MDBCardBody className="p-3 p-md-4">
                                    <div className="w-100" style={{ height: isMobile ? 220 : 180 }}>
                                        <ResponsivePie
                                            data={data2}
                                            margin={
                                                isMobile
                                                    ? { top: 10, right: 10, bottom: 60, left: 10 }
                                                    : { top: 5, right: 10, bottom: 70, left: 10 }
                                            }
                                            innerRadius={0.8}
                                            activeOuterRadiusOffset={8}
                                            borderColor={{ from: "color", modifiers: [["darker", 0.9]] }}
                                            enableArcLinkLabels={false}
                                            enableArcLabels={false}
                                            legends={[{
                                                anchor: "bottom",
                                                direction: "row",
                                                translateY: 50,
                                                itemWidth: 90,
                                                itemHeight: 18,
                                                itemsSpacing: 10,
                                                symbolSize: 10,
                                                symbolShape: "circle",
                                            }]}
                                        />
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </div>
                    </MDBCol>

                    {/* ==================== RIGHT ==================== */}
                    <MDBCol xs="12" md="6" lg="8">
                        <MDBCard
                            className="d-flex flex-column border-0"
                            style={{
                                height: isMobile ? "auto" : "630px",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                className="p-3 p-md-4"
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="lightbulb" className="me-2 fs-4 text-white" />
                                    <span className="fs-6 fs-md-5 fw-bold text-white">Punti critici da migliorare</span>
                                </div>
                                <small className="text-white-50">Aspetti su cui intervenire</small>
                            </div>

                            <MDBCardBody className="p-3 p-md-4" style={{ overflowY: isMobile ? "visible" : "auto" }}>
                                {[
                                    "Hai indicato che fai fatica a risparmiare: il primo passo è creare un margine mensile positivo. Prova a tracciare entrate e uscite per un mese.",
                                    "Hai indicato che fai fatica a risparmiare: il primo passo è creare un margine mensile positivo. Prova a tracciare entrate e uscite per un mese.",
                                    "Hai indicato che fai fatica a risparmiare: il primo passo è creare un margine mensile positivo. Prova a tracciare entrate e uscite per un mese.",
                                ].map((t, idx) => (
                                    <div
                                        key={idx}
                                        className={`d-flex align-items-start align-items-md-center border rounded-4 p-3 gap-3 mb-3 border-2 ${idx === 1 ? "border-danger" : "border-warning"
                                            }`}
                                    >
                                        <MDBIcon
                                            className="flex-shrink-0"
                                            fas
                                            icon="exclamation-triangle"
                                            style={{
                                                backgroundColor: "#FE9A0033",
                                                padding: "12px",
                                                color: "#FE9A00",
                                                borderRadius: "10px",
                                            }}
                                        />
                                        <div className="text-muted">{t}</div>
                                    </div>
                                ))}
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* ==================== SECTION: TIME TO TARGET ==================== */}
                <MDBRow className="g-3 mb-4">
                    <MDBCol xs="12">
                        <MDBCard className="d-flex flex-column border-0">
                            <div
                                className="p-3 p-md-4"
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                                    <span className="fs-6 fs-md-5 fw-bold text-white">
                                        In quanto tempo puoi raggiungere il tuo obiettivo?
                                    </span>
                                </div>
                                <small className="text-white-50">  Simulazioni basate sul tuo capitale iniziale, sui tuoi versamenti mensili e su rendimenti annui
                                    ipotetici.
                                </small>


                            </div>

                            <MDBCardBody className="p-3 p-md-4">
                                <MDBRow className="g-3 mb-4">
                                    <MDBCol xs="12" md="6" lg="4" className="d-flex">
                                        <MDBCard className="square border border-danger border-2 bg-opacity-25 bg-danger w-100">
                                            <MDBCardBody className="">
                                                <MDBTypography
                                                    tag="h6"
                                                    className="mb-3 d-flex  flex-sm-row gap-2 align-items-start align-items-sm-center justify-content-between"
                                                >
                                                    <strong>Banca / assicurazioni</strong>
                                                    <div
                                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                        style={{
                                                            backgroundColor: "#E11D2E",
                                                            color: "white",
                                                            borderRadius: "999px",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        2% annuo
                                                    </div>
                                                </MDBTypography>

                                                <MDBTypography className="fw-bold text-danger">
                                                    <MDBIcon far icon="clock" className="me-2" />
                                                    19 anni
                                                </MDBTypography>

                                                <small>
                                                    Con i numeri di oggi, con questo rendimento raggiungeresti il tuo obiettivo in circa 19 anni.
                                                </small>
                                            </MDBCardBody>

                                            <MDBCardFooter style={{ borderTop: "white solid 1px" }}>
                                                <MDBTypography className="m-0">Capitale stimato: 100.141 €</MDBTypography>
                                            </MDBCardFooter>
                                        </MDBCard>
                                    </MDBCol>

                                    <MDBCol xs="12" md="4" className="d-flex">
                                        <MDBCard className="square border border-warning border-2 bg-opacity-25 bg-warning w-100">
                                            <MDBCardBody>
                                                <MDBTypography
                                                    tag="h6"
                                                    className="mb-3 d-flex  flex-sm-row gap-2 align-items-start align-items-sm-center justify-content-between"
                                                >
                                                    <strong>Autodidatta</strong>
                                                    <div
                                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                        style={{
                                                            backgroundColor: "rgb(228 161 25)",
                                                            color: "white",
                                                            borderRadius: "999px",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        5% annuo
                                                    </div>
                                                </MDBTypography>

                                                <MDBTypography className="fw-bold text-warning">
                                                    <MDBIcon far icon="clock" className="me-2" />
                                                    14 anni
                                                </MDBTypography>

                                                <small>
                                                    Studiando e investendo da autodidatta, un rendimento medio del 5% annuo riduce i tempi di
                                                    molto.
                                                </small>
                                            </MDBCardBody>

                                            <MDBCardFooter style={{ borderTop: "white solid 1px" }}>
                                                <MDBTypography className="m-0">Capitale stimato: 100.141 €</MDBTypography>
                                            </MDBCardFooter>
                                        </MDBCard>
                                    </MDBCol>

                                    <MDBCol xs="12" md="4" className="d-flex">
                                        <MDBCard className="square border border-success border-2 bg-opacity-25 bg-success w-100">
                                            <MDBCardBody>
                                                <MDBTypography
                                                    tag="h6"
                                                    className="mb-3 d-flex flex-sm-row gap-2 align-items-start align-items-sm-center justify-content-between"
                                                >
                                                    <strong>Strategie MIPAI</strong>
                                                    <div
                                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                        style={{
                                                            backgroundColor: "#007A55",
                                                            color: "white",
                                                            borderRadius: "999px",
                                                            fontSize: "0.75rem",
                                                        }}
                                                    >
                                                        10% annuo
                                                    </div>
                                                </MDBTypography>

                                                <MDBTypography className="fw-bold text-success">
                                                    <MDBIcon far icon="clock" className="me-2" />
                                                    11 anni
                                                </MDBTypography>

                                                <small>
                                                    Con un piano strutturato e strategie MIPAI, un rendimento medio del 10% annuo accelera
                                                    ulteriormente il percorso.
                                                </small>
                                            </MDBCardBody>

                                            <MDBCardFooter style={{ borderTop: "white solid 1px" }}>
                                                <MDBTypography className="m-0">Capitale stimato: 100.141 €</MDBTypography>
                                            </MDBCardFooter>
                                        </MDBCard>
                                    </MDBCol>
                                </MDBRow>

                                <MDBAlert open className="w-100" color="primary">
                                    <svg
                                        className="me-3"
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 20 20"
                                        fill="none"
                                    >
                                        <path
                                            d="M13.333 5.8335H18.333V10.8335"
                                            stroke="#155DFC"
                                            strokeWidth="1.66667"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                        <path
                                            d="M18.3337 5.8335L11.2503 12.9168L7.08366 8.75016L1.66699 14.1668"
                                            stroke="#155DFC"
                                            strokeWidth="1.66667"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    Differenza tra banca e strategie MIPAI con i tuoi numeri: <strong>8 anni in meno</strong> per
                                    raggiungere l&apos;obiettivo.
                                </MDBAlert>

                                <div className="text-muted text-center" style={{ fontSize: 12 }}>
                                    Le simulazioni sono ipotetiche e a solo scopo illustrativo: non costituiscono una promessa di
                                    rendimento e non includono tasse o costi reali.
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* ==================== SECTION: FUTURE SIMULATOR + LINE ==================== */}
                <MDBRow className="g-3 mb-4">
                    <MDBCol xs="12">
                        <MDBCard className="d-flex flex-column border-0">
                            <div
                                className="p-3 p-md-4"
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                                    <span className="fs-6 fs-md-5 fw-bold text-white">Simulatore interessi composti</span>
                                </div>
                                <small className="text-white-50">
                                    Simulazioni basate sul tuo capitale iniziale, sui tuoi versamenti mensili e su rendimenti annui
                                </small>

                            </div>

                            <MDBCardBody className="p-3 p-md-4">
                                <MDBCard className="mx-0 mx-md-2" style={{ border: "#BEDBFF solid 1px", backgroundColor: "rgb(240, 246, 255)" }}>
                                    <MDBCardBody>
                                        <MDBRow className="align-items-start g-3" style={{ lineHeight: 1.7 }}>
                                            <MDBCol xs="12" md="3">
                                                <div style={{ color: "#21384A", fontWeight: 700 }}>Capitale iniziale</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={capital}
                                                    onChange={(e) => setCapital(e.target.value)}
                                                    style={{ background: "white" }}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="3">
                                                <div style={{ color: "#21384A", fontWeight: 700 }}>Contributo mensile</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={monthly}
                                                    onChange={(e) => setMonthly(e.target.value)}
                                                    style={{ background: "white" }}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="6">
                                                <label className="form-label fw-bold" style={{ color: "#21384A", fontWeight: 700 }}>
                                                    Tipo di obiettivo
                                                </label>
                                                <div className="d-flex flex-wrap align-items-center gap-3">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <MDBCheckbox name="option1" id="option1" checked={options.option1} onChange={handleChange} />
                                                        <label className="mb-0" htmlFor="option1">Capitale</label>
                                                    </div>

                                                    <div className="d-flex align-items-center gap-2">
                                                        <MDBCheckbox name="option2" id="option2" checked={options.option2} onChange={handleChange} />
                                                        <label className="mb-0" htmlFor="option2">Rendita mensile</label>
                                                    </div>

                                                    <div className="d-flex align-items-center gap-2">
                                                        <MDBCheckbox name="option3" id="option3" checked={options.option3} onChange={handleChange} />
                                                        <label className="mb-0" htmlFor="option3">Anni</label>
                                                    </div>
                                                </div>
                                            </MDBCol>

                                            <MDBCol xs="12" md="6">
                                                <div style={{ color: "#21384A", fontWeight: 700 }}>Capitale obiettivo (€)</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={objCapital}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setObjCapital(v);
                                                        if (v && Number(v) > 0) setAutoYears(true);
                                                        else setAutoYears(false);
                                                    }}
                                                    style={{ background: "white" }}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="6">
                                                <label className="form-label fw-bold" style={{ color: "#21384A", fontWeight: 700 }}>
                                                    Orizzonte massimo: {years} anni
                                                </label>
                                                <MDBRange
                                                    min="1"
                                                    max="40"
                                                    value={years}
                                                    onChange={(e) => {
                                                        setYears((e.target as HTMLInputElement).value);
                                                        setAutoYears(false);
                                                        setObjCapital("");
                                                    }}
                                                />
                                            </MDBCol>
                                        </MDBRow>
                                    </MDBCardBody>
                                </MDBCard>

                                <MDBRow className="g-3 mt-1 mb-3">
                                    {[
                                        { title: "Banca / assicurazioni", colorBorder: "danger", pillBg: "#E11D2E", pill: "2% annuo", note: "Obiettivo in circa 19 anni" },
                                        { title: "Autodidatta", colorBorder: "warning", pillBg: "rgb(228 161 25)", pill: "5% annuo", note: "Obiettivo in circa 14 anni" },
                                        { title: "Strategie MIPAI", colorBorder: "success", pillBg: "#007A55", pill: "10% annuo", note: "Obiettivo in circa 11 anni" },
                                    ].map((c) => (
                                        <MDBCol key={c.title} xs="12" md="4" className="d-flex">
                                            <MDBCard
                                                className={`square border border-${c.colorBorder} border-2 bg-opacity-25 bg-${c.colorBorder} w-100`}
                                                style={{ height: isMobile ? "auto" : 120 }}
                                            >
                                                <MDBCardBody className="">
                                                    <MDBTypography
                                                        tag="h6"
                                                        className="mb-2 d-flex flex-sm-row gap-2 align-items-start align-items-center justify-content-between"
                                                    >
                                                        <strong style={{ fontSize: isMobile ? "13px" : "" }}>{c.title}</strong>
                                                        <div
                                                            className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                            style={{
                                                                backgroundColor: c.pillBg,
                                                                color: "white",
                                                                borderRadius: "999px",
                                                                fontSize: "0.75rem",
                                                            }}
                                                        >
                                                            {c.pill}
                                                        </div>
                                                    </MDBTypography>
                                                    <div className="d-flex justify-content-center">
                                                        <small>{c.note}</small>
                                                    </div>
                                                </MDBCardBody>
                                            </MDBCard>
                                        </MDBCol>
                                    ))}
                                </MDBRow>

                                <div className="w-100" style={{ height: isMobile ? 320 : 400 }}>
                                    <ResponsiveLine
                                        data={lineData}

                                        xScale={{ type: "point" }}
                                        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false, reverse: false }}
                                        colors={(serie) => {
                                            if (serie.id === "Strategie MIPAI") return "#007A55";
                                            if (serie.id === "Autodidatta") return "#E4A119";
                                            return "#E11D2E";
                                        }}
                                        lineWidth={2}
                                        pointSize={3}
                                        pointColor={{ theme: "background" }}
                                        pointBorderColor={{ from: "seriesColor" }}
                                        enableArea={true}
                                        areaOpacity={0.05}
                                        enableTouchCrosshair={true}
                                        useMesh={true}
                                        axisBottom={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            legendOffset: 40,
                                            legendPosition: "middle",
                                        }}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            legend: "Capitale (€)",
                                            legendOffset: isMobile ? -38 : -50,
                                            legendPosition: "middle",
                                        }}
                                        legends={[{
                                            anchor: "bottom",
                                            direction: "row",
                                            translateX: 19,
                                            translateY: 55,
                                            itemWidth: 140,
                                            itemHeight: 22,
                                            symbolShape: "circle",
                                        }]}
                                    />
                                </div>

                                <div className="mb-3 mt-3 text-center" style={{ fontSize: 12 }}>
                                    Le simulazioni sono ipotetiche e a solo scopo illustrativo: non costituiscono una promessa di rendimento
                                    e non includono tasse o costi reali.
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* ==================== SECTION: BACKTEST ==================== */}
                <MDBRow className="g-3">
                    <MDBCol xs="12">
                        <MDBCard className="d-flex flex-column border-0">
                            <div
                                className="p-3 p-md-4"
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                                    <span className="fs-6 fs-md-5 fw-bold text-white">Simulatore interessi composti</span>
                                </div>
                                <small className="text-white-50">Gioca con i numeri per costruire il tuo piano: modifica capitale iniziale, contributo e obiettivo.</small>
                            </div>

                            <MDBCardBody className="p-3 p-md-4">
                                <MDBCard className="mx-0 mx-md-2 mb-3" style={{ border: "#BEDBFF solid 1px", backgroundColor: "rgb(240, 246, 255)" }}>
                                    <MDBCardBody>
                                        <MDBRow className="align-items-start g-3">
                                            <MDBCol xs="12" md="3">
                                                <div style={{ color: "#21384A", fontWeight: 700 }}>Capitale iniziale</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={capitalBacktesting}
                                                    onChange={(e) => setCapitalBacktesting(e.target.value)}
                                                    style={{ background: "white" }}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="3">
                                                <div style={{ color: "#21384A", fontWeight: 700 }}>Contributo mensile</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={monthlyBacktesting}
                                                    onChange={(e) => setMonthlyBacktesting(e.target.value)}
                                                    style={{ background: "white" }}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="6">
                                                <label className="form-label fw-bold" style={{ color: "#21384A", fontWeight: 700 }}>
                                                    Orizzonte passato: {pastYears} anni
                                                </label>
                                                <MDBRange
                                                    min="1"
                                                    max="40"
                                                    value={pastYears}
                                                    onChange={(e) => setPastYears((e.target as HTMLInputElement).value)}
                                                />
                                            </MDBCol>
                                        </MDBRow>
                                    </MDBCardBody>
                                </MDBCard>

                                {/* Segmented control */}
                                <div
                                    className="mx-0 mx-md-2"
                                    style={{
                                        display: "flex",
                                        border: "1px solid #e5e7eb",
                                        borderRadius: 999,
                                        backgroundColor: "#ffffff",
                                        overflow: "hidden",
                                    }}
                                >
                                    {[
                                        { key: "tranquilo" as const, label: "Profilo tranquillo" },
                                        { key: "dinamico" as const, label: "Profilo dinamico" },
                                        { key: "ambizioso" as const, label: "Profilo ambizioso" },
                                    ].map((p) => (
                                        <MDBBtn
                                            key={p.key}
                                            color="light"
                                            onClick={() => setPerfil(p.key)}
                                            style={{
                                                flex: 1,
                                                borderRadius: 0,
                                                backgroundColor: perfil === p.key ? "#f3f4f6" : "transparent",
                                                border: "1px solid transparent",
                                                boxShadow: "none",
                                                textTransform: "none",
                                                fontWeight: 500,
                                                color: "#374151",
                                                padding: "10px 12px",
                                            }}
                                        >
                                            {p.label}
                                        </MDBBtn>
                                    ))}
                                </div>

                                {/* Stats cards */}
                                <MDBRow className="mx-0 mx-md-2 g-2" style={{ marginTop: 12 }}>
                                    {stats.map((s) => (
                                        <MDBCol key={s.label} xs="12" sm="6" lg="3">
                                            <MDBCard
                                                style={{
                                                    width: "100%",
                                                    borderRadius: 14,
                                                    border: "1px solid #cfe2ff",
                                                    backgroundColor: "#f2f8ff",
                                                    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                                                }}
                                            >
                                                <MDBCardBody style={{ padding: "14px 16px", textAlign: "center" }}>
                                                    <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4 }}>
                                                        {s.label}
                                                    </div>
                                                    <div style={{ fontSize: 14, color: "#111827", fontWeight: 800 }}>{s.value}</div>
                                                </MDBCardBody>
                                            </MDBCard>
                                        </MDBCol>
                                    ))}
                                </MDBRow>

                                <div className="w-100 mt-3" style={{ height: isMobile ? 320 : 400 }}>
                                    <ResponsiveLine
                                        data={backtestData}

                                        xScale={{ type: "point" }}
                                        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
                                        colors={() => "#155DFC"}
                                        lineWidth={2}
                                        pointSize={3}
                                        pointColor={{ theme: "background" }}
                                        pointBorderColor={{ from: "seriesColor" }}
                                        enableArea={true}
                                        areaOpacity={0.05}
                                        useMesh={true}
                                        axisLeft={{
                                            tickSize: 5,
                                            tickPadding: 5,
                                            legend: "Capitale (€)",
                                            legendOffset: isMobile ? -38 : -50,
                                            legendPosition: "middle",
                                        }}
                                        legends={[
                                            isMobile
                                                ? {
                                                    anchor: "bottom",
                                                    direction: "row",
                                                    translateX: 0,
                                                    translateY: 50,
                                                    itemWidth: 150,
                                                    itemHeight: 18,
                                                    itemsSpacing: 10,
                                                    symbolShape: "circle",
                                                }
                                                : {
                                                    anchor: "bottom",
                                                    direction: "row",
                                                    translateX: 19,
                                                    translateY: 55,
                                                    itemWidth: 180,
                                                    itemHeight: 22,
                                                    symbolShape: "circle",
                                                },
                                        ]}
                                    />
                                </div>

                                <div className="d-flex flex-column align-items-center mt-2">
                                    <div className="mb-3 text-center" style={{ fontSize: 12 }}>
                                        Le simulazioni sono ipotetiche e a solo scopo illustrativo: non costituiscono una promessa di
                                        rendimento e non includono tasse o costi reali.
                                    </div>

                                    <MDBAlert open className="w-100" color="primary" style={{ textAlign: "center" }}>
                                        <span className="text-dark" style={{ fontSize: 14 }}>
                                            <strong>Guadagno stimato con questo profilo:</strong>
                                        </span>
                                        <br />
                                        <strong className="fs-4">
                                            {`+${fmtEUR(backtestSummary.gainEUR)} (${new Intl.NumberFormat("it-IT", {
                                                maximumFractionDigits: 1,
                                            }).format(backtestSummary.gainPct)}%)`}
                                        </strong>
                                    </MDBAlert>

                                    <span className="text-center" style={{ fontSize: 14 }}>
                                        Questa simulazione ti mostra l&apos;effetto del tempo: <strong>iniziare prima fa una grande differenza.</strong>
                                    </span>

                                    <hr className="w-100" />

                                    <span className="text-center" style={{ fontSize: 14 }}>
                                        Le simulazioni sono ipotetiche, basate su rendimenti medi annui e solo a scopo illustrativo. Non
                                        costituiscono una promessa di rendimento e non includono tasse o costi reali.
                                    </span>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>
            </MDBContainer>
        </>
    );
};

export default Dashboard;
