import React, { useRef } from "react";
import {
    MDBCard,
    MDBCardBody,
    MDBCardTitle,
    MDBCardText,
    MDBBtn,
    MDBBadge,
    MDBAnimation
} from "mdb-react-ui-kit";


export const CustomCarouselMultiItems: React.FC = () => {
    const carouselRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: "left" | "right") => {
        if (carouselRef.current) {
            const container = carouselRef.current;
            const card = container.querySelector("div > .mdb-card") as HTMLElement;
            const cardWidth = card ? card.offsetWidth : 300;
            const gap = 24; // el mismo que usas en gap: "1.5rem"
            const scrollAmount = cardWidth + gap;

            let newScroll =
                container.scrollLeft + (direction === "left" ? -scrollAmount : scrollAmount);

            const maxScroll = container.scrollWidth - container.clientWidth;
            if (newScroll < 0) newScroll = 0;
            if (newScroll > maxScroll) newScroll = maxScroll;

            container.scrollTo({ left: newScroll, behavior: "smooth" });
        }
    };

    return (
        <div style={{ position: "relative", padding: "0.5rem 0px" }}>
            {/* Flecha izquierda */}
            <button
                onClick={() => scroll("left")}
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "0",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    background: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    cursor: "pointer"
                }}
            >
                ‹
            </button>

            {/* Contenedor horizontal */}
            <div
                ref={carouselRef}
                style={{
                    display: "flex",
                    justifyContent: "flex-start", // 👈 importante
                    alignItems: "stretch",
                    gap: "1.5rem",
                    overflowX: "hidden",
                    // padding eliminado, así el scroll llega a 0 exacto
                }}
            >
                {/* Card 1 */}
                <div 
                    style={{ flex: "0 0 300px" }}
                    className="my-3"
                >
                    <MDBAnimation
                        reset={true}
                        animation='pulse'
                        start='onHover'
                        duration={500}
                    >

                        <MDBCard
                            className="text-white h-100"
                            style={{
                                background: "linear-gradient(135deg, #2ebf91, #8360c3)",
                                borderRadius: "15px"
                            }}
                        >
                            <MDBCardBody className="d-flex flex-column justify-content-between h-100">
                                <div className="d-flex justify-content-between align-items-start" style={{maxHeight:"67.97px", overflow:"hidden"}}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Ingreso Estable</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Portafolio diversificado en bonos y acciones de dividendos.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Bajo
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+1.85%</h4>
                                    <p className="mb-0">Rendimiento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Ver Detalle
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>

                {/* Card 2 */}
                <div 
                    style={{ flex: "0 0 300px" }}
                    className="my-3"
                >
                    <MDBAnimation
                        reset={true}
                        animation='pulse'
                        start='onHover'
                        duration={500}
                    >

                        <MDBCard
                            className="text-white h-100"
                            style={{
                                background: "linear-gradient(135deg, #d32f2f, #ef5350)",
                                borderRadius: "15px"
                            }}
                        >
                            <MDBCardBody className="d-flex flex-column justify-content-between h-100">
                                <div className="d-flex justify-content-between align-items-start" style={{maxHeight:"67.97px", overflow:"hidden"}}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Futuro Emergente</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Inversión de alto riesgo en mercados emergentes.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Alto
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+15.4%</h4>
                                    <p className="mb-0">Rendimiento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="dark" size="sm" className="fw-bold">
                                        Ver Detalle
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>

                {/* Card 3 */}
                <div 
                    style={{ flex: "0 0 300px" }}
                    className="my-3"
                >
                    <MDBAnimation
                        reset={true}
                        animation='pulse'
                        start='onHover'
                        duration={500}
                    >

                        <MDBCard
                            className="text-white h-100"
                            style={{
                                background: "linear-gradient(135deg, #2196f3, #64b5f6)",
                                borderRadius: "15px"
                            }}
                        >
                            <MDBCardBody className="d-flex flex-column justify-content-between h-100">
                                <div className="d-flex justify-content-between align-items-start" style={{maxHeight:"67.97px", overflow:"hidden"}}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Planeta Verde</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Empresas líderes en sostenibilidad y energías renovables.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="warning" pill>
                                        Medio
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+4.50%</h4>
                                    <p className="mb-0">Rendimiento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Ver Detalle
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>
                {/* Card 1 */}
                <div 
                    style={{ flex: "0 0 300px" }}
                    className="m-3"
                >
                    <MDBAnimation
                        reset={true}
                        animation='pulse'
                        start='onHover'
                        duration={500}
                    >

                        <MDBCard
                            className="text-white h-100"
                            style={{
                                background: "linear-gradient(135deg, #2ebf91, #8360c3)",
                                borderRadius: "15px"
                            }}
                        >
                            <MDBCardBody className="d-flex flex-column justify-content-between h-100">
                                <div className="d-flex justify-content-between align-items-start" style={{maxHeight:"67.97px", overflow:"hidden"}}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Ingreso Estable</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Portafolio diversificado en bonos y acciones de dividendos.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Bajo
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+1.85%</h4>
                                    <p className="mb-0">Rendimiento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Ver Detalle
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>

                {/* Card 2 */}
                <div 
                    style={{ flex: "0 0 300px" }}
                    className="m-3"
                >
                    <MDBAnimation
                        reset={true}
                        animation='pulse'
                        start='onHover'
                        duration={500}
                    >

                        <MDBCard
                            className="text-white h-100"
                            style={{
                                background: "linear-gradient(135deg, #d32f2f, #ef5350)",
                                borderRadius: "15px"
                            }}
                        >
                            <MDBCardBody className="d-flex flex-column justify-content-between h-100">
                                <div className="d-flex justify-content-between align-items-start" style={{maxHeight:"67.97px", overflow:"hidden"}}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Futuro Emergente</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Inversión de alto riesgo en mercados emergentes.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Alto
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+15.4%</h4>
                                    <p className="mb-0">Rendimiento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="dark" size="sm" className="fw-bold">
                                        Ver Detalle
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>

                {/* Card 3 */}
                <div 
                    style={{ flex: "0 0 300px" }}
                    className="m-3"
                >
                    <MDBAnimation
                        reset={true}
                        animation='pulse'
                        start='onHover'
                        duration={500}
                    >

                        <MDBCard
                            className="text-white h-100"
                            style={{
                                background: "linear-gradient(135deg, #2196f3, #64b5f6)",
                                borderRadius: "15px"
                            }}
                        >
                            <MDBCardBody className="d-flex flex-column justify-content-between h-100">
                                <div className="d-flex justify-content-between align-items-start" style={{maxHeight:"67.97px", overflow:"hidden"}}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Planeta Verde</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Empresas líderes en sostenibilidad y energías renovables.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="warning" pill>
                                        Medio
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+4.50%</h4>
                                    <p className="mb-0">Rendimiento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Ver Detalle
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>
            </div>

            {/* Flecha derecha */}
            <button
                onClick={() => scroll("right")}
                style={{
                    position: "absolute",
                    top: "50%",
                    right: "0",
                    transform: "translateY(-50%)",
                    zIndex: 10,
                    background: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    cursor: "pointer"
                }}
            >
                ›
            </button>
        </div>
    );
};
