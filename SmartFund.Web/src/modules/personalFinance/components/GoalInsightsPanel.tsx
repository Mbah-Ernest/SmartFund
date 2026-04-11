import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, AlertTriangle, Target, CalendarClock } from 'lucide-react';
import type { GoalInsightsDto } from '../types/financeTypes';
import { cn } from '@/lib/utils';

interface Props {
  insights: GoalInsightsDto;
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GoalInsightsPanel({ insights }: Props) {
  const { items } = insights;

  const urgentGoal = items
    .filter((i) => !i.isOverdue && i.progressPct < 100)
    .sort((a, b) => {
      const da = a.estimatedCompletionDate ? new Date(a.estimatedCompletionDate).getTime() : Infinity;
      const db = b.estimatedCompletionDate ? new Date(b.estimatedCompletionDate).getTime() : Infinity;
      return da - db;
    })[0] ?? null;

  return (
    <div className="flex flex-col gap-4">
      {insights.overdueGoals > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {insights.overdueGoals} goal{insights.overdueGoals !== 1 ? 's are' : ' is'} past the deadline.
            Consider extending the deadline or increasing your savings rate.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Overall progress */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{insights.overallProgressPct.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mb-3">
              {fmt(insights.totalSavedNaira)} saved of {fmt(insights.totalTargetNaira)} total
            </p>
            <Progress value={Math.min(insights.overallProgressPct, 100)} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {insights.goalsOnTrack}/{insights.totalActiveGoals} goals on track
            </p>
          </CardContent>
        </Card>

        {/* Next deadline */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              Next Deadline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.nextDeadline ? (
              <>
                <p className="text-lg font-bold">{insights.nextDeadlineGoalName}</p>
                <p className="text-xs text-muted-foreground mt-1">{fmtDate(insights.nextDeadline)}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Most urgent goal */}
      {urgentGoal && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Urgent Goal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{urgentGoal.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(urgentGoal.savedNaira)} / {fmt(urgentGoal.targetNaira)}
                  {urgentGoal.monthlyRequiredNaira > 0 && (
                    <> &mdash; needs {fmt(urgentGoal.monthlyRequiredNaira)}/mo</>
                  )}
                </p>
              </div>
              {urgentGoal.isOnTrack ? (
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">On Track</Badge>
              ) : (
                <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Behind</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly savings plan table */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Monthly Savings Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1.5 pr-3">Goal</th>
                    <th className="text-right py-1.5 pr-3">Monthly Needed</th>
                    <th className="text-right py-1.5 pr-3">Est. Completion</th>
                    <th className="text-center py-1.5">On Track?</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.goalId} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium">
                        <span className={cn(item.isOverdue && 'text-destructive')}>{item.name}</span>
                        {item.isOverdue && <span className="ml-1 text-xs text-destructive">(overdue)</span>}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {item.monthlyRequiredNaira > 0 ? fmt(item.monthlyRequiredNaira) : '—'}
                      </td>
                      <td className="py-2 pr-3 text-right">
                        {item.estimatedCompletionDate
                          ? fmtDate(item.estimatedCompletionDate)
                          : '—'}
                      </td>
                      <td className="py-2 text-center">
                        {item.progressPct >= 100
                          ? <CheckCircle2 className="h-4 w-4 text-success inline" />
                          : item.isOnTrack
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
