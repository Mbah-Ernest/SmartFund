import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
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
import {
  Plus,
  AlertTriangle,
  RefreshCw,
  Pencil,
  Trash2,
  CheckCircle,
  CalendarClock,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  getIncomeSchedule,
  getIncomeScheduleSummary,
  markIncomeReceived,
  deleteIncomeScheduleItem,
} from '../services/personalFinanceApi';
import type { IncomeScheduleItemDto, IncomeScheduleSummaryDto } from '../types/financeTypes';
import AddEditIncomeSheet from '../components/AddEditIncomeSheet';
import IncomeInsightsPanel from '../components/IncomeInsightsPanel';
import { toast } from 'sonner';
import { formatNaira, formatDate, maskAmount } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const CHART_COLORS = ['#22c55e', '#a855f7'];

function toAmount(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function scheduleSign(direction: IncomeScheduleItemDto['direction']): number {
  return direction === 'Outflow' ? -1 : 1;
}

function sumExpectedUntilDate(items: IncomeScheduleItemDto[], untilDateIso: string): number {
  const untilDate = new Date(untilDateIso);
  if (Number.isNaN(untilDate.getTime())) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  untilDate.setHours(23, 59, 59, 999);

  if (untilDate < today) return 0;

  let total = 0;
  for (const item of items) {
    if (item.status !== 'Active') continue;

    const amount = toAmount(item.amount);
    let cursor = new Date(item.nextExpectedDate);
    if (Number.isNaN(cursor.getTime())) continue;

    if (item.kind === 'OneTime') {
      if (cursor >= today && cursor <= untilDate) total += amount * scheduleSign(item.direction);
      continue;
    }

    const endDate = item.endDate ? new Date(item.endDate) : null;
    while (cursor <= untilDate && (!endDate || cursor <= endDate)) {
      if (cursor >= today) total += amount * scheduleSign(item.direction);
      cursor = addInterval(cursor, item.recurrenceInterval);
    }
  }

  return total;
}

function addInterval(date: Date, interval: IncomeScheduleItemDto['recurrenceInterval']) {
  const d = new Date(date);
  switch (interval) {
    case 'Daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'Weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'BiWeekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'Monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'Quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'Annually':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

function buildProjection(items: IncomeScheduleItemDto[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() + idx, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      month: d.toLocaleDateString('en-NG', { month: 'short' }),
      amount: 0,
    };
  });

  const monthMap = new Map(months.map((m) => [m.key, m]));
  const end = new Date(now.getFullYear(), now.getMonth() + 6, 0);

  for (const item of items) {
    if (item.status !== 'Active') continue;

    const amount = toAmount(item.amount);
    let cursor = new Date(item.nextExpectedDate);
    if (Number.isNaN(cursor.getTime())) continue;

    if (item.kind === 'OneTime') {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(key);
      if (bucket) bucket.amount += amount * scheduleSign(item.direction);
      continue;
    }

    const endDate = item.endDate ? new Date(item.endDate) : null;

    while (cursor <= end && (!endDate || cursor <= endDate)) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const bucket = monthMap.get(key);
      if (bucket) bucket.amount += amount * scheduleSign(item.direction);
      cursor = addInterval(cursor, item.recurrenceInterval);
    }
  }

  return months;
}

function isOverdue(item: IncomeScheduleItemDto): boolean {
  return item.status === 'Active' && new Date(item.nextExpectedDate) < TODAY;
}

