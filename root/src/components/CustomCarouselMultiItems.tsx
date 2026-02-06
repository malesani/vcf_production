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
            const gap = 24; // lo stesso che usi in gap: "1.5rem"
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
            {/* Freccia sinistra */}
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

            {/* Contenitore orizzontale */}
            <div
                ref={carouselRef}
                style={{
                    display: "flex",
                    justifyContent: "flex-start", // 👈 importante
                    alignItems: "stretch",
                    gap: "1.5rem",
                    overflowX: "hidden",
                    // padding eliminato, così lo scroll arriva a 0 esatto
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
                                <div className="d-flex justify-content-between align-items-start" style={{ maxHeight: "67.97px", overflow: "hidden" }}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Reddito stabile</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Portafoglio diversificato in obbligazioni e azioni da dividendo.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Basso
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+1.85%</h4>
                                    <p className="mb-0">Rendimento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Vedi dettaglio
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
                                <div className="d-flex justify-content-between align-items-start" style={{ maxHeight: "67.97px", overflow: "hidden" }}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Futuro emergente</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Investimento ad alto rischio nei mercati emergenti.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Alto
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+15.4%</h4>
                                    <p className="mb-0">Rendimento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="dark" size="sm" className="fw-bold">
                                        Vedi dettaglio
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
                                <div className="d-flex justify-content-between align-items-start" style={{ maxHeight: "67.97px", overflow: "hidden" }}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Pianeta verde</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Aziende leader nella sostenibilità e nelle energie rinnovabili.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="warning" pill>
                                        Medio
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+4.50%</h4>
                                    <p className="mb-0">Rendimento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Vedi dettaglio
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
                                <div className="d-flex justify-content-between align-items-start" style={{ maxHeight: "67.97px", overflow: "hidden" }}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Reddito stabile</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Portafoglio diversificato in obbligazioni e azioni da dividendo.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Basso
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+1.85%</h4>
                                    <p className="mb-0">Rendimento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Vedi dettaglio
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
                                <div className="d-flex justify-content-between align-items-start" style={{ maxHeight: "67.97px", overflow: "hidden" }}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Futuro emergente</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Investimento ad alto rischio nei mercati emergenti.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="dark" pill>
                                        Alto
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+15.4%</h4>
                                    <p className="mb-0">Rendimento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="dark" size="sm" className="fw-bold">
                                        Vedi dettaglio
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
                                <div className="d-flex justify-content-between align-items-start" style={{ maxHeight: "67.97px", overflow: "hidden" }}>
                                    <div>
                                        <MDBCardTitle className="h6 mb-1">Pianeta verde</MDBCardTitle>
                                        <MDBCardText className="small">
                                            Aziende leader nella sostenibilità e nelle energie rinnovabili.
                                        </MDBCardText>
                                    </div>
                                    <MDBBadge color="warning" pill>
                                        Medio
                                    </MDBBadge>
                                </div>
                                <div className="text-center my-3">
                                    <h4 className="fw-bold">+4.50%</h4>
                                    <p className="mb-0">Rendimento</p>
                                </div>
                                <div className="text-end">
                                    <MDBBtn color="light" size="sm" className="fw-bold">
                                        Vedi dettaglio
                                    </MDBBtn>
                                </div>
                            </MDBCardBody>
                        </MDBCard>
                    </MDBAnimation>
                </div>
            </div>

            {/* Freccia destra */}
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
