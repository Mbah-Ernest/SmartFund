export interface StockDto {
  ticker: string;
  tradingViewSymbol: string;
  companyName: string;
  sector?: string;
}

export interface PriceEntryDto {
  id: number;
  tradeDate: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  updatedAtUtc: string;
}

export interface StockHistoryDto {
  ticker: string;
  companyName: string;
  tradingViewSymbol: string;
  entries: PriceEntryDto[];
}

export interface AiBriefDto {
  ticker: string;
  generatedAtUtc: string;
  rsiValue?: number;
  rsiSignal: string;
  macdSignal: string;
  priceVsSma20: string;
  priceVsSma50: string;
  newsSentiment?: string;
  briefText: string;
}

export interface WatchlistEntryDto {
  id: number;
  ticker: string;
  companyName?: string;
  tradingViewSymbol?: string;
  latestClose?: number;
  dailyChangePct?: number;
  holdingsQty?: number;
  avgCost?: number;
  profitLoss?: number;
  rsiSignal?: string;
  macdSignal?: string;
  briefGeneratedAt?: string;
}

export interface SavePriceRequest {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AddWatchlistRequest {
  ticker: string;
  holdingsQty?: number;
  avgCost?: number;
}

export interface UpdateHoldingsRequest {
  holdingsQty?: number;
  avgCost?: number;
}
