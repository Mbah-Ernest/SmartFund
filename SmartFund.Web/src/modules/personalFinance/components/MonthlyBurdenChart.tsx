import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PersonalDebtDto } from '../types/financeTypes';

interface Props {
  debts: PersonalDebtDto[];
}

function buildBurdenData(debts: PersonalDebtDto[]) {
  const byMonth: Record<string, number> = {};
  const now = new Date();

  // Seed last 6 months with 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth[key] = 0;
  }

  for (const debt of debts) {
    for (const payment of debt.payments) {
      const d = new Date(payment.paidOn);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in byMonth) {
        byMonth[key] += payment.amount;
      }
    }
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
      amount: Math.round(amount),
    }));
}

export default function MonthlyBurdenChart({ debts }: Props) {
  const data = buildBurdenData(debts);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Monthly Debt Payments (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number) => [`₦${v.toLocaleString('en-NG')}`, 'Paid']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="amount" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
