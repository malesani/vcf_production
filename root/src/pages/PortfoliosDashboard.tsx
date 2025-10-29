import React, { useEffect, useState } from 'react';
import {
    MDBCol,
    MDBRow,
    MDBContainer,
    MDBCard,
    MDBCardBody,
    MDBCardHeader,
    MDBCardTitle,
    MDBCardText,
    MDBIcon,
    MDBBadge,
    MDBAnimation,
    MDBInputGroup,
    MDBBtn,
    MDBDropdown,
    MDBDropdownToggle,
    MDBDropdownMenu,
    MDBDropdownItem
} from 'mdb-react-ui-kit'

import { PortfolioInfo, get_portfoliosList } from '../api_module/portfolio/PortfolioData';

import { getMapping } from '../api_module_v1/MappingRequest';


import { ResponsiveBar } from '@nivo/bar'

import { useNavigate } from 'react-router-dom';


//data temporanea
const data = [
    {
        "mese": "Maggio",
        "Percentuale": -0.18,

    },
    {
        "mese": "Giugno",
        "Percentuale": 1.57,

    },
    {
        "mese": "Luglio",
        "Percentuale": 0.59,

    },
    {
        "mese": "Agosto",
        "Percentuale": 0.46,

    },
    {
        "mese": "Settembre",
        "Percentuale": 0.9,

    }

];


