export interface PortfolioAssets {
  portfolio_uid: string;
  symbol: string;
  unitQuantity: number;  // derivata se non fornita dal backend
  unitaryPrice_lastOp: number;
  value_now: number | null;
  unitaryPrice_now: number | null;
}

export type ManagedType = { type: 'managed'; managed_uid: string };

export type CustomType = { type: 'custom'; managed_uid?: string };

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
} & (ManagedType | CustomType);