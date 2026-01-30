// components/dashboard/constant.ts

export type RecommendationLevel = "warning" | "danger";

export type Recommendation = {
    id: string;              // es: "R3_cashflow_negative"
    level: RecommendationLevel;
    title: string;           // la "pillola" / CTA breve (es: "Rimetti in ordine le spese")
    text: string;            // descrizione lunga (con valori calcolati)
};

export type QuizAnswers = {
    step_1?: {
        answer_uid?: string;   // es: "saving_no_plan"
        question_uid?: string;
    };
    step_2?: {
        age?: string;
        monthly_net_income?: string;
        monthly_expenses?: string;
        available_savings?: string;       // liquidità
        invested_capital?: string;        // capitale investito
        monthly_savings_capacity?: string; // quanto dice di mettere da parte
    };
    step_3?: {
        answer_uid?: string;              // (se lo userai)
        step_3_other?: string;            // nel tuo esempio: "accent" (ma in questions hai goal_* ... vedi nota sotto)
        target_years?: string;
        target_capital?: string;
        monthly_invest_capacity?: string;
    };
};

export type PresetData = {
    source?: string; // "quiz"
    answers: QuizAnswers;
    generated_at?: string;
};

// ---------- helpers ----------
const toNum = (v: unknown): number => {
    if (v === null || v === undefined) return 0;
    const s = String(v).trim();
    if (!s) return 0;
    // supporta "1.234,56" e "1234.56"
    const cleaned = s.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
};

const pct = (x: number) => Math.round(x * 10) / 10; // 1 decimale

const eur = (n: number) =>
    new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
    }).format(Math.round(n));

const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);

// ---------- calcoli base ----------
export type DashboardMetrics = {
    step1: string; // answer_uid step_1
    income: number;
    expenses: number;
    margin: number; // income - expenses
    savingsDeclared: number; // monthly_savings_capacity
    savingRate: number; // margin / income (se income>0)
    liquidCash: number; // available_savings
    investedCapital: number; // invested_capital
    totalWealth: number; // liquid + invested
    monthsCovered: number; // liquid / expenses (se expenses>0)
    targetCapital: number;
    targetYears: number;
    monthlyInvestCapacity: number;
    objectiveType: "CAPITALE" | "RENDITA" | "CRESCITA" | "UNKNOWN";
};

export const computeDashboardMetrics = (preset: PresetData | null | undefined): DashboardMetrics => {
    const a = preset?.answers ?? {};
    const step1 = a.step_1?.answer_uid ?? "";

    const income = toNum(a.step_2?.monthly_net_income);
    const expenses = toNum(a.step_2?.monthly_expenses);
    const margin = income - expenses;

    const savingsDeclared = toNum(a.step_2?.monthly_savings_capacity);

    const savingRate = income > 0 ? (margin / income) * 100 : 0; // in percento

    const liquidCash = toNum(a.step_2?.available_savings);
    const investedCapital = toNum(a.step_2?.invested_capital);
    const totalWealth = liquidCash + investedCapital;

    const monthsCovered = expenses > 0 ? liquidCash / expenses : 0;

    const targetCapital = toNum(a.step_3?.target_capital);
    const targetYears = Math.max(0, Math.floor(toNum(a.step_3?.target_years)));
    const monthlyInvestCapacity = toNum(a.step_3?.monthly_invest_capacity);

    const rawObj = (a.step_3?.answer_uid || a.step_3?.step_3_other || "").trim();

    const objectiveType: DashboardMetrics["objectiveType"] =
        rawObj === "goal_target_capital"
            ? "CAPITALE"
            : rawObj === "goal_monthly_income"
                ? "RENDITA"
                : rawObj === "goal_wealth_growth"
                    ? "CRESCITA"
                    : "UNKNOWN";

    return {
        step1,
        income,
        expenses,
        margin,
        savingsDeclared,
        savingRate,
        liquidCash,
        investedCapital,
        totalWealth,
        monthsCovered,
        targetCapital,
        targetYears,
        monthlyInvestCapacity,
        objectiveType,
    };
};

