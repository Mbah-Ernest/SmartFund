import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PersonalDebtDto } from '../types/financeTypes';

const COLORS = [
  'var(--color-primary)',
  '#f97316',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

interface Props {
  debts: PersonalDebtDto[];
}

export default function DebtBreakdownPie({ debts }: Props) {
  const activeDebts = debts.filter((d) => d.status === 'Active' && d.remainingBalance > 0);

  if (activeDebts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Debt Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">No active debts.</p>
        </CardContent>
      </Card>
    );
  }

  const data = activeDebts.map((d) => ({
    name: d.creditorName,
    value: d.remainingBalance,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Remaining Debt by Creditor</CardTitle>
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
              formatter={(v: number) => [`₦${v.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, 'Remaining']}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