const PortfoliosDashboard: React.FC = () => {
    const navigate = useNavigate();

    const [managedDataPortfolios, setManagedDataPortfolios] = useState<PortfolioInfo[]>([]);

    const [showDataPortfolios, setShowDataPortfolios] = useState<PortfolioInfo[]>([]);

    const [loaderPage, setLoaderPage] = useState(false)


    const [statusMap, setStatusMap] = useState<Record<string, string>>({});

    //filter function data
    function filterData(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value.toLowerCase();

        if (value !== "") {
            const filtered = managedDataPortfolios.filter(item =>
                item.title.toLowerCase().includes(value)
            );
            setShowDataPortfolios(filtered);
        } else {
            // si está vacío, muestra todo
            setShowDataPortfolios(managedDataPortfolios);
        }
    }


    useEffect(() => {

        // traduzzioni dinamiche con utils map
        getMapping('portfolio', 'category')
            .then(res => {
                const raw = res.data?.map || {};
                const norm: Record<string, string> = Object.fromEntries(
                    Object.entries(raw).map(([k, v]) => [String(k), String(v as any)])
                );
                setStatusMap(norm);
            })
            .catch(err => console.error('Errore mappa stato procedura:', err));


        const loadData = async () => {
            const result = await get_portfoliosList({ search: "" });

            if (result.response.success && result.data) {
                const list = result.data ?? []; // <-- prendi l’array giusto
                setShowDataPortfolios(list);
                setManagedDataPortfolios(list);
                setLoaderPage(false)
            } else {
                setShowDataPortfolios([]);
                setManagedDataPortfolios([]);
            }
        };

        loadData();
    }, []);

    return (

        <MDBContainer>
            <MDBRow className='mb-4'>
                <MDBCol>
                    <div className="py-2 mb-2">
                        <div className="d-flex flex-row align-items-center">
                            {/* <i className="fas fa-list-alt me-2"></i> */}
                            <span className="fs-2 fw-bold text-dark">
                                Riassunto Generale dei miei Portafogli
                            </span>
                        </div>
                        <div className="d-flex">
                            <span className="text-muted fs-5">
                                Scopri come avrebbe performato storicamente un portafoglio di investimenti
                            </span>
                        </div>
                    </div>
                </MDBCol>
            </MDBRow>

            <MDBRow>

                <MDBCol className="" md="6" xl="4">
                    <MDBCard className="shadow-sm border-0 rounded-3" style={{ maxHeight: "150px", height: "150px" }}>
                        <MDBCardBody>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <MDBCardTitle className="text-muted small mb-2">
                                        Valore Totale del Portafoglio
                                    </MDBCardTitle>
                                    <h3 className="fw-bold mb-1">1.250.430,88 €</h3>
                                    <MDBCardText className="text-muted small">
                                        Aggiornato alle 14:30
                                    </MDBCardText>
                                </div>
                                {/* Icona a destra */}
                                <div
                                    className="d-flex align-items-center justify-content-center bg-light rounded-3"
                                    style={{ width: "40px", height: "40px" }}
                                >
                                    <div
                                        className="d-flex align-items-center justify-content-center rounded-3"
                                        style={{
                                            width: "40px",
                                            height: "40px",
                                            backgroundColor: "#f1f3f5" // 👈 gris claro de fondo
                                        }}
                                    >
                                        <MDBIcon fas icon="money-bill-wave" />
                                    </div>
                                </div>
                            </div>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>

                <MDBCol className="" md="6" xl="4">
                    <MDBCard className="shadow-sm border-0 rounded-3" style={{ maxHeight: "150px", height: "150px" }}>
                        <MDBCardBody>
                            <div className="d-flex justify-content-between align-items-start">
                                {/* Testi */}
                                <div>
                                    <MDBCardTitle className="text-muted small mb-2">
                                        Rendimento Aggregato
                                    </MDBCardTitle>
                                    <h3 className="fw-bold text-success mb-1">+12,50%</h3>
                                    <MDBCardText className="text-muted small">
                                        Dall'inizio
                                    </MDBCardText>
                                </div>

                                {/* Icona a destra */}
                                <div
                                    className="d-flex align-items-center justify-content-center rounded-3"
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        backgroundColor: "rgba(25, 135, 84, 0.1)" // verde chiaro trasparente
                                    }}
                                >
                                    <MDBIcon fas icon="chart-line" className="text-success" />
                                </div>
                            </div>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>

                <MDBCol className="" md="6" xl="4">
                    <MDBCard className="shadow-sm border-0 rounded-3" style={{ maxHeight: "150px", height: "150px" }}>
                        <MDBCardBody className="d-flex align-items-center">

                            {/* Placeholder per il grafico */}
                            <div
                                className="d-flex align-items-center justify-content-center rounded-circle bg-light text-muted"
                                style={{
                                    width: "100px",
                                    height: "100px",
                                    flexShrink: 0
                                }}
                            >
                                Chart
                            </div>

                            {/* Testi */}
                            <div className="ms-4">
                                <MDBCardTitle className="small text-muted mb-3">
                                    Distribuzione degli Attivi
                                </MDBCardTitle>
                                <ul className="list-unstyled mb-0 small">
                                    <li className="mb-1">
                                        <span className="me-2" style={{ color: "#0d1b4c" }}>●</span>
                                        Azioni: 60%
                                    </li>
                                    <li className="mb-1">
                                        <span className="me-2" style={{ color: "#3f51b5" }}>●</span>
                                        Obbligazioni: 30%
                                    </li>
                                    <li>
                                        <span className="me-2" style={{ color: "#009688" }}>●</span>
                                        Cripto: 10%
                                    </li>
                                </ul>
                            </div>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>

            </MDBRow>

            <MDBRow>
                <MDBCol className='d-flex align-items-center justify-content-between' style={{ margin: "80px 0px 20px 0px" }}>
                    <div className="py-2">
                        <div className="d-flex flex-row align-items-center">
                            {/* <i className="fas fa-list-alt me-2"></i> */}
                            <h3 className="fw-bold text-dark m-0">
                                I miei Portafogli
                            </h3>
                        </div>
                    </div>

                    <div className="d-flex gap-2 align-items-center bg-light rounded-3">

                        {/* Cerca */}
                        <MDBInputGroup noWrap className="flex-grow-1" style={{ maxWidth: "220px" }}>
                            <input onChange={filterData} className="form-control" placeholder="Cerca per nome..." type="text" />
                            <MDBBtn style={{ backgroundColor: "rgb(38, 53, 80)" }}>
                                <MDBIcon fas icon="search" />
                            </MDBBtn>
                        </MDBInputGroup>

                        {/* Bottone Filtri */}
                        <MDBDropdown>
                            <MDBDropdownToggle color="light" className="d-flex align-items-center gap-2">
                                <MDBIcon fas icon="filter" /> Filtri
                            </MDBDropdownToggle>
                            <MDBDropdownMenu>
                                <MDBDropdownItem link>Livello di rischio</MDBDropdownItem>
                                <MDBDropdownItem link>Tipo di attivo</MDBDropdownItem>
                                <MDBDropdownItem link>Strategia</MDBDropdownItem>
                            </MDBDropdownMenu>
                        </MDBDropdown>

                        {/* Bottone Ordina per */}
                        <MDBDropdown>
                            <MDBDropdownToggle color="light" className="d-flex align-items-center gap-2">
                                <MDBIcon fas icon="sort-amount-down-alt" /> Ordina per
                            </MDBDropdownToggle>
                            <MDBDropdownMenu>
                                <MDBDropdownItem link>Nome</MDBDropdownItem>
                                <MDBDropdownItem link>Valore</MDBDropdownItem>
                                <MDBDropdownItem link>Rendimento</MDBDropdownItem>
                            </MDBDropdownMenu>
                        </MDBDropdown>

                        {/* Bottone Nuovo Portafoglio */}
                        <MDBBtn
                            onClick={(e) => {
                                navigate(`/new_portfolio/`);
                            }} className="fw-bold" style={{ backgroundColor: "rgb(38, 53, 80)" }}>
                            <MDBIcon fas icon="plus" className="me-2" /> Nuovo Portafoglio
                        </MDBBtn>
                    </div>
                </MDBCol>
            </MDBRow>

            <MDBRow>
  
                {loaderPage &&
                    <MDBCol>
                        <div className="loader">
                            <span className="element"></span>
                            <span className="element "></span>
                            <span className="element"></span>
                        </div>
                </MDBCol>}
                {showDataPortfolios.map((child, index) => (
                    <MDBCol
                        key={child.portfolio_uid ? child.portfolio_uid : index}
                        className="py-3"
                        md="6"
                        xl="4">
                        <MDBAnimation
                            reset={true}
                            animation='pulse'
                            start='onHover'
                            duration={500}
                        >

                            <MDBCard
                                style={{ cursor: "pointer" }}
                                onClick={(e) => {
                                    navigate(`/portfolio/${encodeURIComponent(child.portfolio_uid)}`);
                                }}
                                className=" border-0 rounded-3">
                                <MDBCardHeader className="d-flex justify-content-between align-items-center" style={{ backgroundColor:"rgb(38, 53, 80)", color:"white"}}>
                                    <div>
                                        <div className="fw-bold">
                                            <i className="fas fa-wallet"></i>{" "}
                                            {statusMap[child.category] || child.category}
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center">

                                        <MDBIcon fas icon="bell" />


                                    </div>
                                </MDBCardHeader>
                                <MDBCardBody>
                                    {/* Header */}
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <MDBCardTitle className="mb-0">{child.title}</MDBCardTitle>
                                        <MDBIcon fas icon="fire" className="text-warning" />
                                    </div>

                                    {/* Valore investito */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Totale Investito</MDBCardText>
                                        <h5 className=" mb-0">{child.cash_position}</h5>
                                    </div>


                                    {/* Obbiettivo de raggiungere */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Obbiettivo da raggiungere</MDBCardText>
                                        <span className="">{child.target}€</span>
                                    </div>

                                    {/* Rendimento totale */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Tempo Prevvisto</MDBCardText>
                                        <span className="">{child.time_horizon_years} Anni</span>
                                    </div>


                                    {/* Rendimento totale */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Rendimento (totale)</MDBCardText>
                                        <span className="text-success fw-bold">+15,20%</span>
                                    </div>


                                    {/* Valore attuale */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Valore Attuale</MDBCardText>
                                        <h5 className="fw-bold mb-0">350.120,50 €</h5>
                                    </div>





                                    <hr />

                                    {/* Rendimento mensile */}
                                    <MDBCardText className="text-muted small mb-2">Rendimento Mensile</MDBCardText>
                                    <div
                                        className="d-flex align-items-center justify-content-center bg-light text-muted mb-3"
                                        style={{ height: "200px", borderRadius: "8px" }}
                                    >

                                        <ResponsiveBar
                                            data={data}
                                            keys={["Percentuale"]}
                                            indexBy="mese"
                                            margin={{ top: 5, right: 30, bottom: 20, left: 45 }}
                                            axisLeft={{
                                                legend: " %",
                                                legendOffset: -40,
                                                legendPosition: "middle",
                                            }}
                                            labelSkipWidth={12}
                                            labelSkipHeight={12}
                                            colors={({ value }) =>
                                                value != null && value >= 0
                                                    ? "rgba(0, 115, 1, 0.5)"
                                                    : "rgba(229, 0, 0, 0.5)"
                                            }
                                        />
                                    </div>

                                    <hr />

                                    {/* Tag degli asset */}
                                    <div className="d-flex flex-wrap gap-2">
                                        <MDBBadge color="light" className="text-dark border">Azioni</MDBBadge>
                                        <MDBBadge color="light" className="text-dark border">ETF</MDBBadge>
                                        <MDBBadge color="light" className="text-dark border">Cripto</MDBBadge>
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </MDBAnimation>
                    </MDBCol>
                ))}
            </MDBRow>
        </MDBContainer>

    );
};

export default PortfoliosDashboard;
