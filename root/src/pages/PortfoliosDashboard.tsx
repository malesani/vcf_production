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
    MDBDropdownItem,
    MDBProgress,
    MDBProgressBar
} from 'mdb-react-ui-kit'

import { PortfolioInfo, get_portfoliosList, get_portfoliosListPaginated } from '../api_module/portfolio/PortfolioData';

import { getMapping } from '../api_module_v1/MappingRequest';

import { useNavigate } from 'react-router-dom';

import General_Loading from "../app_components/General_Loading";

import Pagination from "../app_components/TableData/components/Pagination";

import { TableFilters } from "../app_components/TableData/interfaces"
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

    const [statusMap, setStatusMap] = useState<Record<string, string>>({});


    // ── Filtri tabella ─────────────────────────────────────────────────────────
    const [filters, setFilters] = useState<TableFilters<PortfolioInfo>>({
        page: 1,
        per_page: 5
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [itemsNum, setItemsNum] = useState<number>(0);
    const [pagesNum, setPagesNum] = useState<number>(1);


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
            let mounted = true;
            try {
                const response = await get_portfoliosListPaginated(filters);
                console.log(response)
                if (!mounted) return;
                if (response.success && data) {
                    setItemsNum(response.data!.meta.items_num);
                    setPagesNum(response.data!.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero operazioni");
                }

                if (response.success && response.data) {
                    const list = response.data.rows ?? []; // <-- prendi l’array giusto
                    console.log(list)
                    setShowDataPortfolios(list);
                    setManagedDataPortfolios(list);
                } else {
                    setShowDataPortfolios([]);
                    setManagedDataPortfolios([]);
                }
            } catch (e: any) {
                if (mounted) setError(e?.message || "Errore di rete");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
    }, []);
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
            let mounted = true;
            try {
                const response = await get_portfoliosListPaginated(filters);
                console.log(response)
                if (!mounted) return;
                if (response.success && data) {
                    setItemsNum(response.data!.meta.items_num);
                    setPagesNum(response.data!.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero operazioni");
                }

                if (response.success && response.data) {
                    const list = response.data.rows ?? []; // <-- prendi l’array giusto
                    console.log(list)
                    setShowDataPortfolios(list);
                    setManagedDataPortfolios(list);
                } else {
                    setShowDataPortfolios([]);
                    setManagedDataPortfolios([]);
                }
            } catch (e: any) {
                if (mounted) setError(e?.message || "Errore di rete");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        loadData();
    }, [filters]);


    // ── Handlers filtri ─────────────────────────────────────────────────────────
    const setCurrentPage = (page: number) => setFilters((p) => ({ ...p, page }));
    const setRowsForPage = (per_page: number) => setFilters((p) => ({ ...p, per_page, page: 1 }));
    const setTypePortfolio = (type: string) => setFilters((p) => ({ ...p, type, page: 1, }));


    return (
        <MDBContainer>
            <MDBRow className='align-items-center'>
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
                <MDBCol className="" md="6" xl="4">
                    <MDBCard className="shadow-sm border-0 rounded-3 flex-row align-items-center" style={{ maxHeight: "", height: "150px" }}>
                        <MDBCardBody>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <MDBCardTitle className="text-muted small mb-2">
                                        Valore Totale dei miei Portafogli
                                    </MDBCardTitle>
                                    <h3 className="fw-bold mb-1">
                                        {
                                            showDataPortfolios.reduce(
                                                (acc, child) => acc + (child.totals?.total_with_cash || 0),
                                                0
                                            )
                                        }
                                    </h3>
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
            </MDBRow>

            <MDBRow>
                <MDBCol className='d-flex align-items-center justify-content-between' style={{ margin: "40px 0px 20px 0px" }}>
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
                                <MDBIcon fas icon="filter" /> Filtra per tipo
                            </MDBDropdownToggle>
                            <MDBDropdownMenu>
                                {["Tutti", "custom", "managed", "game"].map((n) => (
                                    <MDBDropdownItem
                                        link
                                        key={n}
                                        onClick={() => n.toLowerCase() === "tutti" ? setTypePortfolio("") : setTypePortfolio(n)}
                                    >
                                        {n}
                                    </MDBDropdownItem>
                                ))}
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
                {loading && (
                    <General_Loading theme="formLoading" text="Caricamento Portafogli" />
                )}
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
                                <MDBCardHeader className="d-flex justify-content-between align-items-center" style={{ backgroundColor: "rgb(38, 53, 80)", color: "white" }}>
                                    <div>
                                        <div className="fw-bold">
                                            <i className="fas fa-wallet"></i>{" "}
                                            {statusMap[child.type.toUpperCase()] || child.type.toUpperCase()}
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
                                        <h5 className=" mb-0">{child.cash_position} €</h5>
                                    </div>


                                    {/* Obbiettivo de raggiungere */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Obbiettivo</MDBCardText>
                                        <span className="">{child.target}€ in {child.time_horizon_years} Anni</span>
                                    </div>




                                    {/* Rendimento totale */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Liquidita Attuale</MDBCardText>
                                        <span className="text-success fw-bold">{child.totals!.cash_position} €</span>
                                    </div>


                                    {/* Valore attuale */}
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Valore Attuale</MDBCardText>
                                        <h5 className="fw-bold mb-0">{child.totals!.total_with_cash ?? 0 } €</h5>
                                    </div>

                                    <hr />

                                    {/* Rendimento mensile */}
                                    {/* <MDBCardText className="text-muted small mb-2">Rendimento Mensile</MDBCardText>
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
                                    </div> */}
                                    <div className="text-end">
                                        <span className="text-muted me-1">Progresso</span>
                                        <span className="fw-bold">
                                            {Math.min((child.totals!.total_with_cash / child.target) * 100, 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <MDBProgress className="mb-3 rounded" style={{ height: "10px" }}>
                                        <MDBProgressBar
                                            width={Math.min((child.totals!.total_with_cash / child.target) * 100, 100)}
                                            bgColor="info"
                                            valuemin={0}
                                            valuemax={100}
                                            animated
                                        />
                                    </MDBProgress>


                                    {/* Tag degli asset */}
                                    <div className="d-flex flex-wrap gap-2">
                                        {child.assets && child.assets.length > 0 ? (
                                            child.assets.map((asset, i) => (
                                                <MDBBadge key={i} color="light" className="text-dark border">
                                                    {asset.symbol}
                                                </MDBBadge>
                                            ))
                                        ) : (
                                            <MDBBadge color="light" className="text-muted border">Nessun asset</MDBBadge>
                                        )}
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </MDBAnimation>
                    </MDBCol>
                ))}

                <div className="d-flex justify-content-between align-items-center p-3">
                    <MDBDropdown>
                        <MDBDropdownToggle color="secondary" className="shadow-0">
                            Per pagina {filters.per_page}
                        </MDBDropdownToggle>
                        <MDBDropdownMenu>
                            {[10, 25, 50, 100].map((n) => (
                                <MDBDropdownItem link key={n} onClick={() => setRowsForPage(n)}>
                                    {n}
                                </MDBDropdownItem>
                            ))}
                        </MDBDropdownMenu>
                    </MDBDropdown>

                    <div className="text-muted small">Elementi: <b>{itemsNum}</b></div>

                    <Pagination
                        setCurrentPage={setCurrentPage}
                        currentPage={filters.page ?? 1}
                        totalPages={pagesNum}
                    />
                </div>
            </MDBRow>
        </MDBContainer >

    );
};

export default PortfoliosDashboard;
