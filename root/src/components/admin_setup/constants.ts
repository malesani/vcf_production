export type AssetsInfo = {
    symbol: string;                 // es. "AAPL", "BTC", "EUNL.MI"
    operator: 'buy' | 'sell';
    percentage: number;             // percent of complete portfolio
}

export interface AlertInfo {
    alert_uid: string;
    managed_uid: string;
    title: string;
    description: string | null;
    html_body: string;
    status: 'draft' | 'sended' | 'programmed' | 'deleted';

    scheduled_at: Date;  // data+ora

    assets: AssetsInfo[]
}