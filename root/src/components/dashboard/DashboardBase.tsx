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
    MDBRadio,
    MDBModal,
    MDBModalDialog,
    MDBModalContent,
    MDBModalHeader,
    MDBModalTitle,
    MDBModalBody,
    MDBModalFooter,
} from "mdb-react-ui-kit";
import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import React, { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate } from "react-router-dom";
import { activateAccountRequest } from "../../auth_module/SingupFunctions";
import { useIsMobile } from "../../app_components/ResponsiveModule";

// qua i presets
import { getPresets, patchPresets } from "../../api_module_v1/PresetDataRequest";

//temporaneo poi sarà spostato
import { buildRecommendations, type PresetData, type Recommendation } from "../../components/dashboard/constant";

interface DashboardProps {
    userName?: string;
    pageName?: string;
}

type Perfil = "tranquilo" | "dinamico" | "ambizioso";
type Stat = { label: string; value: string };

// ======= TIPI NIVO LINE =======
type LinePoint = { x: string; y: number };
type LineSerie = { id: string; data: LinePoint[]; color: string };

// ======= TIPI NIVO PIE =======
type PieData = { id: string; label: string; value: number };

type GoalType = "capital" | "monthly_income" | "years";

// ======= HELPERS =======
const parseNum = (v: string) => {
    const cleaned = String(v).replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
};

const capitalAtTargetYear = (
    P0: number,
    m: number,
    target?: number,     // ✅ opzionale
    annual?: number,     // ✅ opzionale
    maxYears = 40
) => {
    const safeP0 = Number.isFinite(P0) ? P0 : 0;
    const safeM = Number.isFinite(m) ? m : 0;
    const r = typeof annual === "number" && Number.isFinite(annual) ? annual : 0;

    const hasTarget = typeof target === "number" && Number.isFinite(target) && target > 0;

    // se target presente e già raggiunto
    if (hasTarget && safeP0 >= (target as number)) return { years: 1, capital: Math.round(safeP0) };

    let balance = safeP0;

    for (let i = 0; i < maxYears; i++) {
        // anno i: versamenti (12 mesi)
        balance += safeM * 12;

        // interesse dal 2° anno in poi
        if (i >= 1) balance *= 1 + r;

        // se target presente, stop appena raggiunto
        if (hasTarget && balance >= (target as number)) {
            return { years: i + 1, capital: Math.round(balance) };
        }
    }

    // ✅ se target NON presente: ritorna comunque la proiezione a maxYears
    return { years: maxYears, capital: Math.round(balance) };
};

const buildLineSeries = (P0: number, m: number, Y: number): LineSerie[] => {
    const startYear = new Date().getFullYear();

    const scenarios = [
        { id: "Banca / assicurazioni", annual: 0.02, color: "#E11D2E" },
        { id: "Autodidatta", annual: 0.05, color: "#E4A119" },
        { id: "Strategie MIPAI", annual: 0.1, color: "#007A55" },
    ];

    return scenarios.map(({ id, annual, color }) => {
        let balance = P0;
        const data: LinePoint[] = [];

        for (let i = 0; i < Y; i++) {
            balance += m * 12;
            if (i >= 1) balance *= 1 + annual;

            data.push({
                x: String(startYear + i), // ✅ antes: startYear + i + 1
                y: Math.round(balance),
            });
        }

        return { id, color, data };
    });
};
const buildBacktestSeries = (
    P0: number,
    m: number,
    Ypast: number,
    perfis: Perfil[]
): LineSerie[] => {
    const endYear = new Date().getFullYear();
    const startYear = endYear - Ypast;

    // asse X per anni: start+1 ... start+Ypast (come fai già)
    const years = Array.from({ length: Ypast }, (_, i) => String(startYear + i + 1));

    // 1) Versamenti totali (retta)
    const contribData: LinePoint[] = years.map((x, idx) => ({
        x,
        y: Math.round(P0 + m * 12 * (idx + 1)),
    }));

    const series: LineSerie[] = [
        { id: "Versamenti totali", color: "#9CA3AF", data: contribData },
    ];

    const perfilToScenario = (p: Perfil) => {
        if (p === "tranquilo") return { id: "Profilo tranquillo", annual: 0.02, color: "#E11D2E" };
        if (p === "dinamico") return { id: "Profilo dinamico", annual: 0.05, color: "#E4A119" };
        return { id: "Profilo ambizioso", annual: 0.1, color: "#007A55" };
    };

    for (const p of perfis) {
        const { id, annual, color } = perfilToScenario(p);
        const rM = Math.pow(1 + annual, 1 / 12) - 1;

        let balance = P0;
        const data: LinePoint[] = [];

        for (let y = 1; y <= Ypast; y++) {
            for (let month = 0; month < 12; month++) {
                balance += m;
                balance *= 1 + rM;
            }
            data.push({ x: String(startYear + y), y: Math.round(balance) });
        }

        series.push({ id, color, data });
    }

    return series;
};


const lineLegend = [
    { label: "Scenario prudente", color: "#E11D2E" },
    { label: "Proiezione base", color: "#E4A119" },
    { label: "Scenario ottimistico", color: "#007A55" },
];

