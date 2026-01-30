// backtesting/constants.ts

export interface BacktestingAsset {
  backtesting_uid: string;
  symbol: string;
  weight_pct: number; // percentuale (es: 12.5 = 12.5%)
}

export type BacktestingInfo = {
  backtesting_uid: string;
  user_uid: string;

  title: string;
  description?: string;

  target: number;
  time_horizon_years: number;

  cash_position: number;
  automatic_savings: number;

  created_at?: Date;
  updated_at?: Date;

  status: 'active' | 'deleted';

  assets: BacktestingAsset[];
};
