import React, { useEffect, useState } from 'react';
import { CustomCarouselMultiItems } from '../components/CustomCarouselMultiItems';
import General_Loading from "../app_components/General_Loading";
import {
    MDBContainer,
    MDBRow,
    MDBCol,
    MDBDropdown,
    MDBDropdownToggle,
    MDBDropdownMenu,
    MDBDropdownItem,
    MDBCard,
    MDBCardBody
} from "mdb-react-ui-kit";


// import LineChart from '../components/simulation/LineChart';
import { NivoPie, PieDatum } from '../components/simulation/NivoPie';
import { fetchManagedPortfoliosActive, PortManagedInfo } from '../api_module/portfolioManaged/PortManagedData';

let pieData: PieDatum[] =
    [
        {
            id: "Common Stock",
            label: "Common Stock",
            value: 15,
        },
        {
            id: "ETF",
            label: "ETF",
            value: 23,
        },
        {
            id: "Bond Fund",
            label: " Bond Fund",
            value: 12,
        },
        {
            id: "Preferred Stock",
            label: "Preferred Stock",
            value: 34,
        },
        {
            id: "Closed-end Fund",
            label: "Closed-end Fund",
            value: 26,
        }
    ]



const ManagedList: React.FC = () => {

    const [loadingMode, setLoadingMode] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const [managedPortfoliosInfo, setManagedPortfoliosInfo] = useState<PortManagedInfo[]>([]);

    // FETCH DATA
    useEffect(() => {
        setLoadingMode(true);

        fetchManagedPortfoliosActive()
            .then((resp) => {
                if (resp.response.success && resp.data) {
                    setManagedPortfoliosInfo(resp.data)
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error("Errore caricamento Stocks Info:", err);
            })
    }, []);
    // END

    useEffect(() => {
        if (managedPortfoliosInfo) {
            console.log("managedPortfoliosInfo", managedPortfoliosInfo);
            setLoadingMode(false);
        }
    }, [managedPortfoliosInfo]);

    // SET LOADING
    if (loadingMode) {
        return (<General_Loading theme="pageLoading" title='Nuovo Progetto' />);
    }


    return (
        <div>
            <MDBContainer>
                <MDBRow className=''>
                    <MDBCol>
                        <div className="py-2 mb-3">
                            <div className="d-flex flex-row align-items-center">
                                {/* <i className="fas fa-list-alt me-2"></i> */}
                                <span className="fs-2 fw-bold text-dark">
                                    I nostri portafogli gestiti
                                </span>
                            </div>
                            <div className="d-flex">
                                <span className="text-muted fs-5">
                                    Scopri come avrebbe performato storicamente un portafoglio di investimenti, <br />
                                    Dai un'occhiata ai nostri portafogli più eccezionali

                                </span>
                            </div>
                        </div>
                    </MDBCol>
                </MDBRow>
                <MDBRow className='mb-4'>
                    <MDBCol>
                        <CustomCarouselMultiItems></CustomCarouselMultiItems>

                    </MDBCol>
                </MDBRow>

                <MDBRow className=''>
                    <MDBCol>
                        <h3 className="my-4 text-dark">Esplora i nostri portafoli selezionati</h3>
                    </MDBCol>
                </MDBRow>
                <MDBRow className="align-items-center mb-4">
                    <MDBCol>
                        <MDBCard className="shadow-sm border-0 rounded-3">
                            <MDBCardBody className="py-2 px-3">
                                <MDBRow className="align-items-center">
                                    {/* Label "Filtra per" */}
                                    <MDBCol size="auto">
                                        <span className="fw-semibold text-muted">Filtra per:</span>
                                    </MDBCol>

                                    {/* Dropdown Livello di Rischio */}
                                    <MDBCol size="auto">
                                        <MDBDropdown>
                                            <MDBDropdownToggle color="light" className="me-2">
                                                Livello di Rischio
                                            </MDBDropdownToggle>
                                            <MDBDropdownMenu>
                                                <MDBDropdownItem link>Basso</MDBDropdownItem>
                                                <MDBDropdownItem link>Medio</MDBDropdownItem>
                                                <MDBDropdownItem link>Alto</MDBDropdownItem>
                                            </MDBDropdownMenu>
                                        </MDBDropdown>
                                    </MDBCol>

                                    {/* Dropdown Tipo di Attivo */}
                                    <MDBCol size="auto">
                                        <MDBDropdown>
                                            <MDBDropdownToggle color="light" className="me-2">
                                                Tipo di Attivo
                                            </MDBDropdownToggle>
                                            <MDBDropdownMenu>
                                                <MDBDropdownItem link>Azioni</MDBDropdownItem>
                                                <MDBDropdownItem link>Obbligazioni</MDBDropdownItem>
                                                <MDBDropdownItem link>Fondi</MDBDropdownItem>
                                            </MDBDropdownMenu>
                                        </MDBDropdown>
                                    </MDBCol>

                                    {/* Dropdown Strategia */}
                                    <MDBCol size="auto">
                                        <MDBDropdown>
                                            <MDBDropdownToggle color="light" className="me-2">
                                                Strategia
                                            </MDBDropdownToggle>
                                            <MDBDropdownMenu>
                                                <MDBDropdownItem link>Valore</MDBDropdownItem>
                                                <MDBDropdownItem link>Crescita</MDBDropdownItem>
                                                <MDBDropdownItem link>Reddito</MDBDropdownItem>
                                            </MDBDropdownMenu>
                                        </MDBDropdown>
                                    </MDBCol>

                                    {/* Pulisci Filtri */}
                                    <MDBCol className="text-end">
                                        <a href="#!" className="text-primary fw-semibold small">
                                            Pulisci Filtri
                                        </a>
                                    </MDBCol>
                                </MDBRow>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBCol>
                </MDBRow>
                <MDBRow className="g-3 mb-4">
                    {loading && (
                        <General_Loading theme="formLoading" text="Caricamento Portafogli" />
                    )}
                    {(managedPortfoliosInfo as PortManagedInfo[]).map((managedPortInfo, index) => (
                        <MDBCol key={index} xs="12" md="6" lg="4">
                            <NivoPie pieData={pieData} data={managedPortInfo} />
                        </MDBCol>
                    ))}
                </MDBRow>
            </MDBContainer>
        </div>

    );
};

export default ManagedList;