export default function IncomeSchedulePage() {
  const { isPrivate } = usePrivacy();
  const [items, setItems] = useState<IncomeScheduleItemDto[]>([]);
  const [summary, setSummary] = useState<IncomeScheduleSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<IncomeScheduleItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IncomeScheduleItemDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expectedUntilDate, setExpectedUntilDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        getIncomeSchedule(true),
        getIncomeScheduleSummary(),
      ]);
      setItems(list);
      setSummary(sum);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load income schedule');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function reloadSummary() {
    try {
      const sum = await getIncomeScheduleSummary();
      setSummary(sum);
    } catch {
      // non-critical
    }
  }

  async function handleMarkReceived(id: number) {
    try {
      const updated = await markIncomeReceived(id);
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
      await reloadSummary();
      toast.success(updated.direction === 'Outflow' ? 'Marked as paid' : 'Marked as received');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to mark received');
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteIncomeScheduleItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      await reloadSummary();
      toast.success('Deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handleSaved(saved: IncomeScheduleItemDto) {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    void reloadSummary();
  }

  const upcoming = items
    .filter((i) => i.status !== 'Completed')
    .sort((a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime());

  const completed = items.filter((i) => i.status === 'Completed');

  const projectionData = useMemo(() => buildProjection(items), [items]);
  const expectedByDate = useMemo(
    () => sumExpectedUntilDate(items, expectedUntilDate),
    [items, expectedUntilDate]
  );
  const expectedIncomeThisMonth = toAmount(summary?.expectedIncomeThisMonthNaira ?? summary?.expectedThisMonthNaira);
  const expectedExpenseThisMonth = toAmount(summary?.expectedExpenseThisMonthNaira);
  const projectedNetThisMonth = toAmount(summary?.projectedNetThisMonthNaira ?? (expectedIncomeThisMonth - expectedExpenseThisMonth));
  const kindData = useMemo(() => {
    const recurring = items
      .filter((i) => i.kind === 'Recurring' && i.status !== 'Completed')
      .reduce((sum, i) => sum + toAmount(i.amount), 0);
    const oneTime = items
      .filter((i) => i.kind === 'OneTime' && i.status !== 'Completed')
      .reduce((sum, i) => sum + toAmount(i.amount), 0);

    return [
      { name: 'Recurring', value: recurring },
      { name: 'One-Time', value: oneTime },
    ];
  }, [items]);
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden p-4 pt-0 gap-4">
      <div className="shrink-0 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cashflow Schedule</h1>
            <p className="text-muted-foreground text-sm">Track planned income and planned recurring expenses for better forecasting</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-6 w-32" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Expected Inflow (Month)</p>
                  <p className="text-xl font-bold">{maskAmount(expectedIncomeThisMonth, isPrivate)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Expected Outflow (Month)</p>
                  <p className="text-xl font-bold">{maskAmount(expectedExpenseThisMonth, isPrivate)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Projected Net (Month)</p>
                  <p className="text-xl font-bold">{maskAmount(projectedNetThisMonth, isPrivate)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <p className="text-xs text-muted-foreground mb-1">Projected Net by Date</p>
                  <p className="text-xl font-bold">{maskAmount(expectedByDate, isPrivate)}</p>
                  <div className="mt-2">
                    <Input
                      type="date"
                      value={expectedUntilDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setExpectedUntilDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="upcoming" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="upcoming" className="flex items-center gap-1.5">
            <CalendarClock className="h-3.5 w-3.5" />
            Upcoming
            {upcoming.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{upcoming.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completed.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{completed.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : upcoming.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No scheduled cashflow yet</p>
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {upcoming.map((item) => (
                <IncomeItemRow
                  key={item.id}
                  item={item}
                  isPrivate={isPrivate}
                  showMarkReceived
                  onMarkReceived={() => handleMarkReceived(item.id)}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : completed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No completed items yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {completed.map((item) => (
                <IncomeItemRow
                  key={item.id}
                  item={item}
                  isPrivate={isPrivate}
                  showMarkReceived={false}
                  onEdit={() => setEditItem(item)}
                  onDelete={() => setDeleteTarget(item)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="mt-4 flex-1 overflow-y-auto">
          <IncomeInsightsPanel summary={summary} items={items} isPrivate={isPrivate} />
        </TabsContent>

        <TabsContent value="charts" className="mt-4 flex-1 overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Projected Net Cashflow (6 Months)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={projectionData} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${Math.round(v / 1000)}k`} />
                    <Tooltip formatter={(v: number) => [formatNaira(v), 'Net']} contentStyle={{ fontSize: 12 }} />
                    <Bar dataKey="amount" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Active Schedule Mix</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={kindData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={78}
                      label={({ name, percent }) => `${name} ${Number.isFinite(percent) ? (percent * 100).toFixed(0) : '0'}%`}
                    >
                      {kindData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatNaira(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Sheet */}
      <AddEditIncomeSheet
        open={showAdd || !!editItem}
        onClose={() => { setShowAdd(false); setEditItem(null); }}
        onSaved={handleSaved}
        item={editItem ?? undefined}
      />

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.label}</strong>. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RowProps {
  item: IncomeScheduleItemDto;
  isPrivate: boolean;
  showMarkReceived: boolean;
  onMarkReceived?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function IncomeItemRow({ item, isPrivate, showMarkReceived, onMarkReceived, onEdit, onDelete }: RowProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold truncate">{item.label}</span>
              <Badge
                variant="outline"
                style={item.direction === 'Outflow' ? { borderColor: '#ef4444', color: '#ef4444' } : { borderColor: '#22c55e', color: '#22c55e' }}
              >
                {item.direction === 'Outflow' ? 'Expense' : 'Income'}
              </Badge>
              <Badge variant={item.kind === 'Recurring' ? 'secondary' : 'outline'}
                style={item.kind === 'OneTime' ? { borderColor: '#a855f7', color: '#a855f7' } : undefined}>
                {item.kind === 'Recurring' ? 'Recurring' : 'One-Time'}
              </Badge>
              {isOverdue(item) && (
                <Badge variant="outline" style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                  Overdue
                </Badge>
              )}
              {item.status === 'Paused' && (
                <Badge variant="outline" className="text-muted-foreground">Paused</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {maskAmount(toAmount(item.amount), isPrivate)}
              {item.recurrenceInterval && (
                <span className="ml-1 opacity-75">· {item.recurrenceInterval}</span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.status === 'Completed'
                ? (item.direction === 'Outflow' ? 'Paid' : 'Received')
                : (item.direction === 'Outflow' ? 'Due' : 'Expected')}: {formatDate(item.nextExpectedDate)}
            </p>
            {item.kind === 'Recurring' && item.endDate && (
              <p className="text-xs text-muted-foreground mt-0.5">Ends: {formatDate(item.endDate)}</p>
            )}
            {item.notes && (
              <p className="text-xs text-muted-foreground mt-0.5 italic truncate">{item.notes}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showMarkReceived && (
              <Button
                variant="outline"
                size="sm"
                disabled={item.status === 'Paused'}
                onClick={onMarkReceived}
                className="text-xs gap-1"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{item.direction === 'Outflow' ? 'Mark Paid' : 'Mark Received'}</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
