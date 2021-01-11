export interface IPosition {
  currency?: string;
  cost?: number;
  lastPrice?: number;
  percent?: number;
  figi: string;
  ticker?: string;
  manual?: boolean;
  currentPercent?: number;
  lots?: number;
}

export interface IMarket {
  currency: string;
  positions: IPosition[];
  total: number;
}

export interface IState {
  markets?: IMarket[];
  currencies?: any[];
  USD?: number;
  RUB?: number;
}
