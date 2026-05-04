import { api } from '@/api/axios';
import { toApiClientError } from '@/api/apiError';
import type {
  StockDto,
  StockHistoryDto,
  AiBriefDto,
  WatchlistEntryDto,
  SavePriceRequest,
  AddWatchlistRequest,
  UpdateHoldingsRequest,
} from '../types/stockTypes';

export async function getStocks(): Promise<StockDto[]> {
  try {
    const res = await api.get<StockDto[]>('/api/stocks');
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function addStock(data: {
  ticker: string;
  tradingViewSymbol?: string;
  companyName: string;
  sector?: string;
}): Promise<StockDto> {
  try {
    const res = await api.post<StockDto>('/api/stocks', data);
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function getStockHistory(ticker: string, days = 60): Promise<StockHistoryDto> {
  try {
    const res = await api.get<StockHistoryDto>(`/api/stocks/${ticker}/history`, {
      params: { days },
    });
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function getAiBrief(ticker: string): Promise<AiBriefDto | null> {
  try {
    const res = await api.get<AiBriefDto>(`/api/stocks/${ticker}/brief`);
    return res.data;
  } catch (err: unknown) {
    if ((err as { response?: { status?: number } })?.response?.status === 404) return null;
    throw toApiClientError(err);
  }
}

export async function regenerateBrief(ticker: string): Promise<void> {
  try {
    await api.post(`/api/stocks/${ticker}/brief/regenerate`);
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function savePrice(data: SavePriceRequest): Promise<{ id: number; ticker: string; date: string }> {
  try {
    const res = await api.post('/api/prices', data);
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function deletePrice(id: number): Promise<void> {
  try {
    await api.delete(`/api/prices/${id}`);
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function bulkImportPrices(
  ticker: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ imported: number; updated: number; errors: string[] }> {
  try {
    const formData = new FormData();
    formData.append('ticker', ticker);
    formData.append('file', file);
    const res = await api.post('/api/prices/bulk', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    });
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function getWatchlist(): Promise<WatchlistEntryDto[]> {
  try {
    const res = await api.get<WatchlistEntryDto[]>('/api/stock-watchlist');
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function addToWatchlist(data: AddWatchlistRequest): Promise<{ id: number; ticker: string }> {
  try {
    const res = await api.post('/api/stock-watchlist', data);
    return res.data;
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function removeFromWatchlist(ticker: string): Promise<void> {
  try {
    await api.delete(`/api/stock-watchlist/${ticker}`);
  } catch (err) {
    throw toApiClientError(err);
  }
}

export async function updateWatchlistHoldings(
  ticker: string,
  data: UpdateHoldingsRequest,
): Promise<void> {
  try {
    await api.patch(`/api/stock-watchlist/${ticker}`, data);
  } catch (err) {
    throw toApiClientError(err);
  }
}
