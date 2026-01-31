export interface PortfolioAssets {
  portfolio_uid: string;
  symbol: string;
  unitQuantity: number;  // derivata se non fornita dal backend
  value_now: number | null;
  unitaryPrice_now: number | null;
}
export interface PortfolioTotals {
  cash_position: number;
  total_assets_now: number;
  total_with_cash: number;
}

export type ManagedType = { type: 'managed'; managed_uid: string; managed_title?: string };

export type CustomType = { type: 'custom'; managed_uid?: string; managed_title?: string };

export type PortfolioInfo = {
  portfolio_uid: string;        // UID
  user_uid: string;             // utente proprietario
  title: string;                // titolo inserito da cliente

  target: number;
  time_horizon_years: number;

  cash_position: number;
  automatic_savings: number;

  created_at?: Date;

  status: 'active' | 'deleted';
  isDraft: boolean;

  assets: PortfolioAssets[];
  totals?: PortfolioTotals;
} & (ManagedType | CustomType);

