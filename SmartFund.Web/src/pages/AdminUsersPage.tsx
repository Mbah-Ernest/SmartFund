import { useEffect, useState } from 'react';
import { adminListUsers, adminGetInsights } from '../api/loansApi';
import type { UserSummaryDto, UserCreditInsightsDto } from '../types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }
function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserSummaryDto | null>(null);
  const [insights, setInsights] = useState<UserCreditInsightsDto | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    adminListUsers()
      .then(setUsers)
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  async function selectUser(user: UserSummaryDto) {
    setSelected(user);
    setInsights(null);
    setInsightsLoading(true);
    try {
      const data = await adminGetInsights(user.id);
      setInsights(data);
    } catch {
      // leave insights null
    } finally {
      setInsightsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Members</h1>
        <p className="text-muted-foreground text-sm">Click a row to view credit scoring insights.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-5 items-start">
        {/* Users table */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <Card className="rounded-xl">
              <CardContent className="p-0">
                <div className="divide-y">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : users.length === 0 ? (
            <Card className="rounded-xl">
              <CardContent className="flex h-40 items-center justify-center">
                <p className="text-sm text-muted-foreground">No members found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map(user => (
                      <TableRow
                        key={user.id}
                        onClick={() => void selectUser(user)}
                        className={cn(
                          'cursor-pointer',
                          selected?.id === user.id && 'bg-muted/50'
                        )}
                      >
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell className="text-muted-foreground">{user.role}</TableCell>
                        <TableCell>
                          <Badge className={cn('border-0', user.isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                          )}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(user.createdAtUtc).toLocaleDateString('en-GB')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Insights panel */}
        {selected && (
          <Card className="w-80 shrink-0 rounded-xl overflow-hidden">
            <CardHeader className="border-b bg-primary/5 pb-3">
              <CardTitle className="text-sm">{selected.fullName}</CardTitle>
              <p className="text-xs text-primary font-medium">Credit Insights</p>
            </CardHeader>
            <CardContent className="pt-4 pb-2">
              {insightsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              ) : !insights ? (
                <p className="text-sm text-muted-foreground">No data available.</p>
              ) : (
                <>
                  <MetricRow label="Tenure" value={`${insights.tenureDays} days`} />
                  <MetricRow label="Avg Monthly Income" value={fmt(insights.avgMonthlyIncome)} />
                  <MetricRow label="Avg Monthly Expenses" value={fmt(insights.avgMonthlyExpenses)} />
                  <MetricRow label="Income / Expense Ratio" value={insights.incomeToExpenseRatio.toFixed(2)} />
                  <MetricRow label="Bank Accounts" value={String(insights.bankAccountCount)} />
                  <MetricRow label="Budget Compliance" value={pct(insights.budgetComplianceRate)} />
                  <MetricRow label="Goals On Track" value={pct(insights.goalOnTrackRate)} />
                  <MetricRow label="Income Stability" value={insights.incomeStabilityScore.toFixed(2)} />
                  <MetricRow label="Avg Tx / Month" value={insights.avgMonthlyTransactionCount.toFixed(1)} />
                  <MetricRow label="Loans" value={String(insights.loanCount)} />
                  {insights.mostRecentLoanStatus && (
                    <MetricRow label="Last Loan Status" value={insights.mostRecentLoanStatus} />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
