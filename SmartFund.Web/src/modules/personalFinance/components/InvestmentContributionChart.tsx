import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import type { InvestmentContributionPoint } from '../types/financeTypes';

type InvestmentContributionChartProps = {
  data: InvestmentContributionPoint[];
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
    <div className="relative h-72 overflow-hidden px-4 pb-6">
      <svg viewBox="0 0 400 200" className="h-full w-full" preserveAspectRatio="none">
        <path d="M0 180 Q50 160 100 140 T200 100 T300 80 T400 50" fill="none" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
        <path d="M0 180 Q50 160 100 140 T200 100 T300 80 T400 50 V200 H0 Z" fill="url(#skelGrad)" />
        <defs><linearGradient id="skelGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.4" /><stop offset="100%" stopColor="#DBEAFE" stopOpacity="0" /></linearGradient></defs>
      </svg>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-72 flex-col items-center justify-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500">No investment contributions yet</p>
      <p className="text-xs text-slate-400">Start investing to track your contributions</p>
    </div>
  );
}

export default function InvestmentContributionChart({
  data,
  loading
}: InvestmentContributionChartProps) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="investGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity={0.08} />
            <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
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
          formatter={(value: number) => [
            formatCurrency(value),
            'Contributions'
          ]}
          labelStyle={{ color: '#334155', fontWeight: 600, marginBottom: 4 }}
          contentStyle={{
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '10px 14px'
          }}
        />
        <Area
          type="monotone"
          dataKey="amount"
          name="Contributions"
          stroke="#2563EB"
          strokeWidth={2.5}
          fill="url(#investGrad)"
          dot={{ r: 3.5, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{
            r: 6,
            fill: '#1D4ED8',
            strokeWidth: 3,
            stroke: '#DBEAFE'
          }}
          animationDuration={1000}
          animationEasing="ease-in-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
