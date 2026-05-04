import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNaira } from '@/lib/utils';
import { getWatchlist, addToWatchlist, getStocks } from '../services/stocksApi';
import type { WatchlistEntryDto, StockDto } from '../types/stockTypes';
import { toast } from 'sonner';

export default function StockWatchlistCard() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistEntryDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAdd, setShowAdd] = useState(false);
  const [allStocks, setAllStocks] = useState<StockDto[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getWatchlist();
      setWatchlist(data);
    } catch {
      // fail silently on dashboard — don't break other cards
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openAdd() {
    setShowAdd(true);
    const stocks = await getStocks();
    setAllStocks(stocks);
  }

  async function handleAdd(ticker: string) {
    setAdding(true);
    try {
      await addToWatchlist({ ticker });
      toast.success(`${ticker} added to watchlist.`);
      setShowAdd(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add ticker.');
    } finally {
      setAdding(false);
    }
  }

  const watchedTickers = new Set(watchlist.map((w) => w.ticker));
  const filtered = allStocks.filter(
    (s) =>
      s.ticker.toLowerCase().includes(search.toLowerCase()) ||
      s.companyName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            NGX Stocks
          </CardTitle>
          <CardAction>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={openAdd}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => navigate('/finance/stocks')}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> View all
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-4 pb-4 space-y-2">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : watchlist.length === 0 ? (
            <div className="px-4 pb-4">
              <p className="text-sm text-muted-foreground text-center py-4">
                No stocks on watchlist.{' '}
                <button
                  type="button"
                  className="underline text-primary"
                  onClick={openAdd}
                >
                  Add one
                </button>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Close</TableHead>
                    <TableHead className="text-right">Δ%</TableHead>
                    <TableHead>RSI</TableHead>
                    <TableHead>MACD</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlist.map((entry) => (
                    <TableRow
                      key={entry.ticker}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/finance/stocks/${entry.ticker}`)}
                    >
                      <TableCell className="font-semibold text-sm">{entry.ticker}</TableCell>
                      <TableCell className="text-right text-xs">
                        {entry.latestClose ? formatNaira(entry.latestClose) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {entry.dailyChangePct !== null && entry.dailyChangePct !== undefined ? (
                          <span className={entry.dailyChangePct >= 0 ? 'text-green-500' : 'text-destructive'}>
                            {entry.dailyChangePct >= 0 ? '+' : ''}{entry.dailyChangePct.toFixed(2)}%
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {entry.rsiSignal ? (
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">{entry.rsiSignal}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {entry.macdSignal ? (
                          <Badge variant="secondary" className="text-xs h-5 px-1.5">{entry.macdSignal}</Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {entry.profitLoss !== null && entry.profitLoss !== undefined ? (
                          <span className={entry.profitLoss >= 0 ? 'text-green-500' : 'text-destructive'}>
                            {formatNaira(entry.profitLoss)}
                          </span>
                        ) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Ticker to Watchlist</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Search ticker or company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filtered.map((s) => (
              <button
                key={s.ticker}
                type="button"
                disabled={watchedTickers.has(s.ticker) || adding}
                onClick={() => handleAdd(s.ticker)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="text-left">
                  <p className="font-medium">{s.ticker}</p>
                  <p className="text-xs text-muted-foreground">{s.companyName}</p>
                </div>
                {watchedTickers.has(s.ticker) && (
                  <Badge variant="secondary" className="text-xs">Watching</Badge>
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">No matching tickers.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => navigate('/finance/stocks')}>
              Manage watchlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
