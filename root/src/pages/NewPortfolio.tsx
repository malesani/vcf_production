import React, { useEffect, useState } from 'react';
import {
    MDBBtn,
    MDBRow,
    MDBCol,
    MDBCard,
    MDBBadge,
    MDBCardBody,
    MDBCardText,
    MDBCardTitle,
    MDBContainer,
} from 'mdb-react-ui-kit';

import General_Loading from "../app_components/General_Loading";
import { FieldConfig, SelectData, GeneralForm } from '../app_components/GeneralForm';

import { getStocksInfo } from '../api_module_v1/FinancialDataRequest';
import { PortfolioInfo, PortfolioAssets, create_portfolio } from '../api_module/portfolio/PortfolioData';
import { fetchManagedPortfoliosActive, PortManagedInfo } from '../api_module/portfolioManaged/PortManagedData';
import { getUserInfo, APIUserInfo } from "../api_module_v1/UserRequest"
import { useIsMobile } from "../app_components/ResponsiveModule";

const NewPortfolio: React.FC = () => {
    const [loadingMode, setLoadingMode] = useState<boolean>(false);
    const isMobile = useIsMobile(992);
    const [stocksInfoOptions, setStocksInfoOptions] = useState<SelectData[] | null>(null);
    const [managedPortfoliosOptions, setManagedPortfolios] = useState<SelectData[] | null>(null);
    const [UserInfoUid, setUserInforUid] = useState<string>("")

    // FETCH DATA
    useEffect(() => {
        setLoadingMode(true);
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
        getStocksInfo()
            .then((resp) => {
                if (resp.response.success && resp.data) {
                    setStocksInfoOptions(resp.data.map(stockInfo => ({
                        value: stockInfo.symbol,
                        text: `${stockInfo.name} (${stockInfo.symbol})`,
                    })))
                }
            })
            .catch((err) => {
                console.error("Errore caricamento Stocks Info:", err);
            })

        fetchManagedPortfoliosActive()
            .then((resp) => {
                if (resp.response.success && resp.data) {
                    setManagedPortfolios(resp.data.map(managedPortsInfo => ({
                        value: managedPortsInfo.managed_uid,
                        text: managedPortsInfo.title,
                        description: managedPortsInfo.description,
                        adv_growthPercentFrom: managedPortsInfo.adv_growthPercentFrom,
                        adv_growthPercentTo: managedPortsInfo.adv_growthPercentTo,
                        adv_timeRangeFrom: managedPortsInfo.adv_timeRangeFrom,
                        adv_timeRangeTo: managedPortsInfo.adv_timeRangeTo,
                    })))
                }
            })
            .catch((err) => {
                console.error("Errore caricamento Stocks Info:", err);
            })
    }, []);
    // END

    useEffect(() => {
        if (stocksInfoOptions && managedPortfoliosOptions) {
            console.log("stocksInfoOptions", stocksInfoOptions);
            console.log("managedPortfoliosOptions", managedPortfoliosOptions);
            setLoadingMode(false);
        }
    }, [stocksInfoOptions, managedPortfoliosOptions]);

    // SET LOADING
    if (loadingMode) {
        return (<General_Loading theme="pageLoading" title='' />);
    }


    const PortfolioAsset_FormFields: FieldConfig<PortfolioAssets>[] = [
        {
            name: "symbol", label: "Seleziona Stock", required: true, grid: { md: 8 },
            type: "selectbox", options: stocksInfoOptions as SelectData[],
            properties: {
                largeDataSearch: true
            },
        },
    ]

    const Portfolio_FormFields: FieldConfig<PortfolioInfo>[] = [
        //not visible
        { name: "title", label: "Titolo", required: true, grid: { md: 12 } },

        { name: "target", label: "Obiettivo di Investimento (Importo Target)", required: true, grid: { md: 6 }, type: "number" },

        { name: "time_horizon_years", label: "Anni Previsti per Raggiungere l'Obiettivo", required: true, grid: { md: 6 }, type: "number" },

        { name: "cash_position", label: "Liquidità Iniziale da Investire", required: true, grid: { md: 6 }, type: "number" },

        { name: "automatic_savings", label: "Importo Mensile Aggiuntivo", required: true, grid: { md: 6 }, type: "number" },



        //gestione se è custom or managed
        {
            name: "type", label: "Tipo", required: true, grid: { md: 4 }, type: "selectbox", customElementKey: "dual_switch",
            options: [
                { value: "custom", text: "Custom" },
                { value: "managed", text: "Gestito" }
            ]
        },
        {
            name: "isDraft", label: "Portafoglio di test", grid: { md: 8 }, type: "checkbox", class_name: "d-flex align-items-center",

        },

        {
            name: "managed_uid", label: "Modello di Portafoglio", required: true, grid: { md: 12 }, type: "selectbox",
            properties: { preventFirstSelection: false }, options: managedPortfoliosOptions as SelectData[], visible: (f) => { return f.type === "managed" },
            extraElements: [
                {
                    position: "after", grid: { md: 12 },
                    element: (fd) => {
                        const selectedManagedUid = fd.managed_uid;
                        const selectedPortfolio = managedPortfoliosOptions?.find(
                            (opt) => opt.value === selectedManagedUid
                        );

                        return <>
                            {selectedPortfolio &&
                                <MDBCard className="shadow-sm p-3 p-md-4" style={{ borderRadius: "12px" }}>
                                    <MDBCardBody className="p-0">
                                        {/* Titolo + badge (mobile stack, desktop row) */}
                                        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
                                            <div className="w-100">
                                                <MDBCardTitle className="fw-bold mb-1 fs-6 fs-md-5">
                                                    {selectedPortfolio ? selectedPortfolio.text : ""}
                                                </MDBCardTitle>
                                                <MDBCardText className="text-muted small mb-0">
                                                    {selectedPortfolio ? selectedPortfolio.description : ""}
                                                </MDBCardText>
                                            </div>

                                            {/* <MDBBadge color="danger" pill className="align-self-start align-self-md-auto">
                                            Rischio Alto
                                        </MDBBadge> */}
                                        </div>

                                        {/* Dati principali (mobile 2x2, desktop 4 cols) */}
                                        <MDBRow className="text-center g-2 my-3">

                                            <MDBCol xs="6" md="6">
                                                <div className="p-2 rounded bg-light h-100">
                                                    <div className="fw-bold text-success fs-6 fs-md-5">{selectedPortfolio ? selectedPortfolio.adv_growthPercentFrom : ""}%</div>
                                                    <small className="text-muted d-block">Rendimento Annuale Atteso</small>
                                                </div>
                                            </MDBCol>

                                            {isMobile && <hr className="my-3" />}


                                            <MDBCol xs="6" md="6">
                                                <div className="p-2 rounded bg-light h-100">
                                                    <div className="fw-bold fs-6 fs-md-5">{selectedPortfolio ? selectedPortfolio.adv_timeRangeFrom : ""} - {selectedPortfolio ? selectedPortfolio.adv_timeRangeTo : ""} anni</div>
                                                    <small className="text-muted d-block">Orizzonte Temporale Consigliato</small>
                                                </div>
                                            </MDBCol>

                                        </MDBRow>

                                        {/* Team di gestione */}
                                        {/* <hr className="my-3" />
                                    <div>
                                        <p className="fw-bold mb-1">Team di Gestione</p>
                                        <p className="text-muted small mb-0">
                                            Gestito da <strong>Alessandro Verdi</strong>, esperto in investimenti
                                            tecnologici e growth stocks.
                                        </p>
                                    </div> */}
                                    </MDBCardBody>
                                </MDBCard>
                            }
                        </>;
                    }
                }
            ]
        },
    ]

    return (
        <MDBContainer className="py-4">
            <MDBRow className="d-flex justify-content-center align-items-center">
                <MDBCol className="mb-3" md="10">
                    <MDBCard className="d-flex flex-column">
                        <div
                            className="p-3 p-md-4 d-flex align-items-center flex-column text-center"
                            style={{
                                backgroundColor: "rgb(38, 53, 80)",
                                color: "white",
                                borderTopRightRadius: "0.5rem",
                                borderTopLeftRadius: "0.5rem",
                            }}
                        >
                            <div className="w-100">
                                <span className="fw-bold fs-4 fs-md-2 d-block">
                                    Crea Nuovo Portafoglio
                                </span>
                            </div>

                            <span className="text-white-50 fs-6 mt-2 mb-0" style={{ maxWidth: 720 }}>
                                Personalizza il tuo nuovo portafoglio di investimenti seguendo i nostri passaggi guidati.
                                Configura ogni dettaglio secondo le tue esigenze e obiettivi finanziari.
                            </span>
                        </div>
                        <GeneralForm<PortfolioInfo, { user_uid: string; }>
                            mode="create"
                            createBtnProps={{
                                label: "Crea il tuo portafoglio",
                                labelSaving: "Creazione in corso",
                            }}
                            params={{ user_uid: UserInfoUid }}
                            fields={Portfolio_FormFields}
                            createData={create_portfolio}
                            className='p-4 lh-lg'
                        />

                    </MDBCard>
                </MDBCol>
            </MDBRow >
        </MDBContainer>
    );
};

export default NewPortfolio;
