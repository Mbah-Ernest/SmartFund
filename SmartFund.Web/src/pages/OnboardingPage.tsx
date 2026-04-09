import { CheckCircle2, Plus, Trash2, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SmartFundLogo } from '@/components/smart-fund-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { PRESET_CATEGORIES, SUPPORTED_CURRENCIES } from '../modules/personalFinance/data/onboardingPresets';
import { useOnboardingState } from '../modules/personalFinance/hooks/useOnboardingState';

const STEP_LABELS = ['Welcome', 'Start Date', 'Wallets', 'Categories', 'Done'];
const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const navigate = useNavigate();
  const state = useOnboardingState();

  const progress = (state.step / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

      <div className="w-full max-w-lg relative">
        <div className="flex justify-center mb-8">
          <SmartFundLogo />
        </div>

        {state.step > 0 && state.step < 4 && (
          <div className="mb-6">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Step {state.step + 1} of {TOTAL_STEPS}</span>
              <span>{STEP_LABELS[state.step]}</span>
            </div>
            <Progress value={progress} />
          </div>
        )}

        {state.step === 0 && <StepWelcome onStart={() => state.skipStep()} />}
        {state.step === 1 && (
          <StepStartDate
            startDate={state.startDate}
            onDateChange={state.setStartDate}
            saving={state.saving}
            error={state.error}
            onNext={state.submitStep1}
          />
        )}
        {state.step === 2 && (
          <StepAddWallet
            wallets={state.wallets}
            newWalletName={state.newWalletName}
            setNewWalletName={state.setNewWalletName}
            newWalletCurrency={state.newWalletCurrency}
            setNewWalletCurrency={state.setNewWalletCurrency}
            onAdd={state.addWallet}
            onRemove={state.removeWallet}
            saving={state.saving}
            error={state.error}
            onNext={state.submitStep2}
            onSkip={state.skipStep}
            onBack={state.goBack}
          />
        )}
        {state.step === 3 && (
          <StepCategories
            selectedCategories={state.selectedCategories}
            onToggle={state.toggleCategory}
            onSelectAll={() => state.selectAllCategories(PRESET_CATEGORIES)}
            onClearAll={state.clearAllCategories}
            saving={state.saving}
            error={state.error}
            onNext={state.submitStep3}
            onSkip={state.skipStep}
            onBack={state.goBack}
          />
        )}
        {state.step === 4 && (
          <StepDone onGoToDashboard={() => navigate('/finance/dashboard')} />
        )}
      </div>
    </div>
  );
}

/* ─────────────── Step 0: Welcome ─────────────── */

function StepWelcome({ onStart }: { onStart: () => void }) {
  return (
    <Card className="glass">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">Welcome to SmartFund</CardTitle>
        <CardDescription className="text-base mt-2">
          Let's take 2 minutes to set up your personal finance tracker so your
          dashboard is ready to use from day one.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center text-sm text-muted-foreground">
          <div className="rounded-lg border p-3">
            <div className="text-xl mb-1">📅</div>
            Set a start date
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xl mb-1">👛</div>
            Add wallets
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xl mb-1">🏷️</div>
            Pick categories
          </div>
        </div>
        <Button className="w-full" size="lg" onClick={onStart}>
          Get Started
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Step 1: Start Date ─────────────── */

function StepStartDate({
  startDate,
  onDateChange,
  saving,
  error,
  onNext,
}: {
  startDate: string;
  onDateChange: (v: string) => void;
  saving: boolean;
  error: string | null;
  onNext: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>When do you want to start tracking?</CardTitle>
        <CardDescription>
          This is your finance launch date — transactions before this date won't
          be imported from your bank. You can change it later in Settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="launch-date">Start Date</Label>
          <Input
            id="launch-date"
            type="date"
            value={startDate}
            max={today}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button className="w-full" onClick={onNext} disabled={saving || !startDate}>
          {saving ? <Spinner className="mr-2" /> : null}
          Next
        </Button>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Step 2: Add Wallet ─────────────── */

function StepAddWallet({
  wallets,
  newWalletName,
  setNewWalletName,
  newWalletCurrency,
  setNewWalletCurrency,
  onAdd,
  onRemove,
  saving,
  error,
  onNext,
  onSkip,
  onBack,
}: {
  wallets: { name: string; currency: string }[];
  newWalletName: string;
  setNewWalletName: (v: string) => void;
  newWalletCurrency: string;
  setNewWalletCurrency: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  saving: boolean;
  error: string | null;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onAdd();
  }

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Add your wallets</CardTitle>
        <CardDescription>
          Create wallets for your bank accounts, cash, savings, etc. You can
          add more later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. GTBank Salary"
            value={newWalletName}
            onChange={(e) => setNewWalletName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <select
            value={newWalletCurrency}
            onChange={(e) => setNewWalletCurrency(e.target.value)}
            className="border rounded-md px-2 text-sm bg-background"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={onAdd}
            disabled={!newWalletName.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {wallets.length > 0 && (
          <div className="space-y-2">
            {wallets.map((w, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                  <span>{w.name}</span>
                  <span className="text-muted-foreground">{w.currency}</span>
                </div>
                <button
                  onClick={() => onRemove(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onBack} disabled={saving}>
            Back
          </Button>
          <Button variant="ghost" onClick={onSkip} disabled={saving} className="ml-auto">
            Skip
          </Button>
          <Button onClick={onNext} disabled={saving}>
            {saving ? <Spinner className="mr-2" /> : null}
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Step 3: Categories ─────────────── */

function StepCategories({
  selectedCategories,
  onToggle,
  onSelectAll,
  onClearAll,
  saving,
  error,
  onNext,
  onSkip,
  onBack,
}: {
  selectedCategories: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  saving: boolean;
  error: string | null;
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  const income = PRESET_CATEGORIES.filter((p) => p.type === 2);
  const expense = PRESET_CATEGORIES.filter((p) => p.type === 1);

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Set up your categories</CardTitle>
        <CardDescription>
          Choose the spending and income categories you want. You can add custom
          ones later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 text-xs">
          <button
            onClick={onSelectAll}
            className="text-primary hover:underline"
          >
            Select all
          </button>
          <button
            onClick={onClearAll}
            className="text-muted-foreground hover:underline"
          >
            Clear
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Income</p>
          <div className="flex flex-wrap gap-2">
            {income.map((p) => {
              const key = `${p.name}:${p.type}`;
              const selected = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  onClick={() => onToggle(key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expenses</p>
          <div className="flex flex-wrap gap-2">
            {expense.map((p) => {
              const key = `${p.name}:${p.type}`;
              const selected = selectedCategories.has(key);
              return (
                <button
                  key={key}
                  onClick={() => onToggle(key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    selected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-accent border-border'
                  )}
                >
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onBack} disabled={saving}>
            Back
          </Button>
          <Button variant="ghost" onClick={onSkip} disabled={saving} className="ml-auto">
            Skip
          </Button>
          <Button onClick={onNext} disabled={saving}>
            {saving ? <Spinner className="mr-2" /> : null}
            {selectedCategories.size > 0 ? `Add ${selectedCategories.size} categories` : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─────────────── Step 4: Done ─────────────── */

function StepDone({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <Card className="glass">
      <CardContent className="flex flex-col items-center text-center py-10 gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold mb-1">You're all set!</h2>
          <p className="text-muted-foreground">
            Your SmartFund account is ready. Start logging transactions, setting
            budgets, and tracking your goals.
          </p>
        </div>
        <Button size="lg" className="mt-2 w-full" onClick={onGoToDashboard}>
          Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
