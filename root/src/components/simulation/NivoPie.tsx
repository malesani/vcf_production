import { useNavigate } from 'react-router-dom';
import { MDBCol, MDBRow, MDBContainer, MDBCard, MDBCardBody, MDBCardHeader, MDBCardTitle, MDBCardText, MDBBadge } from 'mdb-react-ui-kit'
import { ResponsivePie } from '@nivo/pie';
import { MDBBtn } from 'mdb-react-ui-kit';
// import { useIsMobile } from '../../app_components/ResponsiveModule';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';

export interface PieDatum {
    id?: string | number;
    label?: string;
    value?: number;
    color?: string;
}

export interface PieProps {
    data: PortManagedInfo;
    pieData: PieDatum[];
}

export const NivoPie: React.FC<PieProps> = ({ data, pieData }) => {
    const navigate = useNavigate();

    const adv_growthPercent: string = (data.adv_growthPercentTo ? (data.adv_growthPercentFrom + '-' + data.adv_growthPercentTo) : (data.adv_growthPercentFrom + '+'));
    const adv_timeRange: string = (data.adv_timeRangeTo ? (data.adv_timeRangeFrom + '-' + data.adv_timeRangeTo) : (data.adv_timeRangeFrom + '+'));
    return (<>
        <MDBCol>
            <MDBCard className="shadow-3 mb-3" style={{ borderRadius: "15px" }}>
                {/* Header */}
                <MDBCardHeader className="text-white text-center fs-5 fw-bold" style={{ backgroundColor: "#263550" }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                    >
                        <g clipPath="url(#clip0_39_12)">
                            <path
                                d="M18.3332 5.83334L11.2498 12.9167L7.08317 8.75001L1.6665 14.1667"
                                stroke="white"
                                strokeWidth="1.66667"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M13.3335 5.83334H18.3335V10.8333"
                                stroke="white"
                                strokeWidth="1.66667"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </g>
                        <defs>
                            <clipPath id="clip0_39_12">
                                <rect width="20" height="20" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
                    <span className=" fw-semibold  ms-2">{data.title}</span>
                </MDBCardHeader>

                {/* Body */}
                <MDBCardBody>
                    <MDBCardTitle className="fs-6 fw-bold text-dark">{data.title}</MDBCardTitle>
                    <MDBCardText className="text-muted mb-3" style={{ minHeight: "40px", overflow: "hidden" }}>
                        {data.description}
                    </MDBCardText>

                    {/* Badges */}
                    <div className="d-flex gap-2 mb-4">
                        <MDBBadge color="warning" light>
                            Rischio Medio
                        </MDBBadge>
                        <MDBBadge color="light" className="text-dark border">
                            Azioni
                        </MDBBadge>
                    </div>

                    {/* Performance */}

                    <div style={{ height: "100px", minHeight: "200px" }}>
                        <ResponsivePie
                            data={pieData}
                            margin={{ top: 40, right: 200, bottom: 40, left: 40 }}
                            innerRadius={0.5}
                            padAngle={0.6}
                            cornerRadius={2}
                            activeOuterRadiusOffset={8}
                            enableArcLinkLabels={false}
                            arcLinkLabelsSkipAngle={10}
                            arcLinkLabelsTextColor="#333333"
                            arcLinkLabelsThickness={2}
                            arcLinkLabelsColor={{ from: "color" }}
                            enableArcLabels={false}
                            arcLabelsSkipAngle={10}
                            arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
                            legends={[
                                {
                                    anchor: "right",
                                    direction: "column",
                                    justify: false,
                                    translateX: 150,
                                    translateY: 0,
                                    itemsSpacing: 8,
                                    itemWidth: 125,
                                    itemHeight: 24,
                                    symbolSize: 14,
                                    symbolShape: "square",
                                },
                            ]}
                        />
                    </div>

                    {/* Stats */}
                    <div className="d-flex justify-content-between mb-3">
                        <small className="text-danger">
                            Ultimo Mese: <strong>-0,5%</strong>
                        </small>
                        <small className="text-danger">
                            Ultimo Anno: <strong>-14,3%</strong>
                        </small>
                    </div>

                    <div className="d-flex justify-content-between mb-3">
                        <div className="d-flex align-items-center fw-bold w-75">
                            <span className="">Rendimento Annuale Atteso:</span>
                        </div>
                        <span>{adv_growthPercent}%</span>
                    </div>

                    <div className="d-flex justify-content-between mb-3">
                        <div className="d-flex align-items-center fw-bold w-75">
                            {/* <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 18 18"
                                    fill="none"
                                >
                                    <circle cx="9" cy="9" r="8" stroke="black" strokeWidth="1.5" />
                                    <path d="M5 9.5H9.5V4" stroke="black" strokeWidth="1.5" strokeLinecap="round" />
                                </svg> */}
                            <span className="">Orizzonte Temporale Consigliato:</span>
                        </div>
                        <span>{adv_timeRange} anni</span>
                    </div>

                    <MDBBtn
                        onClick={() => {
                            navigate(`/managed_portfolio_dashboard/${encodeURIComponent(data.managed_uid)}`);
                        }}
                        className='d-flex align-items-center justify-content-center'
                        style={{
                            backgroundColor: "rgba(34, 55, 74, 1)",
                            color: "rgba(255, 255, 255, 1)",
                            borderRadius: "160px",
                            margin: "5% 10%",
                            fontSize: "14px",
                        }}>
                        VISUALIZZA MAGGIORI DETTAGLI
                    </MDBBtn>
                </MDBCardBody>
            </MDBCard>
        </MDBCol>
    </>);
}


export default NivoPie;
