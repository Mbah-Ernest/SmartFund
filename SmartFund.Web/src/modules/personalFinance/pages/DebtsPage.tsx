/// <reference path="../../../shims-react-router-dom.d.ts" />

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, AlertTriangle, RefreshCw, CreditCard, TrendingDown, Lightbulb } from 'lucide-react';
import { getDebts, getDebtInsights, deleteDebt, forgiveDebt } from '../services/personalFinanceApi';
import type { PersonalDebtDto, DebtInsightsDto, RankedDebt } from '../types/financeTypes';
import AddDebtSheet from '../components/AddDebtSheet';
import EditDebtSheet from '../components/EditDebtSheet';
import RecordPaymentDialog from '../components/RecordPaymentDialog';
import DebtCard from '../components/DebtCard';
import DebtInsightsPanel from '../components/DebtInsightsPanel';
import DebtReductionChart from '../components/DebtReductionChart';
import DebtBreakdownPie from '../components/DebtBreakdownPie';
import MonthlyBurdenChart from '../components/MonthlyBurdenChart';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { maskAmount, maskName } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DebtsPage() {
  const { isPrivate } = usePrivacy();
  const [debts, setDebts] = useState<PersonalDebtDto[]>([]);
  const [insights, setInsights] = useState<DebtInsightsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sheet / dialog state
  const [showAdd, setShowAdd] = useState(false);
  const [editDebt, setEditDebt] = useState<PersonalDebtDto | null>(null);
  const [payDebt, setPayDebt] = useState<PersonalDebtDto | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<PersonalDebtDto | null>(null);
  const [deletePin, setDeletePin] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Filter: all | active | paid | forgiven
  const [filter, setFilter] = useState<'all' | 'active' | 'paid' | 'forgiven'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    setInsightsLoading(true);
    setError(null);
    try {
      const [debtList, debtInsights] = await Promise.all([
        getDebts(),
        getDebtInsights(),
      ]);
      setDebts(debtList);
      setInsights(debtInsights);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load debts');
    } finally {
      setLoading(false);
      setInsightsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build urgency map for quick lookup
  const urgencyMap = useMemo(() => {
    const map = new Map<number, RankedDebt>();
    insights?.urgencyRanking.forEach((r) => map.set(r.debtId, r));
    return map;
  }, [insights]);

  const filteredDebts = useMemo(() => {
    if (filter === 'active') return debts.filter((d) => d.status === 'Active');
    if (filter === 'paid') return debts.filter((d) => d.status === 'PaidOff');
    if (filter === 'forgiven') return debts.filter((d) => d.status === 'Forgiven');
    return debts;
  }, [debts, filter]);

  const overdueDebts = useMemo(() =>
    debts.filter((d) => d.status === 'Active' && d.daysUntilDue < 0),
    [debts]);

  function replaceDebt(updated: PersonalDebtDto) {
    setDebts((prev) => prev.map((d) => d.id === updated.id ? updated : d));
  }

  async function handleForgive(debt: PersonalDebtDto) {
    try {
      const updated = await forgiveDebt(debt.id);
      replaceDebt(updated);
      // Refresh insights
      const fresh = await getDebtInsights();
      setInsights(fresh);
      toast.success(`${debt.creditorName} marked as forgiven`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to forgive debt');
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !deletePin) return;
    setDeleting(true);
    try {
      await deleteDebt(deleteTarget.id, deletePin);
      setDebts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      const fresh = await getDebtInsights();
      setInsights(fresh);
      toast.success('Debt deleted');
      setDeleteTarget(null);
      setDeletePin('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete debt');
    } finally {
      setDeleting(false);
    }
  }

  // Summary card values
  const totalOwed = insights?.totalOwed ?? 0;
  const totalInterest = insights?.totalInterest ?? 0;
  const totalPaid = insights?.totalPaid ?? 0;
  const percentPaid = insights?.percentPaid ?? 0;
  const burdenPercent = insights?.burdenPercent ?? 0;
  const monthlyBurden = insights?.monthlyDebtBurden ?? 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 pt-0 gap-4">
      {/* Sticky zone: header + summary cards */}
      <div className="shrink-0 space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Debts</h1>
          <p className="text-muted-foreground text-sm">Track money you owe and your repayment progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add Debt
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Total Owed</p>
                <p className="text-xl font-bold">{maskAmount(totalOwed, isPrivate)}</p>
                <p className="text-xs text-muted-foreground mt-1">{debts.filter(d => d.status === 'Active').length} active debt{debts.filter(d => d.status === 'Active').length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Total Interest</p>
                <p className="text-xl font-bold">{maskAmount(totalInterest, isPrivate)}</p>
                <p className="text-xs text-muted-foreground mt-1">cost of borrowing</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                <p className="text-xl font-bold text-success">{maskAmount(totalPaid, isPrivate)}</p>
                <p className="text-xs text-muted-foreground mt-1">{percentPaid.toFixed(1)}% cleared</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Monthly Burden</p>
                <p className="text-xl font-bold">{maskAmount(monthlyBurden, isPrivate)}</p>
                <p className="text-xs text-muted-foreground mt-1">{burdenPercent.toFixed(1)}% of income</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      </div>{/* end sticky zone */}

      {/* Scrollable zone */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4">

      {/* Overdue alert */}
      {!loading && overdueDebts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Overdue:</span>{' '}
            {overdueDebts.map((d) => `${maskName(d.creditorName, isPrivate)} (${Math.abs(d.daysUntilDue)}d)`).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Main tabs: Debts / Insights */}
      <Tabs defaultValue="debts">
        <TabsList className="sticky top-0 bg-background/95 backdrop-blur z-10 py-1">
          <TabsTrigger value="debts" className="flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5" /> Debts
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" /> Insights
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" /> Charts
          </TabsTrigger>
        </TabsList>

        {/* ── Debts tab ── */}
        <TabsContent value="debts" className="mt-4">
          {/* Status filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['active', 'all', 'paid', 'forgiven'] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
                {f === 'active' && debts.filter(d => d.status === 'Active').length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 h-4 min-w-4 px-1 text-xs">
                    {debts.filter(d => d.status === 'Active').length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : filteredDebts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No debts here</p>
              {filter === 'active' && (
                <p className="text-sm mt-1">
                  <button className="underline" onClick={() => setShowAdd(true)}>Add your first debt</button> to start tracking.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredDebts.map((debt) => (
                <DebtCard
                  key={debt.id}
                  debt={debt}
                  urgency={urgencyMap.get(debt.id)}
                  onRecordPayment={setPayDebt}
                  onEdit={setEditDebt}
                  onDelete={setDeleteTarget}
                  onForgive={handleForgive}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Insights tab ── */}
        <TabsContent value="insights" className="mt-4">
          {insightsLoading ? (
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-24 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : insights ? (
            <DebtInsightsPanel insights={insights} />
          ) : (
            <p className="text-muted-foreground text-sm">No insights available.</p>
          )}
        </TabsContent>

        {/* ── Charts tab ── */}
        <TabsContent value="charts" className="mt-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5"><Skeleton className="h-48 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <DebtReductionChart debts={debts} />
              <DebtBreakdownPie debts={debts} />
              <div className="md:col-span-2">
                <MonthlyBurdenChart debts={debts} />
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      </div>{/* end scrollable zone */}

      {/* Sheets & dialogs */}
      <AddDebtSheet
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(debt) => {
          setDebts((prev) => [debt, ...prev]);
          getDebtInsights().then(setInsights).catch(() => {});
        }}
      />

      <EditDebtSheet
        debt={editDebt}
        open={!!editDebt}
        onClose={() => setEditDebt(null)}
        onUpdated={(updated) => {
          replaceDebt(updated);
          getDebtInsights().then(setInsights).catch(() => {});
          setEditDebt(null);
        }}
      />

      <RecordPaymentDialog
        debt={payDebt}
        open={!!payDebt}
        onClose={() => setPayDebt(null)}
        onRecorded={(updated) => {
          replaceDebt(updated);
          getDebtInsights().then(setInsights).catch(() => {});
          setPayDebt(null);
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeletePin(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Debt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the debt to <strong>{deleteTarget?.creditorName}</strong>?
              All payment history will be lost. Enter your PIN to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="delete-pin" className="text-sm">PIN</Label>
            <Input
              id="delete-pin"
              type="password"
              placeholder="Enter your PIN"
              value={deletePin}
              onChange={(e) => setDeletePin(e.target.value)}
              className="mt-1.5"
              onKeyDown={(e) => { if (e.key === 'Enter') handleDelete(); }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting || !deletePin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
