import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, CalendarCheck, AlertTriangle } from 'lucide-react';
import type { DebtInsightsDto } from '../types/financeTypes';
import { cn } from '@/lib/utils';

interface Props {
  insights: DebtInsightsDto;
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function DebtInsightsPanel({ insights }: Props) {
  const hasActiveDebts = insights.coverageItems.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Savings insufficiency warning */}
      {insights.savingsInsufficient && hasActiveDebts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your average monthly expenses exceed your income. You're not building savings to cover these debts.
            Consider reducing expenses or increasing income.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly burden */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Monthly Debt Burden
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(insights.monthlyDebtBurden)}</p>
            <p className="text-xs text-muted-foreground mb-3">paid toward debts last month</p>
            <Progress
              value={Math.min(insights.burdenPercent, 100)}
              className={cn('h-2', insights.burdenPercent > 40 ? '[&>div]:bg-destructive' : insights.burdenPercent > 20 ? '[&>div]:bg-warning' : '')}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {insights.burdenPercent.toFixed(1)}% of avg monthly income
              {insights.burdenPercent > 40 && ' — dangerously high'}
              {insights.burdenPercent > 20 && insights.burdenPercent <= 40 && ' — manageable but high'}
              {insights.burdenPercent <= 20 && insights.burdenPercent > 0 && ' — healthy'}
            </p>
          </CardContent>
        </Card>

        {/* Debt-free date */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              Debt-Free Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.debtFreeDate ? (
              <>
                <p className="text-2xl font-bold">{fmtDate(insights.debtFreeDate)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on your {fmt(insights.avgMonthlySavings)}/month avg savings
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-muted-foreground">Cannot project</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveDebts
                    ? 'Increase your monthly savings to see a projection'
                    : 'No active debts'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income / savings context */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Your 90-Day Financial Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-base font-bold text-success">{fmt(insights.avgMonthlyIncome)}</p>
              <p className="text-xs text-muted-foreground">Avg income / mo</p>
            </div>
            <div>
              <p className="text-base font-bold text-destructive">{fmt(insights.avgMonthlyExpenses)}</p>
              <p className="text-xs text-muted-foreground">Avg expenses / mo</p>
            </div>
            <div>
              <p className={cn('text-base font-bold', insights.avgMonthlySavings >= 0 ? 'text-primary' : 'text-destructive')}>
                {fmt(Math.abs(insights.avgMonthlySavings))}
              </p>
              <p className="text-xs text-muted-foreground">
                {insights.avgMonthlySavings >= 0 ? 'Avg savings / mo' : 'Avg deficit / mo'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily / weekly savings targets */}
      {insights.savingsTargets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Required Savings Per Debt</CardTitle>
          </CardHeader>
          <CardContent>
            {insights.savingsInsufficient ? (
              <p className="text-sm text-muted-foreground">Cannot compute — no savings surplus.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {insights.savingsTargets.map((t) => (
                  <div key={t.debtId} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t.creditorName}</span>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span><span className="font-semibold text-foreground">{fmt(t.dailySavingsTarget)}</span>/day</span>
                      <span><span className="font-semibold text-foreground">{fmt(t.weeklySavingsTarget)}</span>/week</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Coverage analysis */}
      {insights.coverageItems.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Coverage Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1.5 pr-3">Creditor</th>
                    <th className="text-right py-1.5 pr-3">Remaining</th>
                    <th className="text-right py-1.5 pr-3">Days Left</th>
                    <th className="text-right py-1.5 pr-3">Projected Savings</th>
                    <th className="text-center py-1.5">Cover?</th>
                  </tr>
                </thead>
                <tbody>
                  {insights.coverageItems.map((c) => (
                    <tr key={c.debtId} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">{c.creditorName}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(c.remainingBalance)}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {c.daysUntilDue < 0
                          ? <span className="text-destructive">{Math.abs(c.daysUntilDue)}d ago</span>
                          : `${c.daysUntilDue}d`}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">{fmt(c.projectedSavingsByDue)}</td>
                      <td className="py-2 text-center">
                        {c.canCover
                          ? <CheckCircle2 className="h-4 w-4 text-success inline" />
                          : <XCircle className="h-4 w-4 text-destructive inline" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