const DashboardBase: React.FC<DashboardProps> = ({ userName, pageName }) => {
    const isMobile = useIsMobile(992);

    // ✅ “KIT” RESPONSIVE (como tus cards)
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

            // inputs/labels
            label: { color: "#21384A", fontWeight: 700, fontSize: isMobile ? "12px" : "13px" },
            input: { background: "white", fontSize: isMobile ? "13px" : "14px" },

            // alerts
            alertText: { fontSize: isMobile ? "13px" : "14px" },
            alertFine: { fontSize: isMobile ? "12px" : "12px" },
        };
    }, [isMobile]);

    const [activePerfil, setActivePerfil] = useState<Perfil | null>(null);


    const onPerfilClick = (p: Perfil) => {
        setActivePerfil(p);
    };

    const visiblePerfis: Perfil[] = useMemo(() => {
        if (!activePerfil) return [];
        if (activePerfil === "tranquilo") return ["tranquilo"];
        if (activePerfil === "dinamico") return ["tranquilo", "dinamico"];
        return ["tranquilo", "dinamico", "ambizioso"];
    }, [activePerfil]);

    const [invest, setInvest] = useState<number>(0);
    const [changeDetect1, setChangeDetect1] = useState<boolean>(false);
    const [changeDetect2, setChangeDetect2] = useState<boolean>(false);

    const [presetData, setPresetData] = useState<PresetData | null>(null);

    // ✅ dialog / modal stato
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveModalType, setSaveModalType] = useState<"success" | "danger">("success");
    const [saveModalText, setSaveModalText] = useState<string>("Salvato correttamente.");
    const [saving, setSaving] = useState(false);

    const openSaveModal = (type: "success" | "danger", text: string) => {
        setSaveModalType(type);
        setSaveModalText(text);
        setSaveModalOpen(true);
    };

    // ===== Backtest =====
    const [backtestData, setBacktestData] = useState<LineSerie[]>([]);
    const [pastYears, setPastYears] = useState("5");
    const [capitalBacktesting, setCapitalBacktesting] = useState("");
    const [monthlyBacktesting, setMonthlyBacktesting] = useState("");

    const perfilToSeriesId = (p: Perfil | null) => {
        if (p === "tranquilo") return "Profilo tranquillo";
        if (p === "dinamico") return "Profilo dinamico";
        if (p === "ambizioso") return "Profilo ambizioso";
        return null;
    };

    const CustomLinesLayer = ({ series, lineGenerator }: any) => {
        return (
            <g>
                {series.map((s: any) => {
                    const isContrib = s.id === "Versamenti totali";
                    const isActive = false; // lo settiamo dall'esterno con closure (vedi sotto)
                    return (
                        <path
                            key={s.id}
                            d={lineGenerator(s.points)}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={2}
                            strokeOpacity={1}
                        />
                    );
                })}
            </g>
        );
    };

    const activeSeriesId = perfilToSeriesId(activePerfil);

    const LinesLayer = useMemo(() => {
        return ({ series, lineGenerator }: any) => (
            <g>
                {series.map((s: any) => {
                    const isContrib = s.id === "Versamenti totali";
                    const isActive = !!activeSeriesId && s.id === activeSeriesId;

                    const baseOpacity = !activeSeriesId ? 0.9 : 0.55;

                    const strokeOpacity = isContrib ? baseOpacity : isActive ? 1 : 0.25;
                    const strokeWidth =
                        isContrib
                            ? (!activeSeriesId ? 3 : 2)
                            : (isActive ? 3.5 : 2);
                    const dash = undefined;

                    // ✅ Nivo: lineGenerator vuole array di posizioni [x,y]
                    const positions =
                        (s.points?.map((p: any) => p.position)) ??
                        (s.data?.map((d: any) => d.position)) ??
                        [];

                    // ✅ evita crash se per qualche motivo non ci sono punti
                    if (!positions.length) return null;

                    return (
                        <path
                            key={s.id}
                            d={lineGenerator(positions)}
                            fill="none"
                            stroke={s.color}
                            strokeWidth={strokeWidth}
                            strokeOpacity={strokeOpacity}
                            strokeDasharray={dash}
                        />
                    );
                })}
            </g>
        );
    }, [activeSeriesId]);


    const [goalType, setGoalType] = useState<GoalType>("capital");

    useEffect(() => {
        const P0 = parseNum(capitalBacktesting);
        const m = parseNum(monthlyBacktesting);
        const Ypast = Math.max(1, parseInt(pastYears, 10) || 1);

        setBacktestData(buildBacktestSeries(P0, m, Ypast, visiblePerfis));
    }, [capitalBacktesting, monthlyBacktesting, pastYears, visiblePerfis]);

    const backtestSummary = useMemo(() => {
        const yearsN = Math.max(1, parseInt(pastYears, 10) || 1);
        const P0 = parseNum(capitalBacktesting);
        const m = parseNum(monthlyBacktesting);

        const totalVersato = P0 + m * 12 * yearsN;

        const activeId =
            activePerfil === "tranquilo"
                ? "Profilo tranquillo"
                : activePerfil === "dinamico"
                    ? "Profilo dinamico"
                    : activePerfil === "ambizioso"
                        ? "Profilo ambizioso"
                        : "Versamenti totali";

        const serie = backtestData.find((s) => s.id === activeId);
        const lastY = serie?.data?.slice(-1)[0]?.y ?? 0;

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
    const [pipeData, setPipeData] = useState<PieData[]>([]);



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
            { label: "Capitale investito", value: fmtEUR(finalCapital) },
        ];
    }, [pastYears, monthlyBacktesting, capitalBacktesting, backtestData]);

    useEffect(() => {
        if (!autoYears) return;
        console.log(autoYears)
        const P0 = parseNum(capital);
        const m = parseNum(monthly);
        const target = parseNum(objCapital);
        const annual = 0.02;
        const neededYears = capitalAtTargetYear(P0, m, target, annual, 40).years;
        setYears(String(neededYears));
    }, [autoYears, capital, monthly, objCapital, years]);

    useEffect(() => {
        const P0 = parseNum(capital);
        const m = parseNum(monthly);
        const Y = Math.max(1, parseInt(years, 10) || 1);

        setLineData(buildLineSeries(P0, m, Y));
    }, [capital, monthly, years]);

    useEffect(() => {
        const liquidita = Math.max(0, parseNum(capital));
        const investiti = Math.max(0, Number(invest) || 0);

        const next: PieData[] = [
            { id: "Liquidità", label: "Liquidità", value: liquidita },
            { id: "Investiti", label: "Investiti", value: investiti },
        ];

        const safe =
            liquidita + investiti > 0 ? next : [{ id: "Nessun dato", label: "Nessun dato", value: 1 }];

        setPipeData(safe);
    }, [capital, invest]);

    const target = parseNum(objCapital);

    const reachYears = useMemo(() => {
        if (!target || !lineData?.length) return [];

        return lineData
            .map((s) => {
                const hit = s.data.find((p) => p.y >= target);
                return hit ? { id: s.id, year: hit.x } : null;
            })
            .filter(Boolean) as { id: string; year: string }[];
    }, [lineData, objCapital]);

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

                setPresetData(preset.preset_json as PresetData);

                setCapitalBacktesting(preset.preset_json.answers.step_2.available_savings);
                setCapital(preset.preset_json.answers.step_2.available_savings);

                setMonthlyBacktesting(preset.preset_json.answers.step_3.monthly_invest_capacity);
                setMonthly(preset.preset_json.answers.step_3.monthly_invest_capacity);

                setObjCapital(preset.preset_json.answers.step_3.target_capital);
                setAutoYears(true);
                setInvest(preset.preset_json.answers.step_2.invested_capital || 0);

                setYears(preset.preset_json.answers.step_3.target_years)
                setPastYears(preset.preset_json.answers.step_3.target_years)
            })
            .catch((err) => {
                console.log("[PRESETS] fetch error:", err);
            });
    }, []);

    async function savePresetsFuture() {
        try {
            setSaving(true);

            const payload = {
                quiz_version: "1.1",
                patch: {
                    answers: {
                        step_2: {
                            question_uid: "step_2",
                            available_savings: capital,
                        },
                        step_3: {
                            question_uid: "step_3",
                            target_years: years,
                            target_capital: objCapital,
                            monthly_invest_capacity: monthly,
                        },
                    },
                },
            };

            const { response } = await patchPresets(payload);

            if (!response.success) {
                throw new Error(response.message ?? "presets.error");
            }

            setChangeDetect1(false);
            openSaveModal("success", "✅ Salvato correttamente!");
        } catch (e: any) {
            console.log("[PRESETS] patch error:", e);
            openSaveModal("danger", `❌ Errore salvataggio: ${e?.message ?? "presets.error"}`);
        } finally {
            setSaving(false);
        }
    }

    async function savePresetsBacktesting() {
        try {
            setSaving(true);

            const payload = {
                quiz_version: "1.1",
                patch: {
                    answers: {
                        step_2: {
                            question_uid: "step_2",
                            available_savings: capitalBacktesting,
                        },
                        step_3: {
                            question_uid: "step_3",
                            target_years: pastYears,
                            monthly_invest_capacity: monthlyBacktesting,
                        },
                    },
                },
            };

            const { response } = await patchPresets(payload);

            if (!response.success) {
                throw new Error(response.message ?? "presets.error");
            }

       
            setChangeDetect2(false);
            openSaveModal("success", "✅ Salvato correttamente!");
        } catch (e: any) {
            console.log("[PRESETS] patch error:", e);
            openSaveModal("danger", `❌ Errore salvataggio: ${e?.message ?? "presets.error"}`);
        } finally {
            setSaving(false);
        }
    }

    const recommendations: Recommendation[] = useMemo(() => {
        return buildRecommendations(presetData);
    }, [presetData]);

    const recCount = recommendations.length;

    const pieDataWithPct = useMemo(() => {
        const total = pipeData.reduce((s, d) => s + (Number(d.value) || 0), 0);

        return pipeData.map((d) => {
            const pct = total > 0 ? (Number(d.value) / total) * 100 : 0;

            return {
                ...d,
                label: `${d.label} ${Math.round(pct)}%`,
            };
        });
    }, [pipeData]);

    return (
        <>
            {/* ✅ DIALOG SALVATAGGIO */}
            <MDBModal open={saveModalOpen} setOpen={setSaveModalOpen} tabIndex="-1">
                <MDBModalDialog centered>
                    <MDBModalContent>
                        <MDBModalHeader
                            className={
                                saveModalType === "success"
                                    ? "bg-success text-white"
                                    : "bg-danger text-white"
                            }
                        >
                            <MDBModalTitle style={ui.hSection}>
                                {saveModalType === "success" ? "Salvataggio" : "Errore"}
                            </MDBModalTitle>
                            <MDBBtn
                                className="btn-close btn-close-white"
                                color="none"
                                onClick={() => setSaveModalOpen(false)}
                            />
                        </MDBModalHeader>

                        <MDBModalBody>
                            <div style={{ fontSize: isMobile ? 13 : 15 }}>{saveModalText}</div>
                        </MDBModalBody>

                        <MDBModalFooter>
                            <MDBBtn
                                color={saveModalType === "success" ? "success" : "danger"}
                                onClick={() => setSaveModalOpen(false)}
                                style={{ fontSize: isMobile ? 13 : 14 }}
                            >
                                OK
                            </MDBBtn>
                        </MDBModalFooter>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>

            {banner && (
                <MDBContainer>
                    <div
                        className={`alert alert-${banner.type === "success" ? "success" : "danger"} mb-0`}
                        style={ui.textBody}
                    >
                        {banner.text}
                    </div>
                </MDBContainer>
            )}

            <MDBContainer fluid className="py-3 py-md-2 px-0">
                <MDBRow className="align-items-stretch g-3">
                    <div className="">
                        <div className="d-flex flex-row align-items-center mb-2">
                            <span className="fs-4 fw-bold text-dark">
                                Check-up Finanziario
                            </span>
                        </div>
                        <div className="d-flex">
                            <span className="text-muted fs-6 mb-2">
                                Panoramica dei tuoi investimenti e portafogli
                            </span>
                        </div>
                    </div>
                </MDBRow>
                <MDBRow className="g-3 mb-4 align-items-stretch">
                    {/* ==================== LEFT ==================== */}
                    <MDBCol xs="12" lg="4" className="d-flex">
                        <div className="d-flex flex-column gap-3 w-100 h-100">
                            {/* Card 1 */}
                            <MDBCard className="shadow-sm rounded-4 flex-fill">
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
                                        <MDBIcon fas icon="chart-line" className="me-2 fs-5 text-white" />
                                        <span className="fw-bold" style={ui.hSection}>
                                            Patrimonio totale
                                        </span>
                                    </div>
                                    <small className="text-white-50" style={ui.subSection}>
                                        Situazione attuale dei tuoi assets
                                    </small>
                                </div>

                                <MDBCardBody className={ui.bodyPadClass}>
                                    <MDBTypography
                                        tag="h3"
                                        className="fw-bold mb-3 mb-md-4"
                                        style={ui.numberBig}
                                    >
                                        {Number(capital) + Number(invest)} €
                                    </MDBTypography>

                                    <div className="d-flex flex-row gap-3">
                                        <div
                                            className="flex-fill rounded-3 p-3"
                                            style={{ backgroundColor: "#FFF7E6", border: "1px solid #FFE2A8" }}
                                        >
                                            <small className="text-warning fw-semibold" style={ui.textSmall}>
                                                Liquidità
                                            </small>
                                            <div className="fw-bold mt-1" style={ui.textBody}>
                                                {capital} €
                                            </div>
                                        </div>

                                        <div
                                            className="flex-fill rounded-3 p-3"
                                            style={{ backgroundColor: "#EEF5FF", border: "1px solid #D6E6FF" }}
                                        >
                                            <small className="text-primary fw-semibold" style={ui.textSmall}>
                                                Investiti
                                            </small>
                                            <div className="fw-bold mt-1" style={ui.textBody}>
                                                {invest} €
                                            </div>
                                        </div>
                                    </div>
                                </MDBCardBody>
                            </MDBCard>

                            {/* Card 2 (Pie) */}
                            <MDBCard className="shadow-sm rounded-4">
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
                                        <MDBIcon fas icon="chart-pie" className="me-2 fs-5 text-white" />
                                        <span className="fw-bold" style={ui.hSection}>
                                            Distribuzione patrimonio
                                        </span>
                                    </div>
                                    <small className="text-white-50" style={ui.subSection}>
                                        Situazione attuale dei tuoi assets
                                    </small>
                                </div>

                                <MDBCardBody className={ui.bodyPadClass}>
                                    <div className="w-100" style={{ height: isMobile ? 220 : 180 }}>
                                        <ResponsivePie
                                            data={pieDataWithPct}
                                            margin={
                                                isMobile
                                                    ? { top: 10, right: 10, bottom: 60, left: 10 }
                                                    : { top: 15, right: 10, bottom: 60, left: 10 }
                                            }
                                            innerRadius={0.8}
                                            activeOuterRadiusOffset={8}
                                            borderColor={{ from: "color", modifiers: [["darker", 0.9]] }}

                                            enableArcLabels={false}
                                            enableArcLinkLabels={false}

                                            legends={[
                                                {
                                                    anchor: "bottom",
                                                    direction: "row",
                                                    translateY: 50,
                                                    itemWidth: 120,
                                                    itemHeight: 18,
                                                    itemsSpacing: 10,
                                                    symbolSize: 10,
                                                    symbolShape: "circle",
                                                },
                                            ]}
                                        />
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </div>
                    </MDBCol>

                    {/* ==================== RIGHT ==================== */}
                    <MDBCol xs="12" lg="8" className="d-flex">
                        <MDBCard className="d-flex flex-column border-0 w-100 h-100" style={{ overflow: "hidden" }}>
                            <div
                                className={ui.headerPadClass}
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.75rem",
                                    borderTopLeftRadius: "0.75rem",
                                }}
                            >
                                <div className="d-flex align-items-center justify-content-between gap-3">
                                    {/* SINISTRA: titolo + sottotitolo */}
                                    <div>
                                        <div className="d-flex align-items-center">
                                            <MDBIcon fas icon="lightbulb" className="me-2 fs-4 text-white" />
                                            <span className="fw-bold text-white" style={ui.hSection}>
                                                Punti critici da migliorare
                                            </span>
                                        </div>
                                        <small className="text-white-50" style={ui.subSection}>
                                            Aspetti su cui intervenire
                                        </small>
                                    </div>

                                    {/* DESTRA: pill */}
                                    <span
                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold flex-shrink-0"
                                        style={{
                                            backgroundColor: "rgba(255,255,255,0.15)",
                                            color: "white",
                                            borderRadius: 999,
                                            fontSize: isMobile ? "10px" : "0.75rem",
                                            border: "1px solid rgba(255,255,255,0.25)",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {recCount} {recCount === 1 ? "raccomandazione" : "raccomandazioni"}
                                    </span>
                                </div>
                            </div>

                            <MDBCardBody
                                className={ui.bodyPadClass}
                                style={{ overflowY: isMobile ? "visible" : "auto" }}
                            >
                                {recommendations.length === 0 && (
                                    <div className="text-muted" style={ui.textBody}>
                                        Nessuna raccomandazione al momento.
                                    </div>
                                )}
                                {recommendations.map((rec) => {
                                    const isDanger = rec.level === "danger";

                                    return (
                                        <div
                                            key={rec.id}
                                            className={`d-flex align-items-start align-items-md-center border rounded-4 p-3 gap-3 mb-3 border-2 ${isDanger ? "border-danger" : "border-warning"
                                                }`}
                                        >
                                            <MDBIcon
                                                className="flex-shrink-0"
                                                fas
                                                icon={isDanger ? "exclamation-triangle" : "exclamation-circle"}
                                                style={{
                                                    backgroundColor: isDanger ? "#DC262633" : "#FE9A0033",
                                                    padding: "12px",
                                                    color: isDanger ? "#DC2626" : "#FE9A00",
                                                    borderRadius: "10px",
                                                }}
                                            />

                                            <div style={{ lineHeight: 1.35 }}>
                                                {/* opzionale ma consigliato */}
                                                <div className="fw-bold mb-1" style={{ color: "#111827", fontSize: isMobile ? 13 : 14 }}>
                                                    {rec.title}
                                                </div>

                                                <div className="text-muted" style={ui.textBody}>
                                                    {rec.text}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* ==================== SECTION: TIME TO TARGET ==================== */}
                <MDBRow className="g-3 mb-4">
                    <MDBCol xs="12">
                        <MDBCard className="d-flex flex-column border-0">
                            <div
                                className={ui.headerPadClass}
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                }}
                            >
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                                    <span className="fw-bold text-white" style={ui.hSection}>
                                        In quanto tempo puoi raggiungere il tuo obiettivo?
                                    </span>
                                </div>
                                <small className="text-white-50" style={ui.subSection}>
                                    Simulazioni basate sul tuo capitale iniziale, sui tuoi versamenti mensili e su rendimenti annui ipotetici.
                                </small>
                            </div>

                            <MDBCardBody className={ui.bodyPadClass}>
                                <MDBRow className="g-3 mb-4">
                                    <MDBCol xs="12" md="12" lg="6" xl="4" className="d-flex">
                                        <MDBCard className="square border border-danger border-2 bg-opacity-25 bg-danger w-100">
                                            <MDBCardBody className="">
                                                <MDBTypography
                                                    tag="h6"
                                                    className="mb-sm-3 d-flex flex-sm-row gap-2 align-items-start align-items-center justify-content-between"
                                                >
                                                    <strong style={{ fontSize: isMobile ? "13px" : "" }}>Banca / assicurazioni</strong>
                                                    <div
                                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                        style={{
                                                            backgroundColor: "#E11D2E",
                                                            color: "white",
                                                            borderRadius: "999px",
                                                            fontSize: isMobile ? "10px" : "0.75rem"
                                                        }}
                                                    >
                                                        2% annuo
                                                    </div>
                                                </MDBTypography>

                                                <MDBTypography
                                                    style={{ fontSize: isMobile ? "13px" : "0.75rem" }}
                                                    className="fw-bold text-danger mb-sm-3 mb-1">
                                                    <MDBIcon far icon="clock" className="me-2" />
                                                    {capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.02, Number(years)).years} anni
                                                </MDBTypography>

                                                <small
                                                    style={{ fontSize: isMobile ? "12px" : "" }}
                                                >
                                                    Con i numeri di oggi, con questo rendimento raggiungeresti il tuo obiettivo in circa 19 anni.
                                                </small>
                                            </MDBCardBody>

                                            <MDBCardFooter style={{ borderTop: "white solid 1px" }}>
                                                <MDBTypography style={{ fontSize: isMobile ? "13px" : "" }} className="m-0">
                                                    Capitale stimato: {capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.02, Number(years)).capital} €
                                                </MDBTypography>
                                            </MDBCardFooter>
                                        </MDBCard>
                                    </MDBCol>
                                    <MDBCol xs="12" md="12" lg="6" xl="4" className="d-flex">
                                        <MDBCard className="square border border-warning border-2 bg-opacity-25 bg-warning w-100">
                                            <MDBCardBody className="">
                                                <MDBTypography
                                                    tag="h6"
                                                    className="mb-sm-3 d-flex flex-sm-row gap-2 align-items-start align-items-center justify-content-between"
                                                >
                                                    <strong style={ui.hCardTitle}>Autodidatta</strong>
                                                    <div
                                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                        style={{
                                                            backgroundColor: "rgb(228 161 25)",
                                                            color: "white",
                                                            borderRadius: "999px",
                                                            ...ui.pill,
                                                        }}
                                                    >
                                                        5% annuo
                                                    </div>
                                                </MDBTypography>

                                                <MDBTypography
                                                    style={{ fontSize: isMobile ? "13px" : "0.75rem" }}
                                                    className="fw-bold text-warning mb-sm-3 mb-1"
                                                >
                                                    <MDBIcon far icon="clock" className="me-2" />
                                                    {capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.05, Number(years)).years} anni
                                                </MDBTypography>

                                                <small style={ui.textSmall}>
                                                    Studiando e investendo da autodidatta, un rendimento medio del 5% annuo riduce i tempi di molto.
                                                </small>
                                            </MDBCardBody>

                                            <MDBCardFooter style={{ borderTop: "white solid 1px" }}>
                                                <MDBTypography style={ui.hCardTitle} className="m-0">
                                                    Capitale stimato: {capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.05, Number(years)).capital} €
                                                </MDBTypography>
                                            </MDBCardFooter>
                                        </MDBCard>
                                    </MDBCol>

                                    <MDBCol xs="12" md="12" lg="12" xl="4" className="d-flex">
                                        <MDBCard className="square border border-success border-2 bg-opacity-25 bg-success w-100">
                                            <MDBCardBody className="">
                                                <MDBTypography
                                                    tag="h6"
                                                    className="mb-sm-3 d-flex flex-sm-row gap-2 align-items-start align-items-center justify-content-between"
                                                >
                                                    <strong style={ui.hCardTitle}>Strategie MIPAI</strong>
                                                    <div
                                                        className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                        style={{
                                                            backgroundColor: "#007A55",
                                                            color: "white",
                                                            borderRadius: "999px",
                                                            ...ui.pill,
                                                        }}
                                                    >
                                                        10% annuo
                                                    </div>
                                                </MDBTypography>

                                                <MDBTypography
                                                    style={{ fontSize: isMobile ? "13px" : "0.75rem" }}
                                                    className="fw-bold text-success mb-sm-3 mb-1"
                                                >
                                                    <MDBIcon far icon="clock" className="me-2" />
                                                    {capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.10, Number(years)).years} anni
                                                </MDBTypography>

                                                <small style={ui.textSmall}>
                                                    Con un piano strutturato e strategie MIPAI, un rendimento medio del 10% annuo accelera ulteriormente il percorso.
                                                </small>
                                            </MDBCardBody>

                                            <MDBCardFooter style={{ borderTop: "white solid 1px" }}>
                                                <MDBTypography style={ui.hCardTitle} className="m-0">
                                                    Capitale stimato: {capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.10, Number(years)).capital} €
                                                </MDBTypography>
                                            </MDBCardFooter>
                                        </MDBCard>
                                    </MDBCol>
                                </MDBRow>

                                <MDBAlert open className="w-100" color="primary" style={ui.alertText}>
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

                                <div className="text-muted text-center" style={ui.alertFine}>
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
                                className={`${ui.headerPadClass} d-flex justify-content-between align-items-center`}
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div className="d-flex align-items-center">
                                        <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                                        <span className="fw-bold text-white" style={ui.hSection}>
                                            Simulatore interessi composti
                                        </span>
                                    </div>
                                    <small className="text-white-50" style={ui.subSection}>
                                        Simulazioni basate sul tuo capitale iniziale, sui tuoi versamenti mensili e su rendimenti annui
                                    </small>
                                </div>

                                {changeDetect1 && (
                                    <MDBBtn
                                        onClick={() => savePresetsFuture()}
                                        className="me-1"
                                        color="success"
                                        disabled={saving}
                                        style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? "8px 10px" : "" }}
                                    >
                                        <MDBIcon className="me-2" far icon="save" />
                                        {!isMobile && (saving ? "salvando..." : "salva")}
                                    </MDBBtn>
                                )}
                            </div>

                            <MDBCardBody className={ui.bodyPadClass}>
                                <MDBCard
                                    className="mx-0 "
                                    style={{ border: "#BEDBFF solid 1px", backgroundColor: "rgb(240, 246, 255)" }}
                                >
                                    <MDBCardBody>
                                        <MDBRow className="g-4" style={{ lineHeight: 1.7 }}>
                                            {/* ================= LEFT COLUMN ================= */}
                                            <MDBCol xs="12" md="7">
                                                <MDBRow className="g-3">
                                                    <MDBCol xs="12">
                                                        <div style={ui.label}>Capitale iniziale</div>
                                                        <MDBInput
                                                            type="number"
                                                            value={capital}
                                                            onChange={(e) => {
                                                                setCapital(e.target.value);
                                                                setChangeDetect1(true);
                                                            }}
                                                            style={ui.input}
                                                        />
                                                    </MDBCol>

                                                    <MDBCol xs="12">
                                                        <div style={ui.label}>Contributo mensile</div>
                                                        <MDBInput
                                                            type="number"
                                                            value={monthly}
                                                            onChange={(e) => {
                                                                setMonthly(e.target.value);
                                                                setChangeDetect1(true);
                                                            }}
                                                            style={ui.input}
                                                        />
                                                    </MDBCol>

                                                    <MDBCol xs="12">
                                                        <div style={ui.label}>Capitale obiettivo (€)</div>
                                                        <MDBInput
                                                            type="number"
                                                            value={objCapital}
                                                            onChange={(e) => {
                                                                const v = e.target.value;
                                                                setObjCapital(v);
                                                                setChangeDetect1(true);
                                                                if (v && Number(v) > 0) setAutoYears(true);
                                                                else setAutoYears(false);
                                                            }}
                                                            style={ui.input}
                                                        />
                                                    </MDBCol>
                                                </MDBRow>
                                            </MDBCol>

                                            {/* ================= RIGHT COLUMN ================= */}
                                            <MDBCol xs="12" md="5">
                                                {/* Tipo di obiettivo */}
                                                <div style={ui.label}>Tipo di obiettivo</div>

                                                <div className="d-flex flex-wrap gap-3 mt-1 mb-4">
                                                    <MDBRadio
                                                        name="goalType"
                                                        id="goalType-capital"
                                                        label="Capitale"
                                                        checked={goalType === "capital"}
                                                        onChange={() => setGoalType("capital")}
                                                    />

                                                    <MDBRadio
                                                        name="goalType"
                                                        id="goalType-income"
                                                        label="Rendita mensile"
                                                        checked={goalType === "monthly_income"}
                                                        onChange={() => setGoalType("monthly_income")}
                                                    />

                                                    <MDBRadio
                                                        name="goalType"
                                                        id="goalType-years"
                                                        label="Crescita nel tempo"
                                                        checked={goalType === "years"}
                                                        onChange={() => setGoalType("years")}
                                                    />
                                                </div>


                                                {/* Orizzonte massimo */}
                                                <label className="form-label fw-bold" style={ui.label}>
                                                    Orizzonte massimo: {years} anni
                                                </label>

                                                <MDBRange
                                                    min="1"
                                                    max="40"
                                                    value={years}
                                                    onChange={(e) => {
                                                        setYears((e.target as HTMLInputElement).value);
                                                        setChangeDetect1(true);
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
                                        {
                                            title: "Banca / assicurazioni",
                                            colorBorder: "danger",
                                            pillBg: "#E11D2E",
                                            pill: "2% annuo",
                                            note: "Obiettivo in circa",
                                            note_lt: "19 anni",
                                            neededYears: capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.02, 40).years,
                                        },
                                        {
                                            title: "Autodidatta",
                                            colorBorder: "warning",
                                            pillBg: "rgb(228 161 25)",
                                            pill: "5% annuo",
                                            note: "Obiettivo in circa",
                                            note_lt: "14 anni",
                                            neededYears: capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.05, 40).years,
                                        },
                                        {
                                            title: "Strategie MIPAI",
                                            colorBorder: "success",
                                            pillBg: "#007A55",
                                            pill: "10% annuo",
                                            note: "Obiettivo in circa",
                                            note_lt: "11 anni",
                                            neededYears: capitalAtTargetYear(parseNum(capital), parseNum(monthly), target, 0.10, 40).years,
                                        },
                                    ].map((c) => (
                                        <MDBCol key={c.title} className="d-flex col-4 col-md-6 col-lg-6 col-xl-4">
                                            <MDBCard
                                                className={`square border border-${c.colorBorder} border-2 bg-opacity-25 bg-${c.colorBorder} w-100  hover-shadow`}
                                                style={{ height: isMobile ? "auto" : 120 }}
                                            >
                                                <MDBCardBody className={(isMobile && "d-flex flex-column justify-content-around align-items-center p-2 ") + ""}>
                                                    <MDBTypography
                                                        tag="h6"
                                                        className="mb-sm-3 gap-2 d-flex flex-sm-row align-items-start align-items-center justify-content-between"
                                                    >
                                                        <strong className={(isMobile && "text-center") + ''} style={ui.hCardTitle}>{c.title}</strong>
                                                        {!isMobile && <div
                                                            className="d-inline-flex align-items-center px-3 py-1 fw-semibold"
                                                            style={{
                                                                backgroundColor: c.pillBg,
                                                                color: "white",
                                                                borderRadius: "999px",
                                                                ...ui.pill,
                                                            }}
                                                        >
                                                            {c.pill}
                                                        </div>}
                                                    </MDBTypography>

                                                    {objCapital !== "" ? (
                                                        <div className="d-flex flex-column justify-content-lg-center justify-content-start align-items-center">
                                                            {isMobile ? (
                                                                <small style={ui.textSmall}>{c.note_lt} {c.neededYears} anni</small>
                                                            ) : (
                                                                <small style={ui.textSmall}>{c.note} {c.neededYears} anni</small>
                                                            )}
                                                            {isMobile && <small style={ui.textSmall}>{c.pill}</small>}
                                                        </div>
                                                    ) : (
                                                        <div className="d-flex flex-column justify-content-lg-center justify-content-start align-items-center">
                                                            <small style={ui.textSmall}>{c.note} {years} anni</small>
                                                        </div>
                                                    )}
                                                </MDBCardBody>
                                            </MDBCard>
                                        </MDBCol>
                                    ))}
                                </MDBRow>

                                <div className="w-100" style={{ height: isMobile ? 320 : 400 }}>
                                    <ResponsiveLine
                                        data={lineData}
                                        margin={{ top: 20, right: 20, bottom: isMobile ? 70 : 80, left: 45 }}
                                        xScale={{ type: "point" }}
                                        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false, reverse: false }}
                                        colors={(serie) => {
                                            if (serie.id === "Strategie MIPAI") return "#007A55";
                                            if (serie.id === "Autodidatta") return "#E4A119";
                                            return "#E11D2E";
                                        }}
                                        useMesh={true}
                                        enableTouchCrosshair={true}
                                        enableSlices="x"
                                        pointSize={isMobile ? 3 : 4}
                                        pointColor={{ theme: "background" }}
                                        pointBorderColor={{ from: "seriesColor" }}
                                        animate={true}
                                        motionConfig="gentle"
                                        markers={[
                                            ...(target
                                                ? [
                                                    {
                                                        axis: "x" as const,
                                                        value: target,
                                                        lineStyle: { strokeWidth: 1, strokeDasharray: "6 6" },
                                                    },
                                                ]
                                                : []),
                                            ...reachYears.map((r) => ({
                                                axis: "x" as const,
                                                value: r.year,
                                                lineStyle: {
                                                    strokeWidth: 2,
                                                    strokeDasharray: "4 4",
                                                    stroke:
                                                        r.id === "Strategie MIPAI"
                                                            ? "#007A55"
                                                            : r.id === "Autodidatta"
                                                                ? "#E4A119"
                                                                : "#E11D2E",
                                                },
                                                legendPosition: "bottom" as const,
                                            })),
                                        ]}
                                    />

                                </div>
                                <div
                                    className="d-flex justify-content-center flex-wrap gap-4 mt-3"
                                    style={{ rowGap: 8 }}
                                >
                                    {lineLegend.map((item) => (
                                        <div
                                            key={item.label}
                                            className="d-flex align-items-center gap-2"
                                            style={{ fontSize: isMobile ? 12 : 13 }}
                                        >
                                            <span
                                                style={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: "50%",
                                                    backgroundColor: item.color,
                                                    display: "inline-block",
                                                }}
                                            />
                                            <span className="text-muted">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mb-3 mt-3 text-center" style={ui.alertFine}>
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
                                className={`${ui.headerPadClass} d-flex justify-content-between align-items-center`}
                                style={{
                                    backgroundColor: "rgb(38, 53, 80)",
                                    color: "white",
                                    borderTopRightRadius: "0.5rem",
                                    borderTopLeftRadius: "0.5rem",
                                    gap: 12,
                                }}
                            >
                                <div>
                                    <div className="d-flex align-items-center">
                                        <MDBIcon fas icon="chart-line" className="me-2 fs-4 text-white" />
                                        <span className="fw-bold text-white" style={ui.hSection}>
                                            Simulatore interessi composti
                                        </span>
                                    </div>
                                    <small className="text-white-50" style={ui.subSection}>
                                        Gioca con i numeri per costruire il tuo piano: modifica capitale iniziale, contributo e obiettivo.
                                    </small>
                                </div>

                                {changeDetect2 && (
                                    <MDBBtn
                                        onClick={() => savePresetsBacktesting()}
                                        className="me-1"
                                        color="success"
                                        disabled={saving}
                                        style={{ fontSize: isMobile ? 12 : 14, padding: isMobile ? "8px 10px" : "" }}
                                    >
                                        <MDBIcon className="me-2" far icon="save" />
                                        {!isMobile && (saving ? "salvando..." : "salva")}
                                    </MDBBtn>
                                )}
                            </div>

                            <MDBCardBody className={ui.bodyPadClass}>
                                <MDBCard
                                    className="mx-0 mx-md-2 mb-3"
                                    style={{ border: "#BEDBFF solid 1px", backgroundColor: "rgb(240, 246, 255)" }}
                                >
                                    <MDBCardBody>
                                        <MDBRow className="align-items-start g-3">
                                            <MDBCol xs="12" md="3">
                                                <div style={ui.label}>Capitale iniziale</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={capitalBacktesting}
                                                    onChange={(e) => {
                                                        setCapitalBacktesting(e.target.value);
                                                        setChangeDetect2(true);
                                                    }}
                                                    style={ui.input}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="3">
                                                <div style={ui.label}>Contributo mensile</div>
                                                <MDBInput
                                                    label=""
                                                    type="number"
                                                    value={monthlyBacktesting}
                                                    onChange={(e) => {
                                                        setMonthlyBacktesting(e.target.value);
                                                        setChangeDetect2(true);
                                                    }}
                                                    style={ui.input}
                                                />
                                            </MDBCol>

                                            <MDBCol xs="12" md="6">
                                                <label className="form-label fw-bold" style={ui.label}>
                                                    Orizzonte passato: {pastYears} anni
                                                </label>
                                                <MDBRange
                                                    min="1"
                                                    max="40"
                                                    value={pastYears}
                                                    onChange={(e) => {
                                                        setPastYears((e.target as HTMLInputElement).value);
                                                        setChangeDetect2(true);
                                                    }}
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
                                            onClick={() => onPerfilClick(p.key)}
                                            style={{
                                                flex: 1,
                                                borderRadius: 0,
                                                backgroundColor: activePerfil === p.key ? "#f3f4f6" : "transparent",
                                                border: "1px solid transparent",
                                                boxShadow: "none",
                                                textTransform: "none",
                                                fontWeight: 500,
                                                color: "#374151",
                                                padding: isMobile ? "8px 10px" : "10px 12px",
                                                fontSize: isMobile ? 11 : 13,
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
                                                <MDBCardBody style={{ padding: isMobile ? "12px 12px" : "14px 16px", textAlign: "center" }}>
                                                    <div
                                                        style={{
                                                            fontSize: isMobile ? 11 : 12,
                                                            color: "#6b7280",
                                                            fontWeight: 600,
                                                            marginBottom: 4,
                                                        }}
                                                    >
                                                        {s.label}
                                                    </div>
                                                    <div style={{ fontSize: isMobile ? 13 : 14, color: "#111827", fontWeight: 800 }}>
                                                        {s.value}
                                                    </div>
                                                </MDBCardBody>
                                            </MDBCard>
                                        </MDBCol>
                                    ))}
                                </MDBRow>

                                <div className="w-100 mt-3" style={{ height: isMobile ? 320 : 400 }}>
                                    <ResponsiveLine
                                        data={backtestData}
                                        margin={{ top: 20, right: 20, bottom: isMobile ? 90 : 100, left: 50 }}
                                        xScale={{ type: "point" }}
                                        yScale={{ type: "linear", min: "auto", max: "auto", stacked: false }}
                                        colors={(serie) => (serie as any).color}
                                        lineWidth={2}
                                        enableArea={false}
                                        pointSize={isMobile ? 2.5 : 3}
                                        pointColor={{ theme: "background" }}
                                        pointBorderColor={{ from: "seriesColor" }}
                                        useMesh={true}
                                        enableSlices="x"
                                        layers={[
                                            "grid",
                                            "markers",
                                            "axes",
                                            LinesLayer,
                                            "points",
                                            "slices",
                                            "mesh",
                                            "legends",
                                        ]}
                                        legends={[
                                            {
                                                anchor: "bottom",
                                                direction: "row",
                                                translateY: 60,
                                                itemWidth: 160,
                                                itemHeight: 18,
                                                itemsSpacing: 10,
                                                symbolSize: 10,
                                                symbolShape: "circle",
                                            },
                                        ]}
                                    />
                                </div>

                                <div className="d-flex flex-column align-items-center mt-2">
                                    <div className="mb-3 text-center" style={ui.alertFine}>
                                        Le simulazioni sono ipotetiche e a solo scopo illustrativo: non costituiscono una promessa di
                                        rendimento e non includono tasse o costi reali.
                                    </div>

                                    <MDBAlert open className="w-100" color="primary" style={{ textAlign: "center" }}>
                                        <span className="text-dark" style={ui.alertText}>
                                            <strong>Guadagno stimato con questo profilo:</strong>
                                        </span>
                                        <br />
                                        <strong style={{ fontSize: isMobile ? "1.25rem" : "1.5rem" }}>
                                            {`+${fmtEUR(backtestSummary.gainEUR)} (${new Intl.NumberFormat("it-IT", {
                                                maximumFractionDigits: 1,
                                            }).format(backtestSummary.gainPct)}%)`}
                                        </strong>
                                    </MDBAlert>

                                    <span className="text-center" style={ui.textBody}>
                                        Questa simulazione ti mostra l&apos;effetto del tempo:{" "}
                                        <strong>iniziare prima fa una grande differenza.</strong>
                                    </span>

                                    <hr className="w-100" />

                                    <span className="text-center" style={ui.textBody}>
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

export default DashboardBase;
