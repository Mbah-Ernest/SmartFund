import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMyLoans } from '../api/loansApi';
import type { LoanApplicationDto } from '../types/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  Pending:     { label: 'Pending',      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
  UnderReview: { label: 'Under Review', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' },
  Approved:    { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' },
  Rejected:    { label: 'Rejected',     cls: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300' },
  Disbursed:   { label: 'Disbursed',    cls: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cn('rounded-full font-medium border-0', cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

export default function MyLoansPage() {
  const [loans, setLoans] = useState<LoanApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyLoans()
      .then(setLoans)
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Loan Applications</h1>
          <p className="text-muted-foreground text-sm">Track the status of your loan requests.</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/loans/apply">
            <Plus className="h-4 w-4" />
            Apply for a Loan
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && (
        <Card className="rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {['Submitted', 'Amount', 'Total Repay', 'Purpose', 'Duration', 'Plan', 'Status', 'Note'].map(h => (
                    <TableHead key={h}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!loading && !error && loans.length === 0 && (
        <Card className="rounded-xl">
          <CardContent className="flex h-44 flex-col items-center justify-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">You haven't submitted any loan applications yet.</p>
            <Button asChild>
              <Link to="/loans/apply">Apply Now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && loans.length > 0 && (
        <Card className="rounded-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total Repay</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map(loan => (
                  <TableRow key={loan.id}>
                    <TableCell className="text-muted-foreground">
                      {new Date(loan.submittedAtUtc).toLocaleDateString('en-GB')}
                    </TableCell>
                    <TableCell className="font-semibold">{fmt(loan.amount)}</TableCell>
                    <TableCell>{fmt(loan.totalRepayable)}</TableCell>
                    <TableCell>{loan.purposeCategory}</TableCell>
                    <TableCell>{loan.durationDays} days</TableCell>
                    <TableCell>{loan.repaymentInstallments}x</TableCell>
                    <TableCell>
                      <StatusBadge status={loan.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-xs truncate">
                      {loan.adminNote ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
