import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { MonthlyIncomeExpense } from '../types/financeTypes';

type CashFlowChartProps = {
  data: MonthlyIncomeExpense[];
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
      <div className="flex items-end gap-4">
        {[35, 60, 40, 70, 50, 55].map((h, i) => (
          <div key={i} className="flex flex-1 items-end gap-1">
            <div className="relative flex-1 overflow-hidden rounded-t-md bg-blue-100/60" style={{ height: `${h}%` }}>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
            <div className="relative flex-1 overflow-hidden rounded-t-md bg-slate-100" style={{ height: `${h * 0.7}%` }}>
              <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-2.5 flex-1 rounded bg-slate-100" />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-80 flex-col items-center justify-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-500">No cash-flow data yet</p>
      <p className="text-xs text-slate-400">Income and expenses will appear here</p>
    </div>
  );
}

export default function CashFlowChart({
  data,
  loading
}: CashFlowChartProps) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) return <EmptyState />;

  /* Add net to each row for the reference line hint */
  const enriched = data.map((d) => ({
    ...d,
    net: d.income - d.expenses
  }));

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={enriched}
        barGap={6}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
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
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name
          ]}
          labelStyle={{ color: '#334155', fontWeight: 600, marginBottom: 4 }}
          contentStyle={{
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '10px 14px'
          }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar
          dataKey="income"
          name="Income"
          fill="#3B82F6"
          radius={[6, 6, 0, 0]}
          maxBarSize={36}
          animationDuration={800}
          animationEasing="ease-out"
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="#60A5FA"
          radius={[6, 6, 0, 0]}
          maxBarSize={36}
          animationDuration={800}
          animationEasing="ease-out"
          animationBegin={200}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
