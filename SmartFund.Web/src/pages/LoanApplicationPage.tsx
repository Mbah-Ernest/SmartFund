import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyApplicantProfile, submitApplicantProfile, submitLoan } from '../api/loansApi';
import { getConnectedAccounts } from '../modules/personalFinance/services/personalFinanceApi';
import { toApiClientError } from '../api/apiError';
import type { LoanApplicantProfileDto } from '../types/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Clock } from 'lucide-react';

const PURPOSE_OPTIONS = [
  { value: 'Business', label: 'Business' },
  { value: 'Personal', label: 'Personal' },
  { value: 'Education', label: 'Education' },
  { value: 'Medical', label: 'Medical' },
  { value: 'Other', label: 'Other' },
];

const DURATION_OPTIONS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
  { value: 90, label: '3 months' },
];

const SELECT_CLS = 'block w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:border-ring focus:ring-1 focus:ring-ring outline-none transition-colors';

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
}

export default function LoanApplicationPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<LoanApplicantProfileDto | null>();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [submittedName, setSubmittedName] = useState('');
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Business');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');

  useEffect(() => {
    getMyApplicantProfile()
      .then(setProfile)
      .catch(e => setError(toApiClientError(e).message))
      .finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    getConnectedAccounts()
      .then(accounts => setHasLinkedAccount(accounts.length > 0))
      .catch(() => setHasLinkedAccount(false))
      .finally(() => setLoadingAccounts(false));
  }, []);

  const amountNum = parseFloat(amount);
  const rate = useMemo(() => (amountNum > 100000 ? 0.0088 : 0.009), [amountNum]);
  const interest = useMemo(() => {
    if (!amountNum || amountNum <= 0) return 0;
    return Math.round(amountNum * rate * durationDays * 100) / 100;
  }, [amountNum, durationDays, rate]);
  const total = useMemo(() => (amountNum && amountNum > 0 ? amountNum + interest : 0), [amountNum, interest]);
  const installmentAmount = useMemo(() => (total ? Math.round(total * 100) / 100 : 0), [total]);
  const repaymentDate = useMemo(() => {
    const base = new Date();
    const due = new Date(base);
    due.setDate(base.getDate() + durationDays);
    return due.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }, [durationDays]);

  async function submitApplicant() {
    setError(null);
    if (!submittedName.trim()) {
      setError('Enter your full name to continue.');
      return;
    }
    setSaving(true);
    try {
      const nextProfile = await submitApplicantProfile({ fullName: submittedName.trim() });
      setProfile(nextProfile);
      setSubmittedName('');
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    setError(null);
    if (!amountNum || amountNum <= 0) { setError('Enter a valid loan amount.'); return; }
    if (!durationDays || durationDays <= 0) { setError('Select a valid duration.'); return; }
    if (!bankName.trim()) { setError('Enter your bank name.'); return; }
    if (!accountName.trim()) { setError('Enter the account name.'); return; }
    if (!accountNumber.trim()) { setError('Enter the account number for your linked card.'); return; }
    if (accountNumber.trim() !== confirmAccountNumber.trim()) { setError('Account numbers do not match.'); return; }

    setSaving(true);
    try {
      await submitLoan({
        amount: amountNum,
        durationDays,
        repaymentInstallments: 1,
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        purposeCategory: purpose,
        purposeDescription: description || undefined,
      });
      navigate('/loans/my');
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Loans</h1>
        <p className="text-muted-foreground text-sm">Manage your loan access and applications.</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-xl">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Loan rules</p>
            <ul className="space-y-1">
              <li>• First-time limit: ₦5,000</li>
              <li>• Link a bank account to request more than ₦5,000</li>
              <li>• Daily rate: 0.9% up to ₦100k, 0.88% above ₦100k</li>
            </ul>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="pt-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Security &amp; privacy</p>
            <ul className="space-y-1">
              <li>• We only read your bank data (no transfers).</li>
              <li>• We never store your bank login details.</li>
              <li>• Your payout account is confirmed before disbursement.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {loadingProfile && <Skeleton className="h-8 w-40" />}

      {!loadingProfile && (!profile || profile.status === 'Rejected') && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Start your loan profile</CardTitle>
              <CardDescription>
                First-time borrowers submit their full name and user ID. We'll verify your details before you can request a loan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Full name</span>
                <Input
                  value={submittedName}
                  onChange={e => setSubmittedName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </label>
              <Button type="button" onClick={() => void submitApplicant()} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit for verification'}
              </Button>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardContent className="pt-5 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">What happens next</p>
              <ol className="space-y-1.5 list-decimal pl-4">
                <li>Admin validates your contact details.</li>
                <li>You'll be notified when your profile is ready.</li>
                <li>You can then request your first loan.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      )}

      {!loadingProfile && profile?.status === 'Pending' && (
        <Alert className="rounded-xl border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            Your loan profile is pending verification. We'll notify you once it's approved.
          </AlertDescription>
        </Alert>
      )}

      {!loadingProfile && profile?.status === 'Verified' && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-base">Request a loan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Loan amount (₦)</span>
                  <Input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="5000"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Duration</span>
                  <select
                    value={durationDays}
                    onChange={e => setDurationDays(Number(e.target.value))}
                    className={`mt-1 ${SELECT_CLS}`}
                  >
                    {DURATION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Bank name</span>
                  <Input
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    placeholder="e.g. GTBank"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Account name</span>
                  <Input
                    value={accountName}
                    onChange={e => setAccountName(e.target.value)}
                    placeholder="Account holder name"
                    className="mt-1"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Account number</span>
                  <Input
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    placeholder="Linked card account number"
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground">Re-type account number</span>
                  <Input
                    value={confirmAccountNumber}
                    onChange={e => setConfirmAccountNumber(e.target.value)}
                    placeholder="Confirm account number"
                    className="mt-1"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Purpose</span>
                <select
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  className={`mt-1 ${SELECT_CLS}`}
                >
                  {PURPOSE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">
                  Description <span className="text-muted-foreground/60">(optional)</span>
                </span>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className={`mt-1 resize-none ${SELECT_CLS}`}
                  placeholder="Briefly describe what the loan is for…"
                />
              </label>

              <p className="text-xs text-muted-foreground rounded-lg border bg-muted/40 px-3 py-2">
                This is the account where your loan will be paid into. Ensure it matches your linked card.
              </p>

              {!loadingAccounts && amountNum > 5000 && !hasLinkedAccount && (
                <Alert className="rounded-xl border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
                    Loans above ₦5,000 require at least one linked bank account. Go to <strong>Bank Connection</strong> to link your account before submitting.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" onClick={() => navigate('/loans/my')}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => void submit()}
                  disabled={saving || !amount || !accountNumber || !confirmAccountNumber || !bankName || !accountName}
                >
                  {saving ? 'Submitting…' : 'Submit Application'}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground rounded-lg border bg-muted/40 px-3 py-2">
                Need help? Contact support after submission for faster review.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle className="text-sm">Loan preview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-muted-foreground">Daily rate</span>
                  <span className="text-sm font-semibold">{(rate * 100).toFixed(2)}%</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-muted-foreground">Interest</span>
                  <span className="text-sm font-semibold">{formatCurrency(interest)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-muted-foreground">Total repayable</span>
                  <span className="text-base font-bold text-primary">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-muted-foreground">Installment</span>
                  <span className="text-sm font-semibold">{formatCurrency(installmentAmount)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-muted-foreground">Repayment date</span>
                  <span className="text-sm font-bold">{repaymentDate}</span>
                </div>
              </div>
              <div className="px-5 pb-5 pt-3">
                <p className={`text-xs rounded-lg border px-3 py-2 ${amountNum > 5000 && !hasLinkedAccount ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200' : 'border-border bg-muted/40 text-muted-foreground'}`}>
                  {amountNum > 5000 && !hasLinkedAccount
                    ? 'This amount requires a linked bank account. Connect one under Bank Connection first.'
                    : 'First-time borrowers can request up to ₦5,000. Link a bank account to request higher amounts.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
