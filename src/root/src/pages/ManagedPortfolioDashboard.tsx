import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { General_Loading } from '../app_components/General_Loading';

import ManagedPortRecap from '../components/managedPortfolio/ManagedPortRecap';
import {
    fetchManagedPortfolio, PortManagedInfo
} from '../api_module/portfolioManaged/PortManagedData';


const ManagedPortfolioDashboard: React.FC = () => {
    const { managed_uid } = useParams<{ managed_uid: string }>();

    const [loadingMode, setLoadingMode] = useState(true);


    const [managedInfo, setManagedInfo] = useState<PortManagedInfo>();


    useEffect(() => {
        if (!managed_uid) return;

        const loadAll = async () => {
            setLoadingMode(true);
            try {
                const managedResp = await fetchManagedPortfolio({ managed_uid });
                if (managedResp.response.success && managedResp.data) {
                    setManagedInfo(managedResp.data);
                    console.log('managedInfo', managedInfo);
                } else {
                    setManagedInfo(undefined);
                }


            } catch (err) {
                console.error("Errore caricamento portafoglio:", err);
            } finally {
                setLoadingMode(false);
            }
        };

        loadAll();
    }, [managed_uid]);

    if (loadingMode || !managed_uid) {
        return (<General_Loading theme="pageLoading" title='Dashboard Portafoglio' />);
    }        

    // ====== RENDER ======
    return (
        <ManagedPortRecap
            pieData={[
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
        ]}
            data={managedInfo as PortManagedInfo}
        />
    );
};

export default ManagedPortfolioDashboard;
