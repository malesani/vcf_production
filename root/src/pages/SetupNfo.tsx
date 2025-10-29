import React, { useEffect, useState, useMemo } from 'react';
import {
    MDBBtn,
    MDBRow,
    MDBCol,
    MDBCard,
    MDBCardBody,
    MDBCardHeader,
} from 'mdb-react-ui-kit';

import General_Loading from "../app_components/General_Loading";
import { GeneralTable, ColumnConfig } from "../app_components/GeneralTable";
import { FieldConfig, SelectData, GeneralForm } from '../app_components/GeneralForm';
import { General_ContentSwitcher, ContentConfig } from '../app_components/General_ContentSwitcher';

import { getStocksInfo } from '../api_module_v1/FinancialDataRequest';
import { NfoInfo, NfoAsset_Report, NfoAsset_Alert, createNfo_alert, createNfo_report, getNfoListReportsAll, getNfoListAlertsAll, upsertNfo_report, upsertNfo_alert } from '../api_module/nfo/NfoData';
import {
    fetchManagedPortfoliosActive, PortManagedInfo
} from '../api_module/portfolioManaged/PortManagedData';


const SetupNfo: React.FC = () => {
    const [loadingMode, setLoadingMode] = useState<boolean>(false);

    const [stocksInfoOptions, setStocksInfoOptions] = useState<SelectData[] | null>(null);
    const [managedPortfolios, setManagedPortfolios] = useState<PortManagedInfo[] | null>(null);
    const [managedPortfoliosOptions, setManagedPortfoliosOptions] = useState<SelectData[] | null>(null);

    
    // FETCH DATA
    useEffect(() => {
        setLoadingMode(true);
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
                    setManagedPortfoliosOptions(resp.data.map(managedPortsInfo => ({
                        value: managedPortsInfo.managed_uid,
                        text: managedPortsInfo.title,
                    })));

                    setManagedPortfolios(resp.data);
                }
            })
            .catch((err) => {
                console.error("Errore caricamento Managed Info:", err);
            })


        
    }, []);
    // END

    useEffect(() => {
        if (stocksInfoOptions && managedPortfolios) {
            console.log("stocksInfoOptions", stocksInfoOptions);
            console.log("managedPortfoliosOptions", managedPortfoliosOptions);
            console.log("managedPortfolios", managedPortfolios);
            
            setLoadingMode(false);
        }
    }, [stocksInfoOptions, managedPortfolios]);

    const NfoAssetAlert_FormFields: FieldConfig<NfoAsset_Alert>[] = [
        {
            name: "symbol", label: "Seleziona Stock", required: true, grid: { md: 8 },
            type: "selectbox", options: stocksInfoOptions as SelectData[],
            properties: {
                largeDataSearch: true
            },
        },
        { name: "operator", label: "Valore totale asset", required: true, grid: { md: 4 }, type: "selectbox", options: [{ value: 'sell', text: 'Compra' }, { value: 'buy', text: 'Vendi' }] },
        { name: "percentage", label: "Percentuale su controvalore precedente", required: false, grid: { md: 12 }, type: "number" },
    ];

    const NfoAlert_FormFields: FieldConfig<NfoInfo>[] = [
        { name: "title", label: "Titolo Alert", required: true, grid: { md: 7 } },
        {
            name: "managed_uid", label: "Modello di Portafoglio", required: true, grid: { md: 5 }, type: "selectbox",
            properties: { preventFirstSelection: true }, options: managedPortfoliosOptions as SelectData[]
        },
        { name: "description", label: "Breve descrizione", required: true, grid: { md: 12 }, type: "text_area" },
        { name: "html_body", label: "Pagina in HTML di info", required: true, grid: { md: 12 }, type: "richtext" },
        {
            name: "assets",
            label: "Operazioni",
            type: "repeater",
            required: true,
            grid: { md: 12 },
            subFields: NfoAssetAlert_FormFields as any,
            properties: {
                defaultItem: () => ({ symbol: null, operator: 'buy', percentage: null }),
            }, hrBefore: true
        }
    ];

    const NfoAlert_ColumnConfig = useMemo<ColumnConfig<NfoInfo>[]>(() => [
        { field: "title", label: "title" },
        { field: "description", label: "description" },
        { field: "status", label: "status" },
    ], []);

    const NfoAssetReport_FormFields: FieldConfig<NfoAsset_Report>[] = [
        {
            name: "symbol", label: "Seleziona Stock", required: true, grid: { md: 8 },
            type: "selectbox", options: stocksInfoOptions as SelectData[],
            properties: {
                largeDataSearch: true
            },
        },
        { name: "percentage", label: "Nuova percentuale", required: false, grid: { md: 4 }, type: "number" },
    ];

    const monthNumOptions = [
        { value: '1', text: 'Gennaio' },
        { value: '2', text: 'Febbraio' },
        { value: '3', text: 'Marzo' },
        { value: '4', text: 'Aprile' },
        { value: '5', text: 'Maggio' },
        { value: '6', text: 'Giugno' },
        { value: '7', text: 'Luglio' },
        { value: '8', text: 'Agosto' },
        { value: '9', text: 'Settembre' },
        { value: '10', text: 'Ottobre' },
        { value: '11', text: 'Novembre' },
        { value: '12', text: 'Dicembre' }
    ];
    const fullYear: number = new Date().getFullYear();
    const NfoReport_FormFields: FieldConfig<NfoInfo>[] = [
        { name: "title", label: "Titolo", required: true, grid: { md: 7 } },
        {
            name: "managed_uid", label: "Modello di Portafoglio", required: true, grid: { md: 5 }, type: "selectbox",
            properties: { preventFirstSelection: true }, options: managedPortfoliosOptions as SelectData[]
        },
        { name: "description", label: "Breve descrizione", required: true, grid: { md: 12 }, type: "text_area" },
        { name: "html_body", label: "Pagina in HTML di info", required: false, grid: { md: 12 }, type: "richtext" },
        { name: "year", label: "Anno di riferimento", required: true, grid: { md: 6 }, type: "number", properties: { minValue: 2025, maxValue: fullYear + 50, defaultValue: fullYear } },
        { name: "month_num", label: "Mese di riferimento", required: true, grid: { md: 6 }, type: "selectbox", options: monthNumOptions },
        {
            name: "assets",
            label: "Nuova composizione portafoglio",
            type: "repeater",
            required: true,
            grid: { md: 12 },
            subFields: NfoAssetReport_FormFields as any,
            properties: {
                defaultItem: () => ({ symbol: null, percentage: null }),
            }, hrBefore: true
        }
    ];

    const NfoReport_ColumnConfig = useMemo<ColumnConfig<NfoInfo>[]>(() => [
        { field: "year", label: "year" },
        { field: "month_num", label: "month_num" },
        { field: "title", label: "title" },
        { field: "description", label: "description" },
        { field: "status", label: "status" },
    ], []);

    // SET LOADING
    if (loadingMode) {
        return (<General_Loading theme="pageLoading" title='Pannello Amministratore' />);
    }


    const contents: ContentConfig[] = [
        {
            icon: 'bell',
            title: 'Reports',
            startOpen: false,
            contentElement: (
                <MDBCard className="mt-2 p-4">
                    <GeneralTable<NfoInfo, {}>
                        title="Gestione Reports"
                        icon="cogs"
                        columns={NfoReport_ColumnConfig}
                        fields={NfoReport_FormFields}
                        getData={getNfoListReportsAll}
                        createData={createNfo_report}
                        updateData={upsertNfo_report}
                        advancedFilters={true}
                        enableCreate={true}
                        disableNotVisible={{ update: false, delete: false }}
                    />
                </MDBCard>
            ),
        },
        {
            icon: 'exclamation-circle',
            title: 'Alerts',
            startOpen: true,
            contentElement: (
                <MDBCard className="mt-2 p-4">
                    <GeneralTable<NfoInfo, {}>
                        title="Gestione Alerts"
                        icon="cogs"
                        columns={NfoAlert_ColumnConfig}
                        fields={NfoAlert_FormFields}
                        getData={getNfoListAlertsAll}
                        createData={createNfo_alert}
                        updateData={upsertNfo_alert}
                        advancedFilters={false}
                        enableCreate={true}
                        disableNotVisible={{ update: false, delete: false }}
                    />
                </MDBCard>
            ),
        }
    ];

    return (<MDBCard className="p-0">
        <MDBCardHeader>
            <h5 className="text-start mb-0"><i className="fa fa-screwdriver-wrench fa-sm me-2"></i>Pannello Amministratore</h5>
        </MDBCardHeader>
        <MDBCardBody className="pt-2">
            <General_ContentSwitcher switchMode='tabs' properties={{ pills: true, fill: true }} contents={contents} />
        </MDBCardBody>
    </MDBCard>);

};

export default SetupNfo;
