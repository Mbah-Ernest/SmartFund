import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatNaira } from '@/lib/utils';
import { getWatchlist, addToWatchlist, removeFromWatchlist, getStocks, addStock } from '../services/stocksApi';
import type { WatchlistEntryDto, StockDto } from '../types/stockTypes';
import { toast } from 'sonner';

export default function StocksPage() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [allStocks, setAllStocks] = useState<StockDto[]>([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [showNewTicker, setShowNewTicker] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [newCompany, setNewCompany] = useState('');
  const [creatingTicker, setCreatingTicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWatchlist();
      setWatchlist(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load watchlist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openAddModal() {
    setShowAddModal(true);
    const stocks = await getStocks();
    setAllStocks(stocks);
  }

  async function handleAdd(ticker: string) {
    setAdding(true);
    try {
      await addToWatchlist({ ticker });
      toast.success(`${ticker} added to watchlist.`);
      setShowAddModal(false);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add ticker.');
    } finally {
      setAdding(false);
    }
  }

  async function handleCreateAndAdd() {
    if (!newTicker.trim() || !newCompany.trim()) return;
    setCreatingTicker(true);
    try {
      await addStock({ ticker: newTicker.trim(), companyName: newCompany.trim() });
      await handleAdd(newTicker.trim().toUpperCase());
      setShowNewTicker(false);
      setNewTicker('');
      setNewCompany('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create ticker.');
    } finally {
      setCreatingTicker(false);
    }
  }

  async function handleRemove(ticker: string) {
    try {
      await removeFromWatchlist(ticker);
      toast.success(`${ticker} removed from watchlist.`);
      load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove ticker.');
    }
  }

  const filtered = allStocks.filter(
    (s) =>
      s.ticker.toLowerCase().includes(search.toLowerCase()) ||
      s.companyName.toLowerCase().includes(search.toLowerCase()),
  );

  const watchedTickers = new Set(watchlist.map((w) => w.ticker));

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">NGX Stocks</h1>
          <p className="text-muted-foreground text-sm">Track and analyse Nigerian Stock Exchange holdings</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={openAddModal}>
            <Plus className="h-4 w-4 mr-1" /> Add Ticker
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      ) : watchlist.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 gap-3">
            <TrendingUp className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">Your watchlist is empty.</p>
            <Button size="sm" onClick={openAddModal}>
              <Plus className="h-4 w-4 mr-1" /> Add your first ticker
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Watchlist ({watchlist.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticker</TableHead>
                    <TableHead className="text-right">Last Close</TableHead>
                    <TableHead className="text-right">Day Δ%</TableHead>
                    <TableHead>RSI</TableHead>
                    <TableHead>MACD</TableHead>
                    <TableHead className="text-right">Holdings</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlist.map((entry) => (
                    <TableRow
                      key={entry.ticker}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/finance/stocks/${entry.ticker}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-semibold text-sm">{entry.ticker}</p>
                          {entry.companyName && (
                            <p className="text-xs text-muted-foreground">{entry.companyName}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {entry.latestClose ? formatNaira(entry.latestClose) : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {entry.dailyChangePct !== undefined && entry.dailyChangePct !== null ? (
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
                        {entry.holdingsQty ?? '—'}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {entry.profitLoss !== null && entry.profitLoss !== undefined ? (
                          <span className={entry.profitLoss >= 0 ? 'text-green-500' : 'text-destructive'}>
                            {formatNaira(entry.profitLoss)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleRemove(entry.ticker)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add ticker modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Ticker to Watchlist</DialogTitle>
          </DialogHeader>

          {!showNewTicker ? (
            <>
              <Input
                placeholder="Search ticker or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto space-y-1">
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
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No matching tickers.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setShowNewTicker(true)}>
                  + New ticker
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Ticker Symbol</Label>
                <Input
                  placeholder="e.g. ACCESSCORP"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <Label className="text-xs">Company Name</Label>
                <Input
                  placeholder="e.g. Access Holdings Plc"
                  value={newCompany}
                  onChange={(e) => setNewCompany(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => setShowNewTicker(false)}>
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={!newTicker.trim() || !newCompany.trim() || creatingTicker}
                  onClick={handleCreateAndAdd}
                >
                  {creatingTicker ? 'Adding…' : 'Add Ticker'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
