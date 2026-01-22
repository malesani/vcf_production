export interface QstOption {
    // per select/choice (step_1)
    answer_uid?: string;

    // per form fields (step_2, step_3)
    field_key?: string;

    label: string;
    description?: string;
    helperText?: string;
    multiple?: boolean;
    maxSelections?: number;
    icon?: string;
}

export interface QstSection {
    question_uid: string;
    icon?: string;
    name: string;
    title: string;
    description?: string;
    multiple?: boolean;
    maxSelections?: number;
    options: QstOption[];
}


export const questions: QstSection[] = [
    {
        question_uid: "step_1",
        icon: "cog",
        name: "Step 1",
        title: "",
        description: "",
        options: [
            {
                answer_uid: "struggling_to_save",
                label: "Faccio fatica a risparmiare",
                description: "Le spese si mangiano quasi tutto il reddito e a fine mese ti rimane poco o niente",
                icon: "hand-holding-usd",
            },
            {
                answer_uid: "saving_no_plan",
                label: "Risparmio ma tengo i soldi fermi",
                description: "Metto qualcosa da parte ogni mese, ma i risparmi restano fermi sul conto senza un vero piano di crescita.",
                icon: "suitcase",
            },
            {
                answer_uid: "bank_products_only",
                label: "Uso solo prodotti di banca / poste / assicurazioni",
                description: "Ho polizze, fondi o piani proposti dalla banca/poste, ma non so bene come funzionano né se sono davvero adatti a me.",
                icon: "folder-open",
            },
            {
                answer_uid: "basic_investing_no_strategy",
                label: "Investo in strumenti semplici ma senza un vero piano",
                description: "Ho iniziato a usare ETF, azioni o altri strumenti, ma mi manca ancora una strategia chiara.",
                icon: "chart-bar",
            },
            {
                answer_uid: "structured_plan_improve",
                label: "Ho un piano ma voglio migliorare i risultati",
                description: "Seguo già una strategia strutturata, ma i risultati non mi soddisfano e vuoi fare un salto di qualità.",
                icon: "bullseye",
            },
        ],
    },

    {
        question_uid: "step_2",
        icon: "user",
        name: "Step 2",
        title: "La tua situazione",
        description: "",
        options: [
            { field_key: "age", label: "Età", icon: "user" },
            { field_key: "monthly_net_income", label: "Reddito netto mensile (€)", icon: "hand-holding-usd" },
            { field_key: "monthly_expenses", label: "Spese mensili stimate (€)", icon: "hand-holding-usd" },
            { field_key: "available_savings", label: "Risparmi disponibili (€)", icon: "hand-holding-usd" },
            { field_key: "invested_capital", label: "Capitale già investito (€)", icon: "hand-holding-usd" },
            {
                field_key: "monthly_savings_capacity",
                label: "Quanto riesci a mettere da parte ogni mese? (€)",
                icon: "hand-holding-usd",
                helperText:
                    "Indica quanto riesci normalmente ad accantonare ogni mese, anche se i soldi rimangono fermi sul conto."
            },
        ],
    },

    {
        question_uid: "step_3",
        icon: "chart-bar",
        name: "Step 3",
        title: "Obiettivo",
        description: "",
        options: [
            // 3 campi numerici
            { field_key: "target_capital", label: "Capitale obiettivo (€)", icon: "chart-bar" },
            { field_key: "target_years", label: "In quanti anni vuoi raggiungere l'obiettivo?", icon: "chart-bar" },
            { field_key: "monthly_invest_capacity", label: "Quanto potresti arrivare a investire al mese? (€, opzionale)", icon: "chart-bar" },

            // eventuale “other” select (se ti serve davvero mantenerlo)
            { answer_uid: "goal_target_capital", label: "Raggiungere un capitale obiettivo", description: "Accumula un importo specifico nel tempo", icon: "bullseye" },
            { answer_uid: "goal_monthly_income", label: "Generare una rendita mensile", description: "Creare un flusso di reddito passivo costante", icon: "chart-line" },
            { answer_uid: "goal_wealth_growth", label: "Far crescere il mio patrimonio nel tempo", description: "Investi per aumentare il valore complessivo", icon: "bullseye" },
        ],
    },
];