// ---------- regole -> recommendations ----------
// Abbozzo: implemento le più importanti (3,7,11-16,17-22,35)
// Poi ne aggiungiamo altre una per una.
export const buildRecommendations = (preset: PresetData | null | undefined): Recommendation[] => {
    const m = computeDashboardMetrics(preset);

    const out: Recommendation[] = [];

    // 3) Cashflow negativo
    if (m.income > 0 && m.expenses > 0 && m.margin < 0) {
        out.push({
            id: "R3_cashflow_negative",
            level: "danger",
            title: "Rimetti in ordine le spese",
            text: `Attenzione: oggi stai spendendo più di quanto entra (${eur(m.expenses)} vs ${eur(m.income)}). La priorità è tornare in positivo. Investire adesso rischia di peggiorare la situazione invece che migliorarla.`,
        });
    }

    // 7) Spese troppo alte rispetto al reddito (>=85%) con margine >=0
    const expRatio = safeDiv(m.expenses, m.income) * 100;
    if (m.income > 0 && m.expenses > 0 && expRatio >= 85 && m.margin >= 0) {
        out.push({
            id: "R7_expenses_high",
            level: "warning",
            title: "Individua 3 sprechi",
            text: `Le spese assorbono quasi tutto il reddito (circa ${pct(expRatio)}%). Anche senza tagli drastici, basta ottimizzare 2–3 voci per liberare capitale ogni mese e far lavorare di più gli investimenti.`,
        });
    }

    // 6) Dati incoerenti: risparmio dichiarato > margine reale
    if (m.savingsDeclared > 0 && m.margin >= 0 && m.savingsDeclared > m.margin) {
        out.push({
            id: "R6_incoherent_savings",
            level: "warning",
            title: "Rivedi i numeri",
            text: `Hai indicato che metti da parte ${eur(m.savingsDeclared)}/mese, ma dal margine (entrate - uscite) risultano circa ${eur(m.margin)}/mese. Probabile che ci sia qualche spesa “invisibile” o una stima non aggiornata.`,
        });
    }

    // 11-16) Fondo emergenza (mesi coperti liquidità)
    if (m.expenses > 0) {
        if (m.monthsCovered < 0.5) {
            out.push({
                id: "R11_emergency_critical",
                level: "danger",
                title: "Crea il cuscinetto",
                text: `La tua liquidità copre meno di mezzo mese di spese (circa ${pct(m.monthsCovered)} mesi). Prima di spingere sugli investimenti, crea un cuscinetto minimo (obiettivo: 2–3 mesi). Ti evita scelte forzate.`,
            });
        } else if (m.monthsCovered < 1) {
            out.push({
                id: "R12_emergency_low",
                level: "warning",
                title: "Aumenta la liquidità",
                text: `Sei un po’ scoperto: la liquidità è bassa rispetto alle spese mensili (circa ${pct(m.monthsCovered)} mesi). Aumentare il fondo emergenza ti rende più stabile e ti permette di investire con più serenità.`,
            });
        } else if (m.monthsCovered < 3) {
            out.push({
                id: "R13_emergency_building",
                level: "warning",
                title: "Portalo a 3 mesi",
                text: `Hai un inizio di cuscinetto (circa ${pct(m.monthsCovered)} mesi di spese), ma non è ancora completo. Se arrivi a 3 mesi, riduci molto il rischio di dover toccare gli investimenti nei momenti sbagliati.`,
            });
        } else if (m.monthsCovered <= 6) {
            out.push({
                id: "R14_emergency_solid",
                level: "warning",
                title: "Spingi sul piano",
                text: `Ottimo: hai una liquidità di sicurezza in una fascia solida (circa ${pct(m.monthsCovered)} mesi). Ora puoi concentrarti su crescita e ottimizzazione degli strumenti senza ansia da imprevisti.`,
            });
        } else {
            // mesi > 6
            if (m.investedCapital > 0) {
                out.push({
                    id: "R15_too_much_cash",
                    level: "warning",
                    title: "Ottimizza la liquidità",
                    text: `Hai tanta liquidità ferma sul conto (circa ${pct(m.monthsCovered)} mesi di spese). Tenere un cuscinetto è giusto, ma oltre una certa soglia potrebbe essere inefficiente: puoi far lavorare una parte in modo più produttivo.`,
                });
            } else {
                out.push({
                    id: "R16_cash_no_invest",
                    level: "warning",
                    title: "Inizia con un PAC",
                    text: `Hai molta liquidità ferma e nessun investimento attivo (circa ${pct(m.monthsCovered)} mesi di spese). Rischi di perdere potere d’acquisto nel tempo: puoi partire gradualmente con un piano semplice e ben diversificato.`,
                });
            }
        }
    }

    // 17-22) quiz step_1: situazione attuale
    if (m.step1 === "saving_no_plan") {
        out.push({
            id: "R17_saving_no_plan",
            level: "warning",
            title: "Imposta un piano",
            text: `Stai facendo la parte più difficile: mettere soldi da parte. Il passo successivo è farli crescere con un piano automatico, così il tempo lavora per te.`,
        });
    }

    if (m.step1 === "bank_products_only") {
        out.push({
            id: "R18_bank_products",
            level: "warning",
            title: "Controlla i costi",
            text: `Investire è un ottimo passo, ma molti prodotti “da sportello” hanno costi più alti e poca trasparenza. Ridurre i costi nel lungo periodo può fare una differenza enorme sul risultato finale.`,
        });

        if (m.investedCapital > 0 && m.investedCapital < 20000) {
            out.push({
                id: "R19_bank_small_capital",
                level: "warning",
                title: "Semplifica la strategia",
                text: `Con capitali piccoli i costi incidono ancora di più. Prima di prodotti complessi, conviene partire con strumenti semplici ed efficienti, e costruire la base.`,
            });
        }
    }

    if (m.step1 === "basic_investing_no_strategy") {
        out.push({
            id: "R20_no_strategy",
            level: "warning",
            title: "Crea la strategia",
            text: `Hai già iniziato a investire: bene. Ora serve una regola chiara: come dividi i soldi, quando aggiungi, quando ribilanci. Senza piano, i risultati diventano casuali.`,
        });

        if (m.investedCapital > 0 && m.investedCapital < 5000) {
            out.push({
                id: "R21_small_capital_random",
                level: "warning",
                title: "Parti semplice",
                text: `Con capitali iniziali conviene evitare complicazioni: la semplicità paga. Un piano di accumulo su strumenti efficienti + costanza spesso batte il “fai da te” random.`,
            });
        }
    }

    if (m.step1 === "structured_plan_improve") {
        out.push({
            id: "R22_improve_plan",
            level: "warning",
            title: "Ottimizza il piano",
            text: `Se il piano c’è ma i risultati non ti soddisfano, di solito i punti sono 3: costi, diversificazione e ribilanciamento. Ottimizzarli spesso fa un salto di qualità senza cambiare tutto.`,
        });
    }

    // 35) Investimenti presenti ma obiettivo non definito
    if (m.investedCapital > 0 && (m.targetCapital === 0 || m.targetYears === 0)) {
        out.push({
            id: "R35_missing_target",
            level: "warning",
            title: "Definisci l’obiettivo",
            text: `Stai già investendo, ma manca un obiettivo numerico chiaro (quanto e in quanto tempo). Definire un target realistico ti aiuta a scegliere la strategia e a misurare i progressi.`,
        });
    }

    // Ordinamento: danger sopra, poi warning
    out.sort((a, b) => (a.level === b.level ? 0 : a.level === "danger" ? -1 : 1));

    return out;
};
