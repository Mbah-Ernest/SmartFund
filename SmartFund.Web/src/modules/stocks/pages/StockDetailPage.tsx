import { useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatNaira } from '@/lib/utils';
import TradingViewChart from '../components/TradingViewChart';
import ManualPriceEntry from '../components/ManualPriceEntry';
import PriceHistoryTable from '../components/PriceHistoryTable';
import BulkImportButton from '../components/BulkImportButton';
import AiBriefPanel from '../components/AiBriefPanel';
import { getStockHistory } from '../services/stocksApi';
import type { StockHistoryDto } from '../types/stockTypes';

export default function StockDetailPage() {
  const { ticker } = useParams<{ ticker: string }>();
  const [history, setHistory] = useState<StockHistoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollTrigger, setPollTrigger] = useState(0);

  const load = useCallback(async () => {
    if (!ticker) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getStockHistory(ticker, 30);
      setHistory(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load stock data.');
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => { load(); }, [load]);

  const latestEntry = history?.entries[0];
  const prevEntry = history?.entries[1];
  const dailyChange = latestEntry && prevEntry && prevEntry.close !== 0
    ? ((latestEntry.close - prevEntry.close) / prevEntry.close) * 100
    : null;
  const changePositive = dailyChange !== null && dailyChange >= 0;

  if (!ticker) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/finance/stocks">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          {loading ? (
            <Skeleton className="h-7 w-48" />
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{ticker}</h1>
              {history && (
                <span className="text-muted-foreground text-sm">{history.companyName}</span>
              )}
              {latestEntry && (
                <>
                  <span className="font-semibold">{formatNaira(latestEntry.close)}</span>
                  {dailyChange !== null && (
                    <span className={`text-sm font-medium ${changePositive ? 'text-green-500' : 'text-destructive'}`}>
                      {changePositive ? '+' : ''}{dailyChange.toFixed(2)}%
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 3-panel layout */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px_300px] gap-4 flex-1">

        {/* Left: TradingView chart */}
        <div className="space-y-4">
          {history && (
            <TradingViewChart symbol={history.tradingViewSymbol} height={500} />
          )}
          {loading && <Skeleton className="h-[500px] w-full rounded-md" />}
        </div>

        {/* Middle: Manual entry + history */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Add Price Entry</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ManualPriceEntry
                ticker={ticker}
                onSaved={load}
                onBriefPending={() => setPollTrigger((n) => n + 1)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Price History</CardTitle>
                <BulkImportButton ticker={ticker} onImported={load} />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : (
                <PriceHistoryTable
                  ticker={ticker}
                  entries={history?.entries ?? []}
                  onRefresh={load}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: AI brief */}
        <div>
          <Card className="sticky top-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">AI Decision Brief</CardTitle>
              <p className="text-xs text-muted-foreground">
                Decision-support only — not financial advice
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <AiBriefPanel ticker={ticker} pollTrigger={pollTrigger} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
