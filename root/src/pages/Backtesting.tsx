import React, { useEffect, useMemo, useState } from "react";
import {
    MDBBadge,
    MDBBtn,
    MDBCard,
    MDBCardBody,
    MDBCardFooter,
    MDBCardTitle,
    MDBCol,
    MDBContainer,
    MDBIcon,
    MDBModal,
    MDBModalBody,
    MDBModalContent,
    MDBModalDialog,
    MDBModalHeader,
    MDBModalTitle,
    MDBRow,
} from "mdb-react-ui-kit";
import { useNavigate } from "react-router-dom";

import { useIsMobile } from "../app_components/ResponsiveModule";
import { backtestingsList } from "../components/backtesting/contans";
import type { BacktestWithAssets } from "../components/backtesting/contans";

import { BacktestingInfo, BacktestingAsset } from '../api_module/backtesting/constants';

import { create_backtesting, get_backtestingsListPaginated } from "../api_module/backtesting/BacktestingData";
import { General_Loading } from '../app_components/General_Loading';
import { GeneralForm, FieldConfig } from "../app_components/GeneralForm";
import { getUserInfo, APIUserInfo } from "../api_module_v1/UserRequest"



type BacktestingInfoLite = Omit<
    BacktestingInfo,
    "backtesting_uid" | "status" | "created_at" | "updated_at" | "assets"
>;


/** ==================== SMALL COMPONENT ==================== */
function PortfolioCard({
    ui,
    isMobile,
    title,
    riskLabel,
    riskColor,
    icon,
    border,
    bg,
    rendimento,
    ctaColor,
    desc,
}: {
    ui: any;
    isMobile: boolean;
    title: string;
    riskLabel: string;
    riskColor: "success" | "danger" | "warning" | "primary" | "secondary" | "info" | "light" | "dark";
    icon: string;
    border: string;
    bg: string;
    rendimento: string;
    ctaColor: "success" | "danger" | "warning" | "primary" | "secondary" | "info" | "light" | "dark";
    desc: string;
}) {
    return (
        <MDBCard
            className="shadow-sm rounded-4 h-100"
            style={{
                border: `1px solid ${border}`,
                backgroundColor: bg,
            }}
        >
            <MDBCardBody className={isMobile ? "p-3" : "p-3 p-md-4"}>
                <MDBCardTitle className="d-flex align-items-center justify-content-between mb-3" style={ui.textBody}>
                    <div className="fw-bold" style={ui.hCardTitle}>
                        {title}
                    </div>

                    <MDBBadge pill color={riskColor} className="px-2 py-2" style={ui.pill}>
                        <MDBIcon fas icon={icon} className="me-1" />
                        {riskLabel}
                    </MDBBadge>
                </MDBCardTitle>

                <div className="text-muted" style={ui.textSmall}>
                    {desc}
                </div>
            </MDBCardBody>

            <MDBCardFooter className="pt-0 pb-3 px-3 px-md-4" style={{ border: "none" }}>
                <div className="small" style={ui.textSmall}>
                    Rendimento
                </div>

                <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-bold" style={{ fontSize: isMobile ? 18 : 22 }}>
                        {rendimento}
                    </span>

                    <MDBBtn className={`text-${ctaColor}`} color="light" style={{ fontSize: isMobile ? 11 : 12, borderRadius: 12 }}>
                        VEDI DETTAGLI
                    </MDBBtn>
                </div>
            </MDBCardFooter>
        </MDBCard>
    );
}


const Portfolio_FormFields: FieldConfig<BacktestingInfoLite>[] = [

    { name: "title", type: "text", label: "Titolo", required: true, grid: { md: 12 } },
    // { name: "description", type: "text_area", label: "Descrizione", required: true, grid: { md: 12 } },
    { name: "target", type: "number", label: "Obiettivo", required: true, grid: { md: 4 } },
    // { name: "time_horizon_years", type: "number", label: "Orizzonte Temporale (anni)", required: true, grid: { md: 6 }, visible: () => false },
    { name: "cash_position", type: "number", label: "Investimento iniziale", required: true, grid: { md: 4 } },
    { name: "automatic_savings", type: "number", label: "Investimento mensile", required: true, grid: { md: 4 } },
];

