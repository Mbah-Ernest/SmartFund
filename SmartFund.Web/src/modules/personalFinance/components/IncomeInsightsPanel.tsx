import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CalendarCheck, Repeat, TrendingUp } from 'lucide-react';
import type { IncomeScheduleItemDto, IncomeScheduleSummaryDto } from '../types/financeTypes';
import { maskAmount } from '@/lib/utils';

interface Props {
  summary: IncomeScheduleSummaryDto | null;
  items: IncomeScheduleItemDto[];
  isPrivate: boolean;
}

function toAmount(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function IncomeInsightsPanel({ summary, items, isPrivate }: Props) {
  const overdueCount = items.filter((i) => i.status === 'Active' && new Date(i.nextExpectedDate) < new Date()).length;
  const recurringCount = items.filter((i) => i.kind === 'Recurring' && i.status === 'Active').length;
  const oneTimeCount = items.filter((i) => i.kind === 'OneTime' && i.status === 'Active').length;
  const completedCount = items.filter((i) => i.status === 'Completed').length;

  const expectedIncomeThisMonth = toAmount(summary?.expectedIncomeThisMonthNaira ?? summary?.expectedThisMonthNaira);
  const expectedExpenseThisMonth = toAmount(summary?.expectedExpenseThisMonthNaira);
  const projectedNetThisMonth = toAmount(summary?.projectedNetThisMonthNaira ?? (expectedIncomeThisMonth - expectedExpenseThisMonth));
  const projectedNetNext30 = toAmount(summary?.projectedNetNext30DaysNaira ?? summary?.expectedNext30DaysNaira);
  const recurringTotal = toAmount(summary?.recurringIncomeTotalNaira) + toAmount(summary?.recurringExpenseTotalNaira);
  const oneTimeTotal = toAmount(summary?.oneTimeIncomeTotalNaira) + toAmount(summary?.oneTimeExpenseTotalNaira);

  const mixTotal = recurringTotal + oneTimeTotal;
  const recurringShare = mixTotal > 0 ? (recurringTotal / mixTotal) * 100 : 0;
  const completionRate = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div className="flex flex-col gap-4">
      {overdueCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {overdueCount} schedule item{overdueCount > 1 ? 's are' : ' is'} overdue. Mark them completed to keep projections accurate.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-muted-foreground" />
              Monthly Net Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{maskAmount(projectedNetThisMonth, isPrivate)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Inflow {maskAmount(expectedIncomeThisMonth, isPrivate)} · Outflow {maskAmount(expectedExpenseThisMonth, isPrivate)}
            </p>
            <p className="text-xs text-muted-foreground">Next 30 days net: {maskAmount(projectedNetNext30, isPrivate)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Repeat className="h-4 w-4 text-muted-foreground" />
              Schedule Mix Stability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recurringShare.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground mb-3">of active schedule value is recurring</p>
            <Progress value={Math.min(Math.max(recurringShare, 0), 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {recurringCount} recurring · {oneTimeCount} one-time items
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Execution Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-base font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Total items</p>
            </div>
            <div>
              <p className="text-base font-bold text-success">{completedCount}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div>
              <p className="text-base font-bold">{completionRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Completion rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
