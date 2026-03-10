import { useState, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import type { CategoryAmountRow } from '../types/financeTypes';

const COLORS = [
  '#3B82F6',
  '#60A5FA',
  '#93C5FD',
  '#2563EB',
  '#1D4ED8',
  '#BFDBFE',
  '#1E40AF',
  '#DBEAFE'
];

type CategoryPieChartProps = {
  data: CategoryAmountRow[];
  loading?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ActiveShape(props: any) {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value
  } = props;

  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#334155" fontSize={13} fontWeight={600}>
        {payload.categoryName}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748B" fontSize={11}>
        {formatCurrency(value)} · {(percent * 100).toFixed(1)}%
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: 'drop-shadow(0 2px 6px rgba(59,130,246,0.25))' }}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.4}
      />
    </g>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function CategoryPieChart({
  data,
  loading
}: CategoryPieChartProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const onEnter = useCallback((_: unknown, index: number) => setActiveIdx(index), []);

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center">
        <div className="relative">
          <div className="h-44 w-44 rounded-full border-[12px] border-slate-100" />
          <div className="absolute inset-0 h-44 w-44 animate-spin rounded-full border-[12px] border-transparent border-t-blue-200" style={{ animationDuration: '1.4s' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-16 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-80 flex-col items-center justify-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <svg className="h-7 w-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-500">No spending data yet</p>
        <p className="text-xs text-slate-400">Expense categories will appear here</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="categoryName"
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={105}
          paddingAngle={3}
          strokeWidth={0}
          activeIndex={activeIdx}
          activeShape={ActiveShape}
          onMouseEnter={onEnter}
          animationDuration={900}
          animationEasing="ease-out"
        >
          {data.map((_entry, idx) => (
            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            borderRadius: 12,
            border: 'none',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
          }}
        />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
