import React, { useEffect, useState } from 'react';
import { PortManagedInfo } from '../../api_module/portfolioManaged/PortManagedData';
import { ResponsiveLine } from '@nivo/line';

import { GeneralForm, FieldConfig } from '../../app_components/GeneralForm';

import DialogInfo from './DialogInfo';

import { InputSimulation } from './constants';


export interface InfoChartProps {
    tempo_investimento: number;
    contributo_mensile: number;
    investimento_iniziale: number;
    managedPortfoliosInfo?: PortManagedInfo[];
}



export const NivoPie: React.FC<InfoChartProps> = ({
    tempo_investimento: tempoInvestimentoProp,
    contributo_mensile: contributoMensileProp,
    investimento_iniziale: investimentoInizialeProp,
    managedPortfoliosInfo: managedPortfoliosInfo = [] }) => {


    //cons mutabili per manipolare il rendirizzato della pagina 
    const [investimentoIniziale, setInvestimentoInizialeProp] = useState<number>(investimentoInizialeProp);

    const [contributoMensile, setContributoMensile] = useState<number>(contributoMensileProp);

    const [tempoInvestimento, setTempoInvestimento] = useState<number>(tempoInvestimentoProp);

    //anni generati dopo il renderizato del useEffect
    const [labelAnniGenerati, setlabelAnniGenerati] = useState<number[]>([]);

    const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");

    //per gestione portafogli
    const [datasets, setDatasets] = useState<any[]>([]);

    const [infoCards, setInfoCards] = useState<{ label: string; value: string }[]>([]);

    //renderizzato dei portafogli

    function calcularVolXAnno(CapInit: number, ContrMens: number, Perc: number, AnniVisualizzati: number): number[] {
        const VolXanno: number[] = [];
        VolXanno[0] = Number(CapInit);

        for (let a = 1; a < AnniVisualizzati; a++) {
            VolXanno[a] = Number((12 * ContrMens + VolXanno[a - 1] * (1 + (Perc / 100))).toFixed(2));
        }

        return VolXanno;
    }

    //creazione dei dataSet portafogli
    useEffect(() => {
        if (!managedPortfoliosInfo.length || !labelAnniGenerati.length) return;

        const defaultManagedPortUid = managedPortfoliosInfo[0].managed_uid ?? '';
        const nuoviDatasets = managedPortfoliosInfo
            .filter(p => p.managed_uid === selectedPortfolioId || (!selectedPortfolioId && p.managed_uid === defaultManagedPortUid))
            .flatMap((portafoglio, index) => {
                const datasets: any[] = [];

                // calcolo con adv_growthPercentFrom
                if (portafoglio.adv_growthPercentFrom != null) {
                    const valoriFrom = calcularVolXAnno(
                        investimentoIniziale,
                        contributoMensile,
                        portafoglio.adv_growthPercentFrom,
                        labelAnniGenerati.length
                    );

                    const dataFrom = labelAnniGenerati.map((anno, i) => ({
                        x: anno,
                        y: Math.round((valoriFrom[i] ?? 0) * 100) / 100
                    }));

                    datasets.push({
                        id: `${portafoglio.adv_growthPercentFrom}%`,
                        data: dataFrom
                    });
                }

                // calcolo con adv_growthPercentTo
                if (portafoglio.adv_growthPercentTo != null) {
                    const valoriTo = calcularVolXAnno(
                        investimentoIniziale,
                        contributoMensile,
                        portafoglio.adv_growthPercentTo,
                        labelAnniGenerati.length
                    );

                    const dataTo = labelAnniGenerati.map((anno, i) => ({
                        x: anno,
                        y: Math.round((valoriTo[i] ?? 0) * 100) / 100
                    }));

                    datasets.push({
                        id: `${portafoglio.adv_growthPercentTo}%`,
                        data: dataTo
                    });
                }

                return datasets;
            });

        console.log(nuoviDatasets, "nuoviDatasets")
        setDatasets(nuoviDatasets);
    }, [managedPortfoliosInfo, investimentoIniziale, contributoMensile, tempoInvestimento, labelAnniGenerati, selectedPortfolioId]);



    //renderizzato degli anni
    useEffect(() => {
        const annoAttuale = new Date().getFullYear();
        const nuoviAnni = [];

        for (let i = 0; i <= tempoInvestimento; i++) {
            nuoviAnni.push(annoAttuale + i);
        }

        setlabelAnniGenerati(nuoviAnni);
    }, [tempoInvestimento]);

    useEffect(() => {
        if (datasets.length < 2 || !labelAnniGenerati.length) return;

        const anni = labelAnniGenerati.length - 1;

        const investimentoInizialeNum = Number(investimentoIniziale) || 0;
        const contributoMensileNum = Number(contributoMensile) || 0;

        const contributoTotale = investimentoInizialeNum + contributoMensileNum * 12 * anni;

        const dataFrom = datasets[0].data;
        const dataTo = datasets[1].data;

        const finaleFrom = dataFrom[dataFrom.length - 1].y;
        const finaleTo = dataTo[dataTo.length - 1].y;

        const guadagnoFrom = finaleFrom - contributoTotale;
        const guadagnoTo = finaleTo - contributoTotale;

        const CAGRfrom =
            anni > 0
                ? ((finaleFrom / investimentoInizialeNum) ** (1 / anni) - 1) * 100
                : 0;
        const CAGRto =
            anni > 0
                ? ((finaleTo / investimentoInizialeNum) ** (1 / anni) - 1) * 100
                : 0;

        const valoriCombinati = [
            ...dataFrom.map((p: { x: number; y: number }) => p.y),
            ...dataTo.map((p: { x: number; y: number }) => p.y),
        ];
        const media = valoriCombinati.reduce((a, b) => a + b, 0) / valoriCombinati.length;
        const varianza =
            valoriCombinati.reduce((a, b) => a + Math.pow(b - media, 2), 0) /
            valoriCombinati.length;
        const devStd = Math.sqrt(varianza);

        setInfoCards([
            { label: "Valore finale", value: `${finaleFrom.toFixed(2)} € – ${finaleTo.toFixed(2)} €` },
            { label: "Guadagno netto", value: `${guadagnoFrom.toFixed(2)} € – ${guadagnoTo.toFixed(2)} €` },
            { label: "Rendimento medio annuo", value: `${CAGRfrom.toFixed(2)} % – ${CAGRto.toFixed(2)} %` },
            { label: "Deviazione standard", value: `${devStd.toFixed(2)} €` },
        ]);
    }, [datasets, investimentoIniziale, contributoMensile, tempoInvestimento, labelAnniGenerati]);



    //creazione del form
    const Simulation_FormFields: FieldConfig<InputSimulation>[] = [
        { name: "years", label: "Investimento Iniziale (€)", required: true, grid: { md: 12 }, type: "number", properties: { minValue: 500, maxValue: 10000 } },
        { name: "contributoMensile", label: "Contributo Mensile (€)", required: true, grid: { md: 12 }, type: "number" },
        { name: "periodoInvestimento", label: "Periodo di Investimento (Anni)", required: true, grid: { md: 12 }, type: "number", properties: { minValue: 1, maxValue: 50 , defaultValue: 1},  },
        {
            name: "manegId", label: "Modello di Portafoglio", required: true, grid: { md: 12 }, type: "selectbox",
            properties: { preventFirstSelection: false }, options: managedPortfoliosInfo.length ? managedPortfoliosInfo.map(m => ({ value: m.managed_uid || "", text: m.title || "" })) : []
        }

    ]
    return (
        <div className="d-flex justify-content-between flex-wrap" style={{ width: "100%" }}>
            <div className="card px-5 py-4" style={{ minWidth: "200px", maxHeight: "450px", width: "35%", margin: "2% 0" }}>
                <div>
                    <div className="d-flex flex-row align-items-center">
                        <div className="me-2">
                            {/* SVG Icon */}
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="20" viewBox="0 0 19 20" fill="none">
                                <g clipPath="url(#clip0_6_1079)">
                                    <path d="M14.2124 2.10294H4.73737C3.86522 2.10294 3.1582 2.81007 3.1582 3.68236V16.3178C3.1582 17.1901 3.86522 17.8972 4.73737 17.8972H14.2124C15.0845 17.8972 15.7915 17.1901 15.7915 16.3178V3.68236C15.7915 2.81007 15.0845 2.10294 14.2124 2.10294Z" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6.31689 5.26178H12.6336" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12.6333 11.5795V14.7383" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M12.6333 8.42062H12.6412" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9.4751 8.42062H9.48299" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6.31689 8.42062H6.32479" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9.4751 11.5795H9.48299" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6.31689 11.5795H6.32479" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M9.4751 14.7383H9.48299" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M6.31689 14.7383H6.32479" stroke="#1A2238" strokeWidth="1.57917" strokeLinecap="round" strokeLinejoin="round" />
                                </g>
                                <defs>
                                    <clipPath id="clip0_6_1079">
                                        <rect width="18.95" height="20" fill="white" />
                                    </clipPath>
                                </defs>
                            </svg>
                        </div>
                        <div>
                            <div className="fs-5 fw-semibold">
                                Parametri di Simulazione
                            </div>
                        </div>
                    </div>
                    <div className="text-muted">
                        Regola i valori per vedere diversi scenari
                    </div>
                </div>

                <GeneralForm<InputSimulation>
                    mode="create"
                    fields={Simulation_FormFields}
                    disableSubmit={true}
                    createData={async (payload: InputSimulation) => {
                        return {
                            response: {
                                success: true,
                                message: "Created successfully"
                            },
                            data: payload
                        };
                    }}
                    onChange={(formData) => {
                        setInvestimentoInizialeProp(formData.years || 0);
                        setContributoMensile(formData.contributoMensile || 0);
                        setTempoInvestimento(formData.periodoInvestimento || 0);
                        setSelectedPortfolioId(formData.manegId || "");
                    }}
                />
            </div>

            {/* Card derecha */}
            <div className="card my-2 flex-grow-1" style={{ minWidth: "400px", flex: "0 0 60%" }}>
                <div className="w-100 d-flex flex-column my-2" style={{ height: "700px" }}>
                    <ResponsiveLine
                        data={datasets}
                        margin={{ top: 50, right: 110, bottom: 90, left: 60 }}
                        yScale={{ type: 'linear', min: 'auto', max: 'auto', stacked: false, reverse: false }}
                        axisBottom={{ legend: 'Anni', legendOffset: 36, legendPosition: 'middle' }}
                        axisLeft={{ legend: 'Valore (€)', legendOffset: -40, legendPosition: 'middle' }}
                        pointSize={10}
                        pointColor={{ theme: 'background' }}
                        pointBorderWidth={2}
                        pointBorderColor={{ from: 'seriesColor' }}
                        pointLabelYOffset={-12}
                        enableTouchCrosshair={true}
                        useMesh={true}
                        legends={[
                            {
                                anchor: 'bottom',
                                direction: 'row',
                                translateX: 4,
                                translateY: 73,
                                itemWidth: 80,
                                itemHeight: 22,
                                symbolShape: 'circle',
                                itemsSpacing: 120
                            }
                        ]}
                    />
                </div>

                <div className="d-flex justify-content-around overflow-auto">
                    {infoCards.map((c, i) => (
                        <DialogInfo key={i} label={c.label} value={c.value} />
                    ))}
                </div>
            </div>
        </div>

    )
}


export default NivoPie;