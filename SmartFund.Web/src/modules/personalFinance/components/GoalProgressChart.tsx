import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PersonalGoalDto } from '../types/financeTypes';

interface Props {
  goals: PersonalGoalDto[];
}

function barColor(pct: number) {
  if (pct >= 75) return '#22c55e'; // green
  if (pct >= 40) return '#3b82f6'; // blue
  return '#f59e0b'; // amber
}

export default function GoalProgressChart({ goals }: Props) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Goal Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No goals yet.</p>
        </CardContent>
      </Card>
    );
  }

  const data = goals.map((g) => ({
    name: g.name.length > 20 ? g.name.slice(0, 18) + '…' : g.name,
    progressPct: Math.min(g.progressPct, 100),
    fill: barColor(g.progressPct),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Goal Progress (%)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(180, goals.length * 44)}>
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={110}
            />
            <Tooltip
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Progress']}
              contentStyle={{ fontSize: 12 }}
            />
            <ReferenceLine x={100} stroke="#64748b" strokeDasharray="4 2" />
            <Bar dataKey="progressPct" radius={[0, 4, 4, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
