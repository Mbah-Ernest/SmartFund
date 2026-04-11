import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PersonalGoalDto } from '../types/financeTypes';

interface Props {
  goals: PersonalGoalDto[];
}

export default function GoalBreakdownPie({ goals }: Props) {
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Savings Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No goals yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalSaved = goals.reduce((s, g) => s + g.effectiveSavedAmount, 0);
  const totalRemaining = goals.reduce((s, g) => s + g.remainingAmount, 0);

  const data = [
    { name: 'Saved', value: totalSaved },
    { name: 'Remaining', value: totalRemaining },
  ].filter((d) => d.value > 0);

  const COLORS = ['#22c55e', '#f59e0b'];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Total Saved vs Remaining</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => [
                '₦' + v.toLocaleString('en-NG', { minimumFractionDigits: 2 }),
                '',
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
