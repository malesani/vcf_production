
import React, { useEffect, useState } from 'react';
import { PortManagedInfo, fetchManagedPortfoliosActive } from '../../api_module/portfolioManaged/PortManagedData';
import {
    MDBChart,
    MDBCol,
    MDBRange,
    MDBDropdown,
    MDBDropdownMenu,
    MDBDropdownToggle,
    MDBDropdownItem
} from 'mdb-react-ui-kit';



export interface InfoChartProps {
    tempo_investimento: number;
    contributo_mensile: number;
    investimento_iniziale: number;
}

const LineChart: React.FC<InfoChartProps> = ({
    tempo_investimento: tempoInvestimentoProp,
    contributo_mensile: contributoMensileProp,
    investimento_iniziale: investimentoInizialeProp }) => {

    //cons mutabili per manipolare il rendirizzato della pagina 

    const [investimentoIniziale, setInvestimentoInizialeProp] = useState<number>(investimentoInizialeProp);

    const [contributoMensile, setContributoMensile] = useState<number>(contributoMensileProp);

    const [tempoInvestimento, setTempoInvestimento] = useState<number>(tempoInvestimentoProp);


    //anni generati dopo il renderizato del useEffect
    const [labelAnniGenerati, setlabelAnniGenerati] = useState<number[]>([]);

    //per gestione portafogli
    const [managedData, setManagedData] = useState<PortManagedInfo[]>([]);
    const [datasets, setDatasets] = useState<any[]>([]);

    //event rendirizzare chart (Anni)

    function gestisciCambiamentoInvestimento(event: React.ChangeEvent<HTMLInputElement>) {
        const nuovoValore = Number(event.target.value);
        setInvestimentoInizialeProp(nuovoValore);

    };

    function gestisciCambiamentoMensile(event: React.ChangeEvent<HTMLInputElement>) {
        const nuovoValore = Number(event.target.value);
        setContributoMensile(nuovoValore);

    };

    function gestisciCambiamentoTempo(event: React.ChangeEvent<HTMLInputElement>) {
        const nuovoValore = Number(event.target.value);
        setTempoInvestimento(nuovoValore);

    };



    //////////temporaneo solo per generare una % random////////////////////
    //                                                                  //
    function randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    //                                                                  //  
    //////////temporaneo solo per generare una % random////////////////////



    function calcularVolXAnno( CapInit: number, ContrMens: number, Perc: number, AnniVisualizzati: number) : number[] {
       
        const VolXanno: number[] = [];
        VolXanno[0] = CapInit;

        for (let a = 1; a < AnniVisualizzati; a++) {
            
            VolXanno[a] = 12 * ContrMens + VolXanno[a - 1] * (1 + Perc / 100);
        }

        return VolXanno;
    }


    //renderizzato dei portafogli
    useEffect(() => {
        let isMounted = true;

        const loadAll = async () => {
            try {
                const managedResp = await fetchManagedPortfoliosActive();
                if (!isMounted) return;

                if (managedResp.response.success && managedResp.data) {
                    let match = managedResp.data.filter(m => m.managed_uid);
                    match = match.map(m => ({
                        ...m,
                        percentuale: randomInt(1, 20)
                    }));
                    
                    setManagedData(match);
                }
                


            } catch (err) {

                if (isMounted) {
                    console.error("Error cargando portafolio:", err);
                }

            }
        };

        loadAll();


        return () => {
            isMounted = false;
        };
    }, []);


    //creazione dei dataSet portafogli
    useEffect(() => {
    if (!managedData.length) return;

    const nuoviDatasets = managedData.map((portafoglio, index) => {
        const percentuale = portafoglio.adv_growthPercentFrom ?? 5;

        const valori = calcularVolXAnno(
            investimentoIniziale,
            contributoMensile,
            percentuale,
            tempoInvestimento + 1
        );

        const colore = `hsl(${index * 50}, 70%, 50%)`; // diferentes colores

        return {
            label: portafoglio.title,
            data: valori,
            borderColor: colore,
            fill: false,
            tension: 0,
        };
    });

    setDatasets(nuoviDatasets);
}, [managedData, investimentoIniziale, contributoMensile, tempoInvestimento]);

    //renderizzato degli anni
    useEffect(() => {
        const annoAttuale = new Date().getFullYear();
        const nuoviAnni = [];

        for (let i = 0; i <= tempoInvestimento; i++) {
            nuoviAnni.push(annoAttuale + i);
        }

        setlabelAnniGenerati(nuoviAnni);
    }, [tempoInvestimento]);



    return (
        <MDBCol className='d-flex'>
            <div className='w-25 p-5'>
                <MDBRange
                    defaultValue={investimentoIniziale}
                    onChange={gestisciCambiamentoInvestimento}
                    min='500'
                    max='10000'
                    id='investimento'

                    label={`Investimento Iniziale ${investimentoIniziale}€`}
                />
                <MDBRange
                    defaultValue={contributoMensile}
                    onChange={gestisciCambiamentoMensile}
                    min='500'
                    max='5000'
                    id='mensile'
                    label={`Contributo Mensile ${contributoMensile}€`}

                />
                <MDBRange
                    defaultValue={tempoInvestimento}
                    onChange={gestisciCambiamentoTempo}
                    id='tempo'
                    label='Periodo di Investimento (Anni)'
                />
                <MDBDropdown>
                    <MDBDropdownToggle>Portafogli</MDBDropdownToggle>
                    <MDBDropdownMenu>

                        {managedData.map(child => (
                            <MDBDropdownItem link key={child.managed_uid}>
                                {child.title} - {child.adv_growthPercentFrom} %
                            </MDBDropdownItem>
                        ))}

                    </MDBDropdownMenu>
                </MDBDropdown>

            </div>
            <div className='w-75 p-5'>
                <MDBChart
                    type='line'
                    data={{
                        labels: labelAnniGenerati,
                        datasets: datasets,    
                    }}
                />
            </div>

        </MDBCol>
    );
}

export default LineChart;