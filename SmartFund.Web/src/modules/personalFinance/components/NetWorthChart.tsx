import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { NetWorthPoint } from '../types/financeTypes';

type NetWorthChartProps = {
  data: NetWorthPoint[];
  loading?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

function ChartSkeleton() {
  return (
    <div className="flex h-80 flex-col justify-end gap-2 px-4 pb-6">
      <div className="flex items-end gap-3">
        {[40, 55, 45, 65, 50, 72, 60].map((h, i) => (
          <div key={i} className="relative flex-1 overflow-hidden rounded-t-md bg-slate-100 dark:bg-slate-800" style={{ height: `${h}%` }}>
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" />
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-2.5 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-80 flex-col items-center justify-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
        <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500">No net worth history yet</p>
      <p className="text-xs text-slate-400">Record transactions to start tracking growth</p>
    </div>
  );
}

export default function NetWorthChart({ data, loading }: NetWorthChartProps) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <filter id="nwGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--grid-stroke, #E2E8F0)" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#94A3B8' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#94A3B8' }}
          tickFormatter={(v: number) => formatCurrency(v)}
          width={90}
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Net Worth']}
          labelStyle={{ color: 'var(--tooltip-text, #334155)', fontWeight: 600, marginBottom: 4 }}
          contentStyle={{
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '10px 14px',
            backgroundColor: 'var(--tooltip-bg, #fff)',
            color: 'var(--tooltip-text, #334155)'
          }}
        />
        <Line
          type="monotone"
          dataKey="balance"
          name="Net Worth"
          stroke="#3B82F6"
          strokeWidth={3}
          dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{
            r: 7,
            fill: '#2563EB',
            strokeWidth: 3,
            stroke: '#DBEAFE'
          }}
          animationDuration={1200}
          animationEasing="ease-in-out"
          filter="url(#nwGlow)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
