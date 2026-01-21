import { MDBContainer, MDBRow, MDBCol, MDBCard, MDBCardBody, MDBCardTitle, MDBCardFooter, MDBBadge, MDBBtn, MDBIcon } from "mdb-react-ui-kit";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { backtestingsList } from "../components/backtesting/contans"
import type { BacktestWithAssets } from "../components/backtesting/contans";

const Backtesting: React.FC = () => {
    const navigate = useNavigate();

    const [backtests, setBacktests] = useState<BacktestWithAssets[]>([]);
    const [loading, setLoading] = useState(true);


    function getBacktestings(): Promise<BacktestWithAssets[]> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(structuredClone(backtestingsList));
            }, 400);
        });
    }

    useEffect(() => {
        getBacktestings()
            .then(setBacktests)
            .finally(() => setLoading(false));
    }, []);

    return (
        <>
            <MDBContainer>
                <MDBRow className='align-items-center mb-3'>
                    <MDBCol>
                        <div className="py-2 mb-2">
                            <div className="d-flex flex-row align-items-center">
                                {/* <i className="fas fa-list-alt me-2"></i> */}
                                <span className="fs-3 fw-bold text-dark">
                                    Riassunto Generale dei miei Portafogli
                                </span>
                            </div>
                            <div className="d-flex">
                                <span className="text-muted fs-6">
                                    Scopri come avrebbe performato storicamente un portafoglio di investimenti
                                </span>
                            </div>
                        </div>
                    </MDBCol>
                </MDBRow>
                <MDBRow className='align-items-center mb-4'>
                    <MDBCol className="col-4 mb-5">
                        <MDBCard className="" style={{ minHeight: "208px" }}>
                            <MDBCardBody className="d-flex flex-column align-items-center justify-content-center">
                                <div>
                                    <MDBBtn className=" " style={{ height: "55px", borderRadius: "16px" }}>
                                        <MDBIcon fas icon="plus" style={{ scale: "1.8" }} />
                                    </MDBBtn>
                                </div>
                                <div className="my-2">Nuovo Portafoglio</div>
                                <div className="f-6 text-muted" style={{ fontSize: "14px" }}>
                                    Costruisci e testa il tuo portafoglio personalizzato
                                </div>

                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                    {backtests.map((bt) => (
                        <MDBCol className="col-4 mb-5" key={bt.test_uid}>
                            <MDBCard>
                                <MDBCardBody
                                    onClick={() =>
                                        navigate(`/backtesting/backtestingItem/${bt.test_uid}`)
                                    }
                                    style={{ cursor: "pointer" }}
                                >
                                    <MDBCardTitle className="text-muted small mb-3">
                                        {bt.name}
                                    </MDBCardTitle>

                                    <div className="text-muted small">
                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Totale Investito</span>
                                            <strong>{bt.totalInvested.toFixed(2)} €</strong>
                                        </div>

                                        <div className="d-flex justify-content-between mb-2">
                                            <span>Contributo mensile</span>
                                            <span>{bt.monthlyContribution}€ / mese</span>
                                        </div>

                                        <div className="d-flex justify-content-between">
                                            <span>Periodo test</span>
                                            <span>{bt.periodYears} anni</span>
                                        </div>
                                    </div>
                                </MDBCardBody>

                                <MDBCardFooter className="py-0 pb-3" style={{ border: "none" }}>
                                    {bt.assets.map((a) => (
                                        <MDBBadge key={a.symbol} color="light" className="text-dark border me-2">
                                            {a.symbol}
                                        </MDBBadge>
                                    ))}
                                </MDBCardFooter>
                            </MDBCard>
                        </MDBCol>
                    ))}

                </MDBRow>

            </MDBContainer>
            <MDBContainer className="mb-5">
                <MDBRow className='align-items-center mb-3'>
                    <MDBCol>
                        <div className="py-2 mb-2">
                            <div className="d-flex flex-row align-items-center">
                                {/* <i className="fas fa-list-alt me-2"></i> */}
                                <span className="fs-3 fw-bold text-dark">
                                    I nostri portafogli
                                </span>
                            </div>
                            <div className="d-flex">
                                <span className=" fs-6">
                                    Scopri come avrebbe performato storicamente un portafoglio di investimenti
                                </span>
                            </div>
                        </div>
                    </MDBCol>
                </MDBRow>
                <MDBRow className='align-items-center mb-3'>
                    <MDBCol className="col-3">
                        <MDBCard style={{ border: "solid 1px rgba(0, 122, 85, 1)", backgroundColor: "rgb(204,237,226)" }}>
                            <MDBCardBody>
                                <MDBCardTitle className="small mb-2 d-flex align-items-center justify-content-between mb-3">
                                    <div>
                                        Reddito Stabile
                                    </div>
                                    <MDBBadge pill color='success' className="px-2 py-2">
                                        <MDBIcon fas icon="shield-alt" className="me-1" />
                                        Basso
                                    </MDBBadge>
                                </MDBCardTitle>
                                <div className="text-muted small">
                                    <div className="mb-2 d-flex justify-content-between">
                                        <span>Portafoglio diversificato in obbligazioni e azioni con dividendi</span>
                                    </div>
                                </div>
                            </MDBCardBody>
                            <MDBCardFooter className=' py-0 pb-3' style={{ border: "none" }}>
                                <div className="small">Rendimento</div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="fs-4">+1.85%</span>
                                    <MDBBtn className='text-success' color='light'>
                                        VEDI DETTAGLI
                                    </MDBBtn>
                                </div>
                            </MDBCardFooter>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="col-3">
                        <MDBCard style={{ border: "solid 1px rgba(231, 0, 11, 1)", backgroundColor: "rgb(251,206,208)" }}>
                            <MDBCardBody>
                                <MDBCardTitle className="small mb-2 d-flex align-items-center justify-content-between mb-3">
                                    <div>
                                        Futuro Emergente
                                    </div>
                                    <MDBBadge pill color='danger' className="px-2 py-2">
                                        <MDBIcon fas icon="exclamation-triangle" className="me-1" />
                                        Alto
                                    </MDBBadge>
                                </MDBCardTitle>
                                <div className=" small">
                                    <div className="mb-2 d-flex justify-content-between">
                                        <span>Investimento ad alto rischio nei mercati emergenti</span>
                                    </div>
                                </div>
                            </MDBCardBody>
                            <MDBCardFooter className=' py-0 pb-3' style={{ border: "none" }}>
                                <div className="small">Rendimento</div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="fs-4">+15.4%</span>
                                    <MDBBtn className='text-danger' color='light'>
                                        VEDI DETTAGLI
                                    </MDBBtn>
                                </div>
                            </MDBCardFooter>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="col-3">
                        <MDBCard style={{ border: "solid 1px rgba(254, 154, 0, 1)", backgroundColor: "rgb(251,229,204)" }}>
                            <MDBCardBody>
                                <MDBCardTitle className="small mb-2 d-flex align-items-center justify-content-between mb-3">
                                    <div>
                                        Reddito Stabile
                                    </div>
                                    <MDBBadge pill color='warning' className="px-2 py-2">
                                        <MDBIcon fas icon="shield-alt" className="me-1" />
                                        Basso
                                    </MDBBadge>
                                </MDBCardTitle>
                                <div className="text-muted small">
                                    <div className="mb-2 d-flex justify-content-between">
                                        <span>Portafoglio diversificato in obbligazioni e azioni con dividendi</span>
                                    </div>
                                </div>
                            </MDBCardBody>
                            <MDBCardFooter className=' py-0 pb-3' style={{ border: "none" }}>
                                <div className="small">Rendimento</div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="fs-4">+1.85%</span>
                                    <MDBBtn className='text-warning' color='light'>
                                        VEDI DETTAGLI
                                    </MDBBtn>
                                </div>
                            </MDBCardFooter>
                        </MDBCard>
                    </MDBCol>
                    <MDBCol className="col-3">
                        <MDBCard style={{ border: "solid 1px rgba(0, 122, 85, 1)", backgroundColor: "rgb(204,237,226)" }}>
                            <MDBCardBody>
                                <MDBCardTitle className="small mb-2 d-flex align-items-center justify-content-between mb-3">
                                    <div>
                                        Reddito Stabile
                                    </div>
                                    <MDBBadge pill color='success' className="px-2 py-2">
                                        <MDBIcon fas icon="shield-alt" className="me-1" />
                                        Basso
                                    </MDBBadge>
                                </MDBCardTitle>
                                <div className="text-muted small">
                                    <div className="mb-2 d-flex justify-content-between">
                                        <span>Portafoglio diversificato in obbligazioni e azioni con dividendi</span>
                                    </div>
                                </div>
                            </MDBCardBody>
                            <MDBCardFooter className=' py-0 pb-3' style={{ border: "none" }}>
                                <div className="small">Rendimento</div>
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="fs-4">+1.85%</span>
                                    <MDBBtn className='text-success' color='light'>
                                        VEDI DETTAGLI
                                    </MDBBtn>
                                </div>
                            </MDBCardFooter>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>
            </MDBContainer>
            <MDBContainer>
                <MDBRow className='align-items-center mb-3'>
                    <MDBCol className="col-12">
                        <MDBCard style={{ border: "solid 1px rgba(190, 219, 255, 1)", backgroundColor: "rgb(239,246,255)" }}>
                            <MDBCardBody className="d-flex flex-row">
                                <div style={{ backgroundColor: "rgba(190, 219, 255, 1)", borderRadius: "10px", width: "40px", height: "40px", padding: "10px" }} className="d-flex align-items-center me-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M13.333 5.83325H18.333V10.8333" stroke="#155DFC" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" />
                                        <path d="M18.3337 5.83325L11.2503 12.9166L7.08366 8.74992L1.66699 14.1666" stroke="#155DFC" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                </div>
                                <div>
                                    <MDBCardTitle className="small mb-2 d-flex flex-column mb-3">
                                        <div>
                                            Hai bisogno di aiuto per scegliere?
                                        </div>

                                    </MDBCardTitle>
                                    <div className="text-muted small mb-3">
                                        <div className="mb-2 d-flex justify-content-between">
                                            <span>I nostri consulenti sono disponibili per aiutarti a trovare il portafoglio più adatto alle tue esigenze e obiettivi finanziari.</span>
                                        </div>
                                    </div>
                                    <MDBBtn className="" style={{ fontSize: "10px" }}>Parla con un consulente</MDBBtn>

                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>
            </MDBContainer>
        </>
    )
}

export default Backtesting;  