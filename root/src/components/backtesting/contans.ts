import { PortfolioAssets } from "../../api_module/portfolio/constants"


export interface BacktestConfig {
    test_uid: string;
    name: string;
    totalInvested: number;        // Totale Investito (45000.00)
    monthlyContribution: number;  // Contributo mensile (700)
    periodYears: number;          // Periodo test (5)
}

export interface BacktestWithAssets extends BacktestConfig {
    assets: PortfolioAssets[];
}


export const backtestingsList: BacktestWithAssets[] = [
    {
        test_uid: "bt-1",
        name: "Test 1",
        totalInvested: 45000,
        monthlyContribution: 700,
        periodYears: 5,
        assets: [
            {
                portfolio_uid: "bt-1",
                symbol: "AMZN",
                unitQuantity: 3,
                value_now: 4800,
                unitaryPrice_now: 1600,
            },
            {
                portfolio_uid: "bt-1",
                symbol: "AAPL",
                unitQuantity: 5,
                value_now: 9000,
                unitaryPrice_now: 1800,
            },
        ],
    },
    {
        test_uid: "bt-2",
        name: "Test 2",
        totalInvested: 30000,
        monthlyContribution: 500,
        periodYears: 3,
        assets: [
            {
                portfolio_uid: "bt-2",
                symbol: "MSFT",
                unitQuantity: 4,
                value_now: 12000,
                unitaryPrice_now: 3000,
            },
        ],
    },
    {
        test_uid: "bt-3",
        name: "Test 3",
        totalInvested: 60000,
        monthlyContribution: 1000,
        periodYears: 10,
        assets: [
            {
                portfolio_uid: "bt-3",
                symbol: "GOOGL",
                unitQuantity: 6,
                value_now: 18000,
                unitaryPrice_now: 3000,
            },
            {
                portfolio_uid: "bt-3",
                symbol: "TSLA",
                unitQuantity: 2,
                value_now: 5000,
                unitaryPrice_now: 2500,
            },
        ],
    },
];
