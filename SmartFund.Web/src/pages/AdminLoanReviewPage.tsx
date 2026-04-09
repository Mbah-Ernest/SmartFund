import { useEffect, useMemo, useState } from 'react';
import {
  adminApproveLoan,
  adminDisburseLoan,
  adminListApplicants,
  adminListLoans,
  adminRejectApplicant,
  adminRejectLoan,
  adminStartReviewLoan,
  adminVerifyApplicant,
} from '../api/loansApi';
import type { LoanApplicantProfileDto, LoanApplicationDto } from '../types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  Pending:     { label: 'Pending',      cls: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
  UnderReview: { label: 'Under Review', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300' },
  Approved:    { label: 'Approved',     cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300' },
  Rejected:    { label: 'Rejected',     cls: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300' },
  Disbursed:   { label: 'Disbursed',    cls: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-300' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, cls: 'bg-muted text-muted-foreground' };
  return (
    <Badge className={cn('border-0', cfg.cls)}>
      {cfg.label}
    </Badge>
  );
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
}

export default function AdminLoanReviewPage() {
  const [view, setView] = useState<'loans' | 'applicants'>('loans');
  const [loans, setLoans] = useState<LoanApplicationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoanId, setActionLoanId] = useState<number | null>(null);
  const [disburseLoanId, setDisburseLoanId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [applicants, setApplicants] = useState<LoanApplicantProfileDto[]>([]);
  const [applicantLoading, setApplicantLoading] = useState(true);
  const [applicantStatus, setApplicantStatus] = useState('');
  const [activeApplicantId, setActiveApplicantId] = useState<number | null>(null);
  const [applicantError, setApplicantError] = useState<string | null>(null);
  const [applicantSaving, setApplicantSaving] = useState(false);
  const [applicantFullName, setApplicantFullName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantEmergency, setApplicantEmergency] = useState('');
  const [applicantNote, setApplicantNote] = useState('');

  function load() {
    setLoading(true);
    adminListLoans(statusFilter || undefined)
      .then(setLoans)
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }

  function loadApplicants() {
    setApplicantLoading(true);
    adminListApplicants(applicantStatus || undefined)
      .then(setApplicants)
      .catch(e => setApplicantError(String(e?.message ?? e)))
      .finally(() => setApplicantLoading(false));
  }

  useEffect(() => { if (view === 'loans') load(); }, [statusFilter, view]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (view === 'applicants') loadApplicants(); }, [applicantStatus, view]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleApprove(id: number) {
    setSaving(true);
    setError(null);
    try {
      await adminApproveLoan(id, { adminNote: note || undefined });
      setActionLoanId(null);
      setNote('');
      load();
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function handleReject(id: number) {
    setSaving(true);
    setError(null);
    try {
      await adminRejectLoan(id, { adminNote: note || undefined });
      setActionLoanId(null);
      setNote('');
      load();
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDisburse(id: number) {
    setSaving(true);
    setError(null);
    try {
      await adminDisburseLoan(id);
      setDisburseLoanId(null);
      load();
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function handleStartReview(id: number) {
    setSaving(true);
    setError(null);
    try {
      await adminStartReviewLoan(id);
      load();
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? e));
    } finally {
      setSaving(false);
    }
  }

  async function handleVerifyApplicant(id: number) {
    setApplicantSaving(true);
    setApplicantError(null);
    try {
      await adminVerifyApplicant(id, {
        fullName: applicantFullName,
        phoneNumber: applicantPhone,
        emailAddress: applicantEmail,
        emergencyContactNumber: applicantEmergency,
        adminNote: applicantNote || undefined,
      });
      setActiveApplicantId(null);
      setApplicantNote('');
      loadApplicants();
    } catch (e) {
      setApplicantError(String((e as { message?: string })?.message ?? e));
    } finally {
      setApplicantSaving(false);
    }
  }

  async function handleRejectApplicant(id: number) {
    setApplicantSaving(true);
    setApplicantError(null);
    try {
      await adminRejectApplicant(id, { adminNote: applicantNote || undefined });
      setActiveApplicantId(null);
      setApplicantNote('');
      loadApplicants();
    } catch (e) {
      setApplicantError(String((e as { message?: string })?.message ?? e));
    } finally {
      setApplicantSaving(false);
    }
  }

  const activeLoan = actionLoanId != null ? loans.find(l => l.id === actionLoanId) : null;
  const disburseLoan = disburseLoanId != null ? loans.find(l => l.id === disburseLoanId) : null;
  const activeApplicant = useMemo(
    () => (activeApplicantId != null ? applicants.find(a => a.id === activeApplicantId) : null),
    [activeApplicantId, applicants]
  );

  useEffect(() => {
    if (activeApplicant) {
      setApplicantFullName(activeApplicant.fullName ?? activeApplicant.submittedName ?? '');
      setApplicantPhone(activeApplicant.phoneNumber ?? '');
      setApplicantEmail(activeApplicant.emailAddress ?? '');
      setApplicantEmergency(activeApplicant.emergencyContactNumber ?? '');
      setApplicantNote('');
    }
  }, [activeApplicant]);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loan Operations</h1>
        <p className="text-muted-foreground text-sm">Review applicants and approve loan requests.</p>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'loans' | 'applicants')}>
        <TabsList>
          <TabsTrigger value="applicants">Applicants</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
        </TabsList>

        {/* ── Applicants Tab ─────────────────────────────────────────────── */}
        <TabsContent value="applicants" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold">Applicant verification</h2>
            <select
              value={applicantStatus}
              onChange={e => setApplicantStatus(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {applicantError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{applicantError}</AlertDescription>
            </Alert>
          )}

          <Card className="rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {applicantLoading ? (
                <div className="divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : applicants.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-muted-foreground">No applicant profiles found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicants.map(applicant => (
                      <TableRow key={applicant.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(applicant.submittedAtUtc).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{applicant.userId}</TableCell>
                        <TableCell className="font-medium">{applicant.submittedName}</TableCell>
                        <TableCell><StatusBadge status={applicant.status} /></TableCell>
                        <TableCell>
                          {applicant.status === 'Pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                onClick={() => setActiveApplicantId(applicant.id)}
                              >
                                Verify
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400"
                                onClick={() => { setActiveApplicantId(applicant.id); setApplicantNote(''); }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Loans Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="loans" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-bold">Loan applications</h2>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="UnderReview">Under Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Disbursed">Disbursed</option>
            </select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="rounded-xl overflow-hidden">
            <CardContent className="p-0">
              {loading ? (
                <div className="divide-y">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <Skeleton key={j} className="h-4 w-20" />
                      ))}
                    </div>
                  ))}
                </div>
              ) : loans.length === 0 ? (
                <div className="flex h-40 items-center justify-center">
                  <p className="text-sm text-muted-foreground">No loan applications found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Total Repay</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map(loan => (
                      <TableRow key={loan.id}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(loan.submittedAtUtc).toLocaleDateString('en-GB')}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{loan.userId}</TableCell>
                        <TableCell className="font-semibold">{fmt(loan.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">{fmt(loan.totalRepayable)}</TableCell>
                        <TableCell className="text-muted-foreground">{loan.durationDays} days</TableCell>
                        <TableCell className="text-muted-foreground">{loan.repaymentInstallments}x</TableCell>
                        <TableCell><StatusBadge status={loan.status} /></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {loan.status === 'Pending' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => void handleStartReview(loan.id)}
                              >
                                Start Review
                              </Button>
                            )}
                            {loan.status === 'UnderReview' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => { setActionLoanId(loan.id); setNote(''); }}
                              >
                                Review
                              </Button>
                            )}
                            {loan.status === 'Approved' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                className="border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400"
                                onClick={() => setDisburseLoanId(loan.id)}
                              >
                                Disburse
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Review Dialog ───────────────────────────────────────────────── */}
      <Dialog open={activeLoan !== null} onOpenChange={open => !open && setActionLoanId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Application #{activeLoan?.id}</DialogTitle>
            <DialogDescription>
              {activeLoan && `${fmt(activeLoan.amount)} — ${activeLoan.purposeCategory} — ${activeLoan.durationDays} days`}
            </DialogDescription>
          </DialogHeader>
          {activeLoan && (
            <div className="space-y-4">
              {activeLoan.purposeDescription && (
                <p className="text-sm text-muted-foreground">{activeLoan.purposeDescription}</p>
              )}
              <div className="divide-y rounded-xl border">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Account number</span>
                  <span className="text-xs font-semibold">{activeLoan.accountNumber}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Bank name</span>
                  <span className="text-xs font-semibold">{activeLoan.bankName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Account name</span>
                  <span className="text-xs font-semibold">{activeLoan.accountName}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Daily rate</span>
                  <span className="text-xs font-semibold">{(activeLoan.dailyInterestRate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-muted-foreground">Total repay</span>
                  <span className="text-xs font-semibold">{fmt(activeLoan.totalRepayable)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Admin note (optional)</label>
                <Textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  placeholder="Reason for approval or rejection…"
                  className="resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionLoanId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={saving}
              onClick={() => activeLoan && void handleReject(activeLoan.id)}
            >
              Reject
            </Button>
            <Button
              disabled={saving}
              onClick={() => activeLoan && void handleApprove(activeLoan.id)}
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Disburse Dialog ─────────────────────────────────────────────── */}
      <Dialog open={disburseLoan !== null} onOpenChange={open => !open && setDisburseLoanId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Disburse Loan #{disburseLoan?.id}</DialogTitle>
            <DialogDescription>
              {disburseLoan && `${fmt(disburseLoan.amount)} — ${disburseLoan.purposeCategory}`}
            </DialogDescription>
          </DialogHeader>
          {disburseLoan && (
            <div className="divide-y rounded-xl border">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Bank name</span>
                <span className="text-xs font-semibold">{disburseLoan.bankName}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Account name</span>
                <span className="text-xs font-semibold">{disburseLoan.accountName}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Account number</span>
                <span className="text-xs font-semibold">{disburseLoan.accountNumber}</span>
              </div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground">Total repayable</span>
                <span className="text-xs font-semibold text-primary">{fmt(disburseLoan.totalRepayable)}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseLoanId(null)}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={() => disburseLoan && void handleDisburse(disburseLoan.id)}
            >
              Confirm disbursement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Verify Applicant Dialog ─────────────────────────────────────── */}
      <Dialog open={activeApplicant !== null} onOpenChange={open => !open && setActiveApplicantId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify Applicant #{activeApplicant?.id}</DialogTitle>
            <DialogDescription>User ID: {activeApplicant?.userId}</DialogDescription>
          </DialogHeader>
          {activeApplicant && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Full name</label>
                <Input
                  value={applicantFullName}
                  onChange={e => setApplicantFullName(e.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Phone number</label>
                  <Input
                    value={applicantPhone}
                    onChange={e => setApplicantPhone(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Email address</label>
                  <Input
                    value={applicantEmail}
                    onChange={e => setApplicantEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Emergency contact number</label>
                <Input
                  value={applicantEmergency}
                  onChange={e => setApplicantEmergency(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Admin note (optional)</label>
                <Textarea
                  value={applicantNote}
                  onChange={e => setApplicantNote(e.target.value)}
                  rows={3}
                  placeholder="Verification notes"
                  className="resize-none"
                />
              </div>
              {applicantError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{applicantError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveApplicantId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={applicantSaving}
              onClick={() => activeApplicant && void handleRejectApplicant(activeApplicant.id)}
            >
              Reject
            </Button>
            <Button
              disabled={applicantSaving || !applicantFullName || !applicantPhone || !applicantEmail || !applicantEmergency}
              onClick={() => activeApplicant && void handleVerifyApplicant(activeApplicant.id)}
            >
              Verify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
