import React, { useEffect, useMemo, useState } from 'react';
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
import { useIsMobile } from "../app_components/ResponsiveModule";

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
    const isMobile = useIsMobile(992);
    const [loadingMode, setLoadingMode] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);

    const [managedPortfoliosInfo, setManagedPortfoliosInfo] = useState<PortManagedInfo[]>([]);

    const ui = useMemo(() => {
        return {
            // font
            hSection: { fontSize: isMobile ? "14px" : "1rem" }, // titoli delle sezioni (header blu)
            subSection: { fontSize: isMobile ? "11px" : "0.8rem" }, // sottotitoli header blu
            hCardTitle: { fontSize: isMobile ? "13px" : "" }, // strong nelle card piccole
            pill: { fontSize: isMobile ? "10px" : "0.75rem" },
            textSmall: { fontSize: isMobile ? "12px" : "" },
            textBody: { fontSize: isMobile ? "13px" : "0.95rem" },
            numberBig: { fontSize: isMobile ? "1.6rem" : "2rem" },

            // padding
            headerPadClass: isMobile ? "p-3" : "p-3 py-md-3 px-md-4",
            bodyPadClass: isMobile ? "p-3" : "p-3 p-md-4",

            // etichette
            label: { color: "#21384A", fontWeight: 700, fontSize: isMobile ? "12px" : "13px" },

            // avvisi
            alertText: { fontSize: isMobile ? "13px" : "14px" },
            alertFine: { fontSize: isMobile ? "12px" : "12px" },
        };
    }, [isMobile]);


    // RECUPERO DATI
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
    // FINE

    useEffect(() => {
        if (managedPortfoliosInfo) {
            console.log("managedPortfoliosInfo", managedPortfoliosInfo);
            setLoadingMode(false);
        }
    }, [managedPortfoliosInfo]);

    // IMPOSTA LOADING
    if (loadingMode) {
        return (<General_Loading theme="pageLoading" title='' />);
    }


    return (
        <div>
            <MDBContainer fluid className='py-3 py-md-2 px-0'>
                <MDBRow className=''>
                    <MDBCol>
                        <div className="">
                            <div className="d-flex flex-row align-items-center mb-2">
                                {/* <i className="fas fa-list-alt me-2"></i> */}
                                <span className="fs-4 fw-bold text-dark">
                                    I nostri portafogli gestiti
                                </span>
                            </div>
                            <div className="d-flex">
                                <span className="text-muted" style={ui.textBody}>
                                    Scopri come avrebbe performato storicamente un portafoglio di investimenti,
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

                <MDBRow className='mb-3'>
                    <MDBCol>
                        <span className="fs-4 fw-bold text-dark">Esplora i nostri portafoli selezionati</span>
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
