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
} from 'mdb-react-ui-kit';

import { PortfolioInfo, get_portfoliosListPaginated } from '../api_module/portfolio/PortfolioData';
import { getMapping } from '../api_module_v1/MappingRequest';
import { useNavigate } from 'react-router-dom';

import General_Loading from "../app_components/General_Loading";
import Pagination from "../app_components/TableData/components/Pagination";
import { TableFilters } from "../app_components/TableData/interfaces";

//data temporanea
const data = [
    { mese: "Maggio", Percentuale: -0.18 },
    { mese: "Giugno", Percentuale: 1.57 },
    { mese: "Luglio", Percentuale: 0.59 },
    { mese: "Agosto", Percentuale: 0.46 },
    { mese: "Settembre", Percentuale: 0.9 }
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

    function filterData(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value.toLowerCase();

        if (value !== "") {
            const filtered = managedDataPortfolios.filter(item =>
                item.title.toLowerCase().includes(value)
            );
            setShowDataPortfolios(filtered);
        } else {
            setShowDataPortfolios(managedDataPortfolios);
        }
    }

    useEffect(() => {
        getMapping('portfolio', 'category')
            .then(res => {
                const raw = res.data?.map || {};
                const norm: Record<string, string> = Object.fromEntries(
                    Object.entries(raw).map(([k, v]) => [String(k), String(v as any)])
                );
                setStatusMap(norm);
            })
            .catch(err => console.error('Errore mappa stato procedura:', err));
    }, []);

    useEffect(() => {
        const loadData = async () => {
            let mounted = true;
            try {
                const response = await get_portfoliosListPaginated(filters);
                if (!mounted) return;

                if (response.success && data) {
                    setItemsNum(response.data!.meta.items_num);
                    setPagesNum(response.data!.meta.pages_num);
                } else {
                    setError(response.message || "Errore nel recupero operazioni");
                }

                if (response.success && response.data) {
                    const list = response.data.rows ?? [];
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
    const setTypePortfolio = (type: string) => setFilters((p) => ({ ...p, type, page: 1 }));

    const totalValue = (
        showDataPortfolios.reduce(
            (acc, child) => acc + (child.totals?.total_with_cash || 0),
            0
        )
    ).toFixed(2);

    return (
        <MDBContainer fluid className="py-2">
            {/* ======= HEADER TOP (responsive) ======= */}
            <MDBRow className="align-items-stretch g-3">
                <MDBCol xs="12" lg="8">
                    <div className="py-2">
                        <div className="d-flex flex-row align-items-center">
                            <span className="fs-4 fw-bold text-dark">
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

                <MDBCol xs="12" lg="4">
                    <MDBCard
                        className="shadow-sm border-0 rounded-3 h-100"
                        style={{ background: "linear-gradient(135deg, rgba(15, 23, 43, 1), rgba(49, 65, 88, 1))" }}
                    >
                        <MDBCardBody className="d-flex align-items-center">
                            <div className="w-100">
                                <MDBCardTitle className="text-muted small mb-2">
                                    <span className='me-3 text-light'>
                                        Valore Totale dei miei Portafogli
                                    </span>
                                    <MDBIcon fas icon="sync-alt" color='white' />
                                </MDBCardTitle>
                                <h3 className="fw-bold mb-0 text-light">{totalValue} €</h3>
                            </div>
                        </MDBCardBody>
                    </MDBCard>
                </MDBCol>
            </MDBRow>

            {/* ======= TOOLBAR (responsive, NO overflow) ======= */}
            <MDBRow className="align-items-center g-2 mt-4">
                {/* Title */}
                <MDBCol xs="12" md="4">
                    <h3 className="fw-bold text-dark m-0 fs-6">I miei Portafogli</h3>
                </MDBCol>

                {/* Controls */}
                <MDBCol xs="12" md="8">
                    <div className="d-flex flex-column flex-md-row justify-content-md-end gap-2">
                        {/* Search: full width mobile */}
                        <MDBInputGroup
                            noWrap
                            className="d-flex align-items-center border rounded-3 px-2 bg-white w-100 w-md-auto"
                            style={{ maxWidth: 320 }}
                        >
                            <MDBIcon fas icon="search" />
                            <input
                                onChange={filterData}
                                className="form-control"
                                placeholder="Cerca per nome..."
                                type="text"
                                style={{ border: "none", boxShadow: "none" }}
                            />
                        </MDBInputGroup>

                        {/* Buttons: full width on mobile */}
                        <div className="d-flex flex-column flex-md-row gap-2 w-80 w-md-auto">
                            {/* Filter */}
                            <MDBDropdown className="w-100 w-md-auto">
                                <MDBDropdownToggle
                                    color="light"
                                    className="d-flex align-items-center gap-2 border rounded-3 w-100 w-md-auto"
                                >
                                    <MDBIcon fas icon="filter" /> Filtra per tipo
                                </MDBDropdownToggle>

                                <MDBDropdownMenu>
                                    {["Tutti", "custom", "managed", "game"].map((n) => (
                                        <MDBDropdownItem
                                            link
                                            key={n}
                                            onClick={() => (n.toLowerCase() === "tutti" ? setTypePortfolio("") : setTypePortfolio(n))}
                                        >
                                            {n}
                                        </MDBDropdownItem>
                                    ))}
                                </MDBDropdownMenu>
                            </MDBDropdown>

                            {/* New button */}
                            <MDBBtn
                                className="border rounded-3 w-100 w-md-auto"
                                style={{ backgroundColor: "rgb(38, 53, 80)" }}
                                onClick={() => navigate(`/new_portfolio/`)}
                            >
                                <MDBIcon fas icon="plus" className="me-2" /> Nuovo Portafoglio
                            </MDBBtn>
                        </div>
                    </div>
                </MDBCol>
            </MDBRow>

            {/* ======= LIST ======= */}
            <MDBRow className="g-3 mt-1">
                {loading && (
                    <MDBCol xs="12">
                        <General_Loading theme="formLoading" text="Caricamento Portafogli" />
                    </MDBCol>
                )}

                {showDataPortfolios.map((child, index) => (
                    <MDBCol
                        key={child.portfolio_uid ? child.portfolio_uid : index}
                        xs="12"
                        md="6"
                        xl="4"
                        className="py-1"
                    >
                        <MDBAnimation reset={true} animation='pulse' start='onHover' duration={500}>
                            <MDBCard
                                style={{ cursor: "pointer" }}
                                onClick={() => navigate(`/portfolio/${encodeURIComponent(child.portfolio_uid)}`)}
                                className="border-0 rounded-3 h-100"
                            >
                                <MDBCardHeader
                                    className="d-flex justify-content-between align-items-center"
                                    style={{ backgroundColor: child.type === 'managed' ? "#14A44D" : "#3B71CA", color: "white" }}
                                >

                                    <div className="fw-bold">
                                        {child.type === 'managed'
                                            ? child.managed_title
                                            : "Personale"}
                                    </div>


                                    {child.type === 'managed' && (
                                        <MDBIcon far icon="bell" />
                                    )}

                                </MDBCardHeader>

                                <MDBCardBody>


                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <MDBCardTitle className="mb-0">{child.title}</MDBCardTitle>
                                        <MDBIcon fas icon="fire" className="text-warning" />
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="fw-bold text-muted small mb-0">Obbiettivo</MDBCardText>
                                        <span className='fw-bold text-muted'>{child.target}€ in {child.time_horizon_years} Anni</span>
                                    </div>
                                    <hr />
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Liquidita Attuale</MDBCardText>
                                        <span className="text-success fw-bold">{child.totals!.cash_position} €</span>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Controvalore Attuale</MDBCardText>
                                        <span className="text-muted fw-bold">{child.totals!.total_with_cash ?? 0} €</span>


                                    </div>
                                    {/*                                     
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <MDBCardText className="text-muted small mb-0">Totale Investito</MDBCardText>
                                        <h5 className="mb-0">{child.cash_position} €</h5>
                                    </div> */}






                                    <hr />

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

                                    <div className="d-flex flex-wrap gap-2">
                                        {child.assets && child.assets.length > 0 ? (
                                            child.assets.map((asset, i) => (
                                                <MDBBadge key={i} color="light" className="text-dark border">
                                                    {asset.symbol}
                                                </MDBBadge>
                                            ))
                                        ) : (
                                            <MDBBadge color="light" className="text-muted border">
                                                Nessun asset
                                            </MDBBadge>
                                        )}
                                    </div>
                                </MDBCardBody>
                            </MDBCard>
                        </MDBAnimation>
                    </MDBCol>
                ))}
            </MDBRow>

            {/* ======= FOOTER (responsive) ======= */}
            <MDBRow className="align-items-center mt-2">
                <MDBCol col="4" sm="4" md="2">
                    <MDBDropdown>
                        <MDBDropdownToggle color="secondary" className="shadow-0 w-100 w-md-auto">
                            Per pagina
                        </MDBDropdownToggle>
                        <MDBDropdownMenu>
                            {[10, 25, 50, 100].map((n) => (
                                <MDBDropdownItem link key={n} onClick={() => setRowsForPage(n)}>
                                    {n}
                                </MDBDropdownItem>
                            ))}
                        </MDBDropdownMenu>
                    </MDBDropdown>
                </MDBCol>

                <MDBCol col="4" sm="4" md="8" className=" my-3 text-center text-md-center">
                    <div className="text-muted small">
                        Elementi: <b>{itemsNum}</b>
                    </div>
                </MDBCol>

                <MDBCol col="4" sm="4" md="2" className="d-flex justify-content-md-end justify-content-center">
                    <Pagination
                        setCurrentPage={setCurrentPage}
                        currentPage={filters.page ?? 1}
                        totalPages={pagesNum}
                    />
                </MDBCol>
            </MDBRow>
        </MDBContainer>
    );
};

export default PortfoliosDashboard;