const Backtesting: React.FC = () => {
    const navigate = useNavigate();
    const isMobile = useIsMobile(992);
    const [modalOpen, setModalOpen] = useState<boolean>(false);

    const [UserInfoUid, setUserInforUid] = useState<string>("")

    const toggleModal = () => setModalOpen(!modalOpen);

    // ✅ “KIT” RESPONSIVE (igual que Dashboard/Profile)
    const ui = useMemo(() => {
        return {
            hSection: { fontSize: isMobile ? "14px" : "1rem" },
            subSection: { fontSize: isMobile ? "11px" : "0.8rem" },
            hCardTitle: { fontSize: isMobile ? "13px" : "" },
            pill: { fontSize: isMobile ? "10px" : "0.75rem" },
            textSmall: { fontSize: isMobile ? "12px" : "" },
            textBody: { fontSize: isMobile ? "13px" : "0.95rem" },
            numberBig: { fontSize: isMobile ? "1.6rem" : "2rem" },

            headerPadClass: isMobile ? "p-3" : "p-3 py-md-3 px-md-4",
            bodyPadClass: isMobile ? "p-3" : "p-3 p-md-4",

            label: { color: "#21384A", fontWeight: 700, fontSize: isMobile ? "12px" : "13px" },
            alertText: { fontSize: isMobile ? "13px" : "14px" },
            alertFine: { fontSize: isMobile ? "12px" : "12px" },
        };
    }, [isMobile]);

    const [backtests, setBacktests] = useState<BacktestingInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uidCreateBacktesting, setUidCreateBacktesting] = useState<string>("")



    useEffect(() => {
        // Caricamento iniziale lista backtests
        getUserInfo()
            .then((resp) => {
                if (resp.response.success && resp.data) {
                    console.log(resp.data)
                    setUserInforUid(resp.data.user_uid)
                }
            })
            .catch((erro) => {
                console.log("Errore al ottenere i dati dell'utente")
            })
        getBackTestingsListPaginated();
    }, []);


    async function getBackTestingsListPaginated(increment: number = 0) {
        const params = {
            page: 1,
            per_page: 5 + increment,
            include_assets: 1,
            include_deleted: 0,
        };
        try {
            setLoading(true);
            const res = await get_backtestingsListPaginated(params);
            if (res.data && res.success) {
                console.log("Backtestings paginated fetched:", res);
                setLoading(false);
                setBacktests(res.data.rows || []);

            }
            console.log("BACKTESTING LIST", res);

        } catch (err) {
            console.error("Errore in caricamento backtesting list", err);
        }
    };



    return (
        <>
            <MDBContainer fluid className="py-3 py-md-4 px-0">
                {/* ==================== SECTION: I MIEI PORTAFOGLI ==================== */}
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
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="list-alt" className="me-2 fs-5 text-white" />
                                    <span className="fw-bold" style={ui.hSection}>
                                        Riassunto Generale dei miei Portafogli
                                    </span>
                                </div>
                                <small className="text-white-50" style={ui.subSection}>
                                    Scopri come avrebbe performato storicamente un portafoglio di investimenti
                                </small>
                            </div>

                            <MDBCardBody className={ui.bodyPadClass}>
                                <MDBRow className="g-3">
                                    {/* ✅ Lista backtests */}
                                    {loading ? (
                                        <General_Loading />
                                    ) : (
                                        <>
                                            {/* Card "Nuovo Portafoglio" */}
                                            <MDBCol xs="12" md="6" lg="6" xl="4">
                                                <MDBCard className="shadow-sm rounded-4 h-100" style={{ minHeight: isMobile ? 160 : 208 }}>
                                                    <MDBCardBody className="d-flex flex-column align-items-center justify-content-center text-center">
                                                        <MDBBtn
                                                            className="d-inline-flex align-items-center justify-content-center"
                                                            onClick={toggleModal}
                                                            style={{
                                                                height: isMobile ? 52 : 55,
                                                                width: isMobile ? 52 : 55,
                                                                borderRadius: 16,
                                                            }}
                                                        >
                                                            <MDBIcon fas icon="plus" style={{ transform: "scale(1.8)" }} />
                                                        </MDBBtn>

                                                        <div className="mt-2 fw-bold" style={ui.textBody}>
                                                            Nuovo Backtesting
                                                        </div>



                                                        <div className="text-muted mt-1" style={ui.textSmall}>
                                                            Costruisci e testa il tuo portafoglio personalizzato
                                                        </div>
                                                    </MDBCardBody>
                                                </MDBCard>
                                            </MDBCol>

                                            {/* Lista backtests */}
                                            {backtests.map((bt) => (
                                                <MDBCol xs="12" md="6" lg="6" xl="4" key={bt.backtesting_uid}>
                                                    <MDBCard className="shadow-sm rounded-4 h-100">
                                                        <MDBCardBody
                                                            onClick={() => navigate(`/backtesting/backtestingItem/${bt.backtesting_uid}`)}
                                                            style={{ cursor: "pointer" }}
                                                            className={isMobile ? "p-3" : "p-3 p-md-4"}
                                                        >
                                                            <MDBCardTitle className="text-dark mb-3 d-flex align-items-center justify-content-between" style={ui.textSmall}>
                                                                {bt.title}
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                                                    <path d="M13.334 5.83337H18.334V10.8334" stroke="#FE9A00" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" />
                                                                    <path d="M18.3327 5.83337L11.2493 12.9167L7.08268 8.75004L1.66602 14.1667" stroke="#FE9A00" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" />
                                                                </svg>
                                                            </MDBCardTitle>

                                                            <div className="text-muted" style={ui.textSmall}>
                                                                <div className="d-flex justify-content-between mb-2">
                                                                    <span>Totale Investito</span>
                                                                    <strong className="text-dark">{bt.cash_position} €</strong>
                                                                </div>

                                                                <div className="d-flex justify-content-between mb-2">
                                                                    <span>Contributo mensile</span>
                                                                    <span className="text-dark">{bt.automatic_savings}€ / mese</span>
                                                                </div>

                                                                <div className="d-flex justify-content-between">
                                                                    <span>Periodo test</span>
                                                                    <span className="text-dark">{bt.time_horizon_years} anni</span>
                                                                </div>
                                                            </div>
                                                        </MDBCardBody>

                                                        <MDBCardFooter className="pt-0 pb-3 px-3 px-md-4" style={{ border: "none" }}>
                                                            <div className="d-flex flex-wrap gap-2">
                                                                {bt.assets.map((a) => (
                                                                    <MDBBadge key={a.symbol} color="light" className="text-dark border">
                                                                        {a.symbol}
                                                                    </MDBBadge>
                                                                ))}
                                                            </div>
                                                        </MDBCardFooter>
                                                    </MDBCard>
                                                </MDBCol>
                                            ))}
                                        </>
                                    )}
                                </MDBRow>
                            </MDBCardBody>
                            <MDBCardFooter className="border-0 d-flex justify-content-center">
                                <MDBBtn
                                    onClick={() => getBackTestingsListPaginated(5)}
                                    outline className='mx-2 mb-3' color='dark'>
                                    Show more
                                </MDBBtn>
                            </MDBCardFooter>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* ==================== SECTION: I NOSTRI PORTAFOGLI ==================== */}
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
                                <div className="d-flex align-items-center">
                                    <MDBIcon fas icon="layer-group" className="me-2 fs-5 text-white" />
                                    <span className="fw-bold" style={ui.hSection}>
                                        I nostri portafogli
                                    </span>
                                </div>
                                <small className="text-white-50" style={ui.subSection}>
                                    Scopri come avrebbe performato storicamente un portafoglio di investimenti
                                </small>
                            </div>

                            <MDBCardBody className={ui.bodyPadClass}>
                                <MDBRow className="g-3">
                                    {/* ✅ En mobile: 1 col (xs=12). En desktop: 4 col (lg=3) */}
                                    <MDBCol xs="12" md="6" lg="6" xl="3">
                                        <PortfolioCard
                                            ui={ui}
                                            isMobile={isMobile}
                                            title="Reddito Stabile"
                                            riskLabel="Basso"
                                            riskColor="success"
                                            icon="shield-alt"
                                            border="rgba(0, 122, 85, 1)"
                                            bg="rgb(204,237,226)"
                                            rendimento="+1.85%"
                                            ctaColor="success"
                                            desc="Portafoglio diversificato in obbligazioni e azioni con dividendi"
                                        />
                                    </MDBCol>

                                    <MDBCol xs="12" md="6" lg="6" xl="3">
                                        <PortfolioCard
                                            ui={ui}
                                            isMobile={isMobile}
                                            title="Futuro Emergente"
                                            riskLabel="Alto"
                                            riskColor="danger"
                                            icon="exclamation-triangle"
                                            border="rgba(231, 0, 11, 1)"
                                            bg="rgb(251,206,208)"
                                            rendimento="+15.4%"
                                            ctaColor="danger"
                                            desc="Investimento ad alto rischio nei mercati emergenti"
                                        />
                                    </MDBCol>

                                    <MDBCol xs="12" md="6" lg="6" xl="3">
                                        <PortfolioCard
                                            ui={ui}
                                            isMobile={isMobile}
                                            title="Reddito Stabile"
                                            riskLabel="Medio"
                                            riskColor="warning"
                                            icon="shield-alt"
                                            border="rgba(254, 154, 0, 1)"
                                            bg="rgb(251,229,204)"
                                            rendimento="+1.85%"
                                            ctaColor="warning"
                                            desc="Portafoglio diversificato in obbligazioni e azioni con dividendi"
                                        />
                                    </MDBCol>

                                    <MDBCol xs="12" md="6" lg="6" xl="3">
                                        <PortfolioCard
                                            ui={ui}
                                            isMobile={isMobile}
                                            title="Reddito Stabile"
                                            riskLabel="Basso"
                                            riskColor="success"
                                            icon="shield-alt"
                                            border="rgba(0, 122, 85, 1)"
                                            bg="rgb(204,237,226)"
                                            rendimento="+1.85%"
                                            ctaColor="success"
                                            desc="Portafoglio diversificato in obbligazioni e azioni con dividendi"
                                        />
                                    </MDBCol>
                                </MDBRow>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>

                {/* ==================== HELP CTA ==================== */}
                <MDBRow className="g-3">
                    <MDBCol xs="12">
                        <MDBCard
                            className="border-0 rounded-4"
                            style={{ border: "1px solid rgba(190, 219, 255, 1)", backgroundColor: "rgb(239,246,255)" }}
                        >
                            <MDBCardBody className={ui.bodyPadClass}>
                                <div className="d-flex align-items-start gap-3">
                                    <div
                                        className="flex-shrink-0 d-flex align-items-center justify-content-center"
                                        style={{
                                            backgroundColor: "rgba(190, 219, 255, 1)",
                                            borderRadius: "10px",
                                            width: 40,
                                            height: 40,
                                        }}
                                    >
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
                                        <MDBCardTitle className="fw-bold mb-2" style={ui.textBody}>
                                            Hai bisogno di aiuto per scegliere?
                                        </MDBCardTitle>

                                        <div className="text-muted mb-3" style={ui.textBody}>
                                            I nostri consulenti sono disponibili per aiutarti a trovare il portafoglio più adatto alle tue
                                            esigenze e obiettivi finanziari.
                                        </div>

                                        <MDBBtn style={{ fontSize: isMobile ? "12px" : "13px", borderRadius: 12 }}>
                                            Parla con un consulente
                                        </MDBBtn>
                                    </div>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>
            </MDBContainer>
            <MDBModal tabIndex="-1" open={modalOpen} setOpen={setModalOpen}>
                <MDBModalDialog centered size="lg">
                    <MDBModalContent>
                        <MDBModalHeader>
                            <MDBModalTitle>Nuovo Backtesting</MDBModalTitle>
                            <MDBBtn className="btn-close" color="none" onClick={toggleModal}></MDBBtn>
                        </MDBModalHeader>
                        <MDBModalBody className="mx-3">
                            <GeneralForm<BacktestingInfoLite>
                                mode="create"
                                createBtnProps={{
                                    label: "Crea il tuo Backtesting",
                                    labelSaving: "Creazione in corso",
                                }}
                                params={{ user_uid: UserInfoUid, time_horizon_years: 1 }}
                                fields={Portfolio_FormFields}
                                createData={async (payload) => {
                                    const res = await create_backtesting(payload);
                                    console.log(res, "res ") 
                                    const uid = res?.data?.backtesting_uid;
                                    if (uid) {
                                        setModalOpen(false);
                                        navigate(`/backtesting/backtestingItem/${uid}`);
                                    }

                                    return {
                                        ...res,
                                        data: { ...payload, backtesting_uid: uid },
                                    };
                                }}
                                className='p-4 pt-0 lh-lg'
                                onSuccess={() => {
                                    setModalOpen(false)
                                }}
                            />


                        </MDBModalBody>
                    </MDBModalContent>
                </MDBModalDialog>
            </MDBModal>
        </>
    );
};

export default Backtesting;

