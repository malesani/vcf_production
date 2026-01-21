import React, { useEffect, useState } from 'react';
import General_Loading from "../app_components/General_Loading";
import { MDBCard, MDBCardBody } from 'mdb-react-ui-kit';
// import LineChart from '../components/simulation/LineChart';
import NivoPie from '../components/simulation/NivoPie';
import { PieDatum } from '../components/simulation/NivoPie';
import NivoChart from '../components/simulation/NivoChart';
import {
    fetchManagedPortfoliosActive, PortManagedInfo
} from '../api_module/portfolioManaged/PortManagedData';

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



const SimulationPage: React.FC = () => {

    const [loadingMode, setLoadingMode] = useState<boolean>(false);

    const [managedPortfoliosInfo, setManagedPortfoliosInfo] = useState<PortManagedInfo[]>([]);

    // FETCH DATA
    useEffect(() => {
        setLoadingMode(true);

        fetchManagedPortfoliosActive()
            .then((resp) => {
                if (resp.response.success && resp.data) {
                    setManagedPortfoliosInfo(resp.data)
                }
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
        return (<General_Loading theme="pageLoading" title='' />);
    }


    return (
        <div>
            <MDBCard>
                <MDBCardBody>
                    <div className='d-flex flex-row align-items-center'>
                        <i className="fas fa-chart-line" style={{ marginRight: "10px" }}></i>
                        <span className="fs-4 fw-bold" style={{ color: "rgba(26, 34, 56, 1)" }}>Simulatore Rendimento di Portafoglio</span>
                    </div>
                    <div className=' d-flex'>
                        <span style={{ color: "rgba(100, 116, 139, 1)", fontSize: "14px" }}>Simula i rendimenti dei nostri portafogli di investimento</span>
                    </div>
                </MDBCardBody>
            </MDBCard>
            <div className='d-flex justify-content-between'>
                <NivoChart
                    tempo_investimento={0}
                    contributo_mensile={0}
                    investimento_iniziale={0}
                    managedPortfoliosInfo={managedPortfoliosInfo}
                ></NivoChart>
            </div>
        </div>
    );
};

export default SimulationPage;
