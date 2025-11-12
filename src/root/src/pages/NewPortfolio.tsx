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

const NewPortfolio: React.FC = () => {
    const [loadingMode, setLoadingMode] = useState<boolean>(false);

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
        return (<General_Loading theme="pageLoading" title='Nuovo Progetto' />);
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
            name: "isDraft", label: "Portafoglio di test", grid: { md: 8 }, type: "checkbox",

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
                            <MDBCard className="shadow-sm p-3" style={{ borderRadius: "12px" }}>
                                <MDBCardBody>
                                    {/* Titolo e badge rischio */}
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <div>
                                            <MDBCardTitle className="fw-bold mb-1">
                                                {selectedPortfolio ? selectedPortfolio.text : "Seleziona un modello"}
                                            </MDBCardTitle>
                                            <MDBCardText className="text-muted small">
                                                Portafoglio ad alta crescita focalizzato su tecnologia e innovazione.
                                            </MDBCardText>
                                        </div>
                                        <MDBBadge color="danger" pill>
                                            Rischio Alto
                                        </MDBBadge>
                                    </div>

                                    {/* Dati principali */}
                                    <MDBRow className="text-center my-3">
                                        <MDBCol md="3" sm="6" className="mb-2">
                                            <h5 className="text-success fw-bold mb-0">+15.4%</h5>
                                            <small className="text-muted">Performance Annua</small>
                                        </MDBCol>
                                        <MDBCol md="3" sm="6" className="mb-2">
                                            <h5 className="fw-bold mb-0">32</h5>
                                            <small className="text-muted">Asset</small>
                                        </MDBCol>
                                        <MDBCol md="3" sm="6" className="mb-2">
                                            <h5 className="fw-bold mb-0">0.95%</h5>
                                            <small className="text-muted">Commissione</small>
                                        </MDBCol>
                                        <MDBCol md="3" sm="6" className="mb-2">
                                            <h5 className="fw-bold mb-0">€2,000</h5>
                                            <small className="text-muted">Investimento Min.</small>
                                        </MDBCol>
                                    </MDBRow>

                                    {/* Team di gestione */}
                                    <hr />
                                    <div>
                                        <p className="fw-bold mb-1">Team di Gestione</p>
                                        <p className="text-muted small mb-0">
                                            Gestito da <strong>Alessandro Verdi</strong>, esperto in investimenti
                                            tecnologici e growth stocks.
                                        </p>
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </>;
                    }
                }
            ]
        },

        {
            name: "assets",
            label: "Composizione Portafoglio",
            type: "repeater",
            required: true,
            grid: { md: 12 },
            subFields: PortfolioAsset_FormFields as any,
            properties: {
                defaultItem: () => ({ symbol: null, invested_amount: null }),
            }, visible: (f) => { return f.type === "custom" },
            extraElements: [
                {
                    position: "before", grid: { md: 12 },
                    visible: (f) => { return f.type === "custom" },
                    element: (fd) => {
                        let cash = fd.assets?.reduce((sum, item) => {
                            return sum + parseFloat(String(item.unitQuantity));
                        }, 0) ?? 0;
                        return <>
                            <div className="form-outline">
                                <div className="form-control bg-light border d-flex flex-row flex-nowrap justify-content-between" style={{ pointerEvents: "none" }}>
                                    <span>Capitale Investito: </span><b>{isNaN(cash) ? 0 : cash} €</b>
                                </div>
                            </div>
                        </>;
                    }
                }
            ]
        }
    ]

    return (
        <MDBContainer className="py-4">
            <MDBRow className="d-flex justify-content-center align-items-center">
                <MDBCol className="mb-3" md="10">
                    <MDBCard className="d-flex flex-column">
                        <div className='p-4 d-flex align-items-center flex-column' style={{ backgroundColor: "rgb(38, 53, 80) ", color: "white", borderTopRightRadius: "0.5rem", borderTopLeftRadius: "0.5rem" }}>
                            <div className="">
                                <span className="fs-2 fw-bold" >Crea Nuovo Portafoglio</span>
                            </div>
                            <span className="fs-6 text-center mb-2">
                                Personalizza il tuo nuovo portafoglio di investimenti seguendo i nostri passaggi guidati. Configura ogni dettaglio secondo le tue esigenze e obiettivi finanziari.
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
