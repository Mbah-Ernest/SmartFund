import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
  Legend,
} from 'recharts';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { PersonalTransactionDto } from '../types/financeTypes';

interface DailyBalanceChartProps {
  transactions: PersonalTransactionDto[];
  walletCurrentBalance: number;
  loading: boolean;
}

type RangeOption = '7d' | '30d' | '90d' | '1y';

const RANGE_DAYS: Record<RangeOption, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
};

function abbreviateAmount(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₦${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₦${(abs / 1_000).toFixed(0)}k`;
  return `${sign}₦${abs.toFixed(0)}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

interface DailyPoint {
  date: string;
  balance: number;
  income: number;
  expense: number;
}

function computeDailyBalance(
  transactions: PersonalTransactionDto[],
  walletCurrentBalance: number,
  days: number
): DailyPoint[] {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setDate(now.getDate() - days);
  windowStart.setHours(0, 0, 0, 0);

  // Build a map of date -> net change for in-window transactions
  const dailyChange = new Map<string, { income: number; expense: number; net: number }>();

  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (d < windowStart) continue;
    const key = d.toISOString().slice(0, 10);
    const existing = dailyChange.get(key) ?? { income: 0, expense: 0, net: 0 };
    const type = tx.type.toLowerCase();
    if (type === 'income') {
      dailyChange.set(key, {
        income: existing.income + tx.amount,
        expense: existing.expense,
        net: existing.net + tx.amount,
      });
    } else if (type === 'expense' || type === 'investment') {
      dailyChange.set(key, {
        income: existing.income,
        expense: existing.expense + tx.amount,
        net: existing.net - tx.amount,
      });
    }
    // transfers net to 0 for total balance
  }

  // Derive balance at window start by subtracting in-window transactions from current balance
  let balanceAtStart = walletCurrentBalance;
  for (const tx of transactions) {
    const d = new Date(tx.date);
    if (d < windowStart) continue;
    const type = tx.type.toLowerCase();
    if (type === 'income') balanceAtStart -= tx.amount;
    else if (type === 'expense' || type === 'investment') balanceAtStart += tx.amount;
  }

  // Walk through every day in the window
  const points: DailyPoint[] = [];
  let runningBalance = balanceAtStart;

  for (let i = 0; i <= days; i++) {
    const d = new Date(windowStart);
    d.setDate(windowStart.getDate() + i);
    // Don't go into the future
    if (d > now) break;
    const key = d.toISOString().slice(0, 10);
    const change = dailyChange.get(key) ?? { income: 0, expense: 0, net: 0 };
    runningBalance += change.net;
    points.push({ date: key, balance: runningBalance, income: change.income, expense: change.expense });
  }

  return points;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: { value: number; dataKey?: string }[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const balance = payload.find((p) => p.dataKey === 'balance')?.value ?? 0;
  const income = payload.find((p) => p.dataKey === 'income')?.value ?? 0;
  const expense = payload.find((p) => p.dataKey === 'expense')?.value ?? 0;

  return (
    <div className="rounded-xl border bg-card px-3 py-2.5 shadow-lg text-sm min-w-[160px]">
      <p className="text-muted-foreground text-xs mb-1">{formatFullDate(label)}</p>
      <p className="font-bold text-foreground">
        Balance:{' '}
        <span className="text-primary">{abbreviateAmount(balance)}</span>
      </p>
      <p className="text-[11px] text-emerald-500 mt-0.5">
        Income: {abbreviateAmount(income)}
      </p>
      <p className="text-[11px] text-rose-500 mt-0.5">
        Expenses: {abbreviateAmount(expense)}
      </p>
    </div>
  );
}

export default function DailyBalanceChart({
  transactions,
  walletCurrentBalance,
  loading,
}: DailyBalanceChartProps) {
  const [range, setRange] = useState<RangeOption>('30d');

  const data = useMemo(
    () => computeDailyBalance(transactions, walletCurrentBalance, RANGE_DAYS[range]),
    [transactions, walletCurrentBalance, range]
  );

  const todayKey = new Date().toISOString().slice(0, 10);

  const ranges: RangeOption[] = ['7d', '30d', '90d', '1y'];

  if (loading) {
    return (
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <Skeleton className="h-[260px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in-0 duration-300">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-sm font-semibold">Daily Balance</p>
        </div>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                range === r
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-transparent text-muted-foreground hover:bg-muted'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {data.length < 3 ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <BarChart2 className="h-8 w-8 opacity-30" />
          <p className="text-sm">Not enough transaction history yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              interval="preserveStartEnd"
              tickFormatter={formatDateLabel}
              tickCount={6}
            />
            <YAxis
              yAxisId="balance"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={abbreviateAmount}
              tickCount={3}
              width={60}
            />
            <YAxis
              yAxisId="flow"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
              tickFormatter={abbreviateAmount}
              tickCount={3}
              width={56}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              align="left"
              iconType="circle"
              wrapperStyle={{ paddingTop: 8, fontSize: 12 }}
            />
            <ReferenceLine
              x={todayKey}
              yAxisId="balance"
              stroke="var(--color-primary)"
              strokeDasharray="4 2"
              label={{ value: 'Today', fill: 'var(--muted-foreground)', fontSize: 10, position: 'top' }}
            />
            <Line
              type="monotone"
              yAxisId="balance"
              dataKey="balance"
              name="Balance"
              stroke="var(--color-primary)"
              strokeWidth={2.5}
              dot={false}
              animationDuration={800}
            />
            <Line
              type="monotone"
              yAxisId="flow"
              dataKey="income"
              name="Income"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              animationDuration={800}
            />
            <Line
              type="monotone"
              yAxisId="flow"
              dataKey="expense"
              name="Expenses"
              stroke="#f43f5e"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              animationDuration={800}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
