import { useCallback, useEffect, useMemo, useState } from 'react';
import BalanceCard from '../components/BalanceCard';
import CategoryPieChart from '../components/CategoryPieChart';
import NetWorthChart from '../components/NetWorthChart';
import FinancialInsights from '../components/FinancialInsights';
import AIInsightsPanel from '../components/AIInsightsPanel';
import InfoTooltip from '../components/InfoTooltip';
import MonthOverMonthCard from '../components/MonthOverMonthCard';
import KpiCarousel from '../components/KpiCarousel';
import DailyBalanceChart from '../components/DailyBalanceChart';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Link } from 'react-router-dom';
import {
  getDashboard,
  getCashRunway,
  getTransactions,
  getWalletBalances,
  getMonthlyIncome,
  getMonthlyExpenses,
  getBudgets,
  getBudgetTracking,
  getConnectedAccounts,
  getDebts,
  getDebtInsights,
  getWallets,
  getCategories,
  type ConnectedBankAccountDto,
  type CashRunwayDto,
} from '../services/personalFinanceApi';
import type {
  PersonalFinanceDashboardDto,
  MonthlyIncomeExpense,
  NetWorthPoint,
  MonthlyCategoryAmountRow,
  PersonalTransactionDto,
  PersonalDebtDto,
  DebtInsightsDto,
} from '../types/financeTypes';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronDown } from 'lucide-react';
import { maskAmount, maskName } from '@/lib/utils';
import { usePrivacy } from '@/contexts/PrivacyContext';

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

function formatPercent(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0
  }).format(n);
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [, m] = key.split('-');
  return MONTH_LABELS[parseInt(m, 10)] ?? key;
}

function buildIncomeExpense(
  incomeRows: MonthlyCategoryAmountRow[],
  expenseRows: MonthlyCategoryAmountRow[]
): MonthlyIncomeExpense[] {
  const map = new Map<string, { income: number; expenses: number }>();

  for (const r of incomeRows) {
    const key = monthKey(r.year, r.month);
    const entry = map.get(key) ?? { income: 0, expenses: 0 };
    entry.income += r.amount;
    map.set(key, entry);
  }
  for (const r of expenseRows) {
    const key = monthKey(r.year, r.month);
    const entry = map.get(key) ?? { income: 0, expenses: 0 };
    entry.expenses += r.amount;
    map.set(key, entry);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({
      month: monthLabel(key),
      income: v.income,
      expenses: v.expenses
    }));
}

function buildNetWorth(
  balances: { year: number; month: number; balance: number }[]
): NetWorthPoint[] {
  const map = new Map<string, number>();
  for (const b of balances) {
    const key = monthKey(b.year, b.month);
    map.set(key, (map.get(key) ?? 0) + b.balance);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, balance]) => ({ month: monthLabel(key), balance }));
}

export default function PersonalDashboard() {
  const { isPrivate } = usePrivacy();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<PersonalFinanceDashboardDto | null>(null);
  const [runway, setRunway] = useState<CashRunwayDto | null>(null);
  const [incomeRows, setIncomeRows] = useState<MonthlyCategoryAmountRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<MonthlyCategoryAmountRow[]>([]);
  const [walletBalances, setWalletBalances] = useState<
    { year: number; month: number; balance: number }[]
  >([]);
  const [recentTransactions, setRecentTransactions] = useState<PersonalTransactionDto[]>([]);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedBankAccountDto[]>([]);
  const [debts, setDebts] = useState<PersonalDebtDto[]>([]);
  const [debtInsights, setDebtInsights] = useState<DebtInsightsDto | null>(null);
  const [bankTypeFilter, setBankTypeFilter] = useState<string>('all');
  const [budgetHealth, setBudgetHealth] = useState<
    | {
        totalBudgets: number;
        overBudgetCount: number;
        remainingAmount: number;
      }
    | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, rwy, inc, exp, wb, budgets, txs, banks, debtList, debtIns] = await Promise.all([
        getDashboard(),
        getCashRunway().catch(() => null),
        getMonthlyIncome(),
        getMonthlyExpenses(),
        getWalletBalances(),
        getBudgets(),
        getTransactions({ orderBy: 'inputTime', direction: 'desc', take: 2000 }),
        getConnectedAccounts().catch(() => [] as ConnectedBankAccountDto[]),
        getDebts().catch(() => [] as PersonalDebtDto[]),
        getDebtInsights().catch(() => null),
      ] as const);
      setDashboard(dash);
      setRunway(rwy);
      setIncomeRows(inc);
      setExpenseRows(exp);
      setWalletBalances(wb);
      setRecentTransactions(txs);
      setConnectedAccounts(banks);
      setDebts(debtList);
      setDebtInsights(debtIns);

      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        const trackingLists = await Promise.all(
          budgets.map(async (b) => [b, await getBudgetTracking(b.id)] as const)
        );

        const summary = trackingLists.reduce(
          (acc, [b, tracking]) => {
            const row = tracking.find(t => t.year === year && t.month === month);
            const remaining = row?.remainingAmount ?? b.amount;
            const isOver = row?.isOverBudget ?? remaining < 0;

            acc.totalBudgets += 1;
            acc.overBudgetCount += isOver ? 1 : 0;
            acc.remainingAmount += remaining;
            return acc;
          },
          { totalBudgets: 0, overBudgetCount: 0, remainingAmount: 0 }
        );

        setBudgetHealth(summary.totalBudgets > 0 ? summary : null);
      } catch {
        setBudgetHealth(null);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const incomeExpenseData = useMemo(
    () => buildIncomeExpense(incomeRows, expenseRows),
    [incomeRows, expenseRows]
  );

  const netWorthData = useMemo(
    () => buildNetWorth(walletBalances),
    [walletBalances]
  );

  const savings =
    dashboard ? dashboard.monthlyIncome - dashboard.monthlyExpenses : 0;

  const savingsRate =
    dashboard && dashboard.monthlyIncome > 0
      ? savings / dashboard.monthlyIncome
      : null;

  const expenseRatio =
    dashboard && dashboard.monthlyIncome > 0
      ? dashboard.monthlyExpenses / dashboard.monthlyIncome
      : null;

  const runwayMonths = runway?.runwayMonths ?? null;

  // Expected inflow: average of last 3 complete months' income
  const expectedInflow = useMemo(() => {
    const now = new Date();
    const thisKey = monthKey(now.getFullYear(), now.getMonth() + 1);

    const byMonth = new Map<string, number>();
    for (const r of incomeRows) {
      const k = monthKey(r.year, r.month);
      byMonth.set(k, (byMonth.get(k) ?? 0) + r.amount);
    }

    const pastMonths = Array.from(byMonth.entries())
      .filter(([k]) => k < thisKey)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .map(([, v]) => v);

    if (pastMonths.length === 0) return null;
    return pastMonths.reduce((s, v) => s + v, 0) / pastMonths.length;
  }, [incomeRows]);

  const bankTypeOptions = useMemo(() => {
    const types = Array.from(new Set(connectedAccounts
      .map(a => (a.accountType || '').trim().toLowerCase())
      .filter(Boolean)));
    return ['all', ...types];
  }, [connectedAccounts]);

  const filteredBankBalance = useMemo(() => {
    const rows = bankTypeFilter === 'all'
      ? connectedAccounts
      : connectedAccounts.filter(a => (a.accountType || '').trim().toLowerCase() === bankTypeFilter);
    return rows.reduce((sum, a) => sum + a.balanceNaira, 0);
  }, [connectedAccounts, bankTypeFilter]);

  const totalBalanceValue = dashboard
    ? dashboard.walletBalance + filteredBankBalance
    : null;

  const activeDebts = debts.filter(d => d.status === 'Active');
  const totalRemainingDebt = activeDebts.reduce((sum, d) => sum + d.remainingBalance, 0);
  const overdueDebts = activeDebts.filter(d => d.daysUntilDue < 0);
  const nextDueDebt = activeDebts
    .filter(d => d.daysUntilDue >= 0)
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue)[0] ?? null;

  const debtHealthTone: 'red' | 'yellow' | 'green' = (() => {
    if (overdueDebts.length > 0 || (debtInsights && debtInsights.burdenPercent > 40)) return 'red';
    if ((debtInsights && debtInsights.burdenPercent > 20) || activeDebts.some(d => d.daysUntilDue >= 0 && d.daysUntilDue <= 7)) return 'yellow';
    return 'green';
  })();

  const burnTrendCaption = (() => {
    if (!runway || runway.avgMonthlyBurnNaira === 0) return 'Not enough data yet';
    const pct = Math.abs(runway.burnTrend * 100).toFixed(0);
    const lastMonth = formatCurrency(runway.lastMonthBurnNaira);
    if (runway.burnTrend > 0.05) return `↑ ${pct}% above avg — burn rising (last month ${lastMonth})`;
    if (runway.burnTrend < -0.05) return `↓ ${pct}% below avg — burn falling (last month ${lastMonth})`;
    return `Stable — avg ${formatCurrency(runway.avgMonthlyBurnNaira)}/mo`;
  })();

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Sticky top zone */}
      <div className="shrink-0 px-4 pt-4 pb-3 bg-background/95 backdrop-blur border-b border-border/40 space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription className="flex items-center gap-2">
              {error}
              <button
                type="button"
                onClick={load}
                className="underline underline-offset-2 font-semibold ml-2"
              >
                Try again
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Feature 3: Overdue debt alert banner */}
        {!loading && overdueDebts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Overdue debts</AlertTitle>
            <AlertDescription className="flex flex-wrap items-center gap-1">
              {overdueDebts.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ', '}
                  <span className="font-semibold">{maskName(d.creditorName, isPrivate)}</span>
                  {' '}({Math.abs(d.daysUntilDue)}d overdue)
                </span>
              ))}
              {' — '}
              <Link to="/finance/debts" className="underline underline-offset-2 font-semibold">
                Go to Debts →
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <div>
          <KpiCarousel>
          <BalanceCard
            title="Total Balance"
            value={
              totalBalanceValue !== null
                ? maskAmount(totalBalanceValue, isPrivate)
                : '—'
            }
            subtitle={dashboard
              ? `Wallets ${maskAmount(dashboard.walletBalance, isPrivate)} · Banks (${bankTypeFilter === 'all' ? 'all' : bankTypeFilter}) ${maskAmount(filteredBankBalance, isPrivate)}`
              : undefined}
            description="Combined balance across your app wallets and connected bank accounts."
            icon={<WalletIcon />}
            loading={loading}
            colorAccent="violet"
          />
          <BalanceCard
            title="Monthly Income"
            value={dashboard ? maskAmount(dashboard.monthlyIncome, isPrivate) : '—'}
            description="All the money you received this month — salary, side income, gifts, refunds, etc."
            icon={<ArrowUpIcon />}
            trend={
              dashboard && dashboard.monthlyIncome > 0
                ? { value: 'income', positive: true }
                : undefined
            }
            loading={loading}
            colorAccent="emerald"
          />
          <BalanceCard
            title="Monthly Expenses"
            value={dashboard ? maskAmount(dashboard.monthlyExpenses, isPrivate) : '—'}
            description="Everything you spent money on this month — bills, food, transport, subscriptions, etc."
            icon={<ArrowDownIcon />}
            trend={
              dashboard && savings < 0
                ? { value: 'over budget', positive: false }
                : undefined
            }
            loading={loading}
            colorAccent="rose"
          />
          <BalanceCard
            title="Monthly Net Cash"
            value={dashboard ? maskAmount(savings, isPrivate) : '—'}
            description="What you kept this month after all expenses. Positive means you saved money."
            icon={<NetCashIcon />}
            trend={
              dashboard
                ? { value: savings >= 0 ? 'saved' : 'deficit', positive: savings >= 0 }
                : undefined
            }
            loading={loading}
            colorAccent={savings >= 0 ? 'emerald' : 'rose'}
          />
          <BalanceCard
            title="Expected Inflow"
            value={expectedInflow !== null ? maskAmount(expectedInflow, isPrivate) : '—'}
            description="Estimated income for next month based on your last 3 months average."
            icon={<ExpectedInflowIcon />}
            loading={loading}
            colorAccent="violet"
          />
        </KpiCarousel>
        </div>

        {bankTypeOptions.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <p className="text-xs text-muted-foreground">Bank balance type:</p>
            {bankTypeOptions.map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant={bankTypeFilter === type ? 'default' : 'outline'}
                onClick={() => setBankTypeFilter(type)}
                className="h-8 shrink-0 px-3 text-xs"
              >
                {type === 'all' ? 'All' : type}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Scrollable zone */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">

      {/* Daily Balance Chart */}
      <DailyBalanceChart
        transactions={recentTransactions}
        walletCurrentBalance={dashboard?.walletBalance ?? 0}
        loading={loading}
      />

      {/* Feature 2: Debt Health summary */}
      {!loading && activeDebts.length > 0 && (
        <div className={`rounded-xl border bg-card px-5 py-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2 animate-in fade-in-0 duration-300 ${
          debtHealthTone === 'red' ? 'border-l-4 border-l-destructive' :
          debtHealthTone === 'yellow' ? 'border-l-4 border-l-yellow-400' :
          'border-l-4 border-l-emerald-500'
        }`}>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
              debtHealthTone === 'red' ? 'bg-destructive' :
              debtHealthTone === 'yellow' ? 'bg-yellow-400' :
              'bg-emerald-500'
            }`} />
            <p className="text-sm font-semibold">Debt Health</p>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{maskAmount(totalRemainingDebt, isPrivate)}</span>
            {' '}owed across{' '}
            <span className="font-medium text-foreground">{activeDebts.length}</span>
            {' '}{activeDebts.length === 1 ? 'debt' : 'debts'}
          </p>
          {nextDueDebt && (
            <p className="text-sm text-muted-foreground">
              Next due:{' '}
              <span className="font-medium text-foreground">{maskName(nextDueDebt.creditorName, isPrivate)}</span>
              {' — '}
              {nextDueDebt.daysUntilDue === 0
                ? 'today'
                : `${nextDueDebt.daysUntilDue} day${nextDueDebt.daysUntilDue !== 1 ? 's' : ''}`}
            </p>
          )}
          {debtInsights && (
            <p className="text-sm text-muted-foreground ml-auto">
              Burden:{' '}
              <span className="font-medium text-foreground">{debtInsights.burdenPercent.toFixed(0)}%</span>
              {' '}of income
            </p>
          )}
        </div>
      )}

      {/* Health Snapshot */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold">Financial Health Check</h2>
          <InfoTooltip text="These four cards give you a quick snapshot of how your finances are doing. Green = great, blue = okay, red = needs attention." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Savings rate"
            value={savingsRate === null ? '—' : formatPercent(Math.max(savingsRate, 0))}
            caption="How much of your income you kept this month"
            tooltip="Savings rate = (Income − Expenses) ÷ Income. Financial experts recommend saving at least 20% of your income every month."
            tone={savingsRate !== null && savingsRate >= 0.2 ? 'positive' : savingsRate !== null && savingsRate > 0 ? 'neutral' : 'negative'}
            loading={loading}
          />
          <MetricCard
            title="Runway"
            value={runwayMonths === null ? '—' : `${runwayMonths.toFixed(1)} months`}
            caption={burnTrendCaption}
            tooltip="Runway = total balance ÷ average monthly expenses (last 3 complete months). If you stopped earning today, this is how long your money would last. 6+ months is a solid emergency fund."
            tone={runwayMonths !== null && runwayMonths >= 6 ? 'positive' : runwayMonths !== null && runwayMonths >= 3 ? 'neutral' : 'negative'}
            loading={loading}
          />
          <MetricCard
            title="Spending vs income"
            value={expenseRatio === null ? '—' : formatPercent(expenseRatio)}
            caption="Lower is better (aim for < 80%)"
            tooltip="This shows what percentage of your income goes to expenses. If it's under 80%, you have breathing room. Over 100% means you're spending more than you earn."
            tone={expenseRatio !== null && expenseRatio < 0.8 ? 'positive' : expenseRatio !== null && expenseRatio <= 1 ? 'neutral' : 'negative'}
            loading={loading}
          />
          <MetricCard
            title="Budgets"
            value={
              budgetHealth
                ? `${budgetHealth.totalBudgets - budgetHealth.overBudgetCount}/${budgetHealth.totalBudgets} on track`
                : '—'
            }
            caption={
              budgetHealth
                ? `Remaining this month: ${maskAmount(budgetHealth.remainingAmount, isPrivate)}`
                : 'Create budgets to keep spending under control'
            }
            tooltip="Budgets let you set spending limits per category (e.g. ₦50,000/month for food). This shows how many of your budgets are still within the limit you set."
            tone={
              budgetHealth
                ? budgetHealth.overBudgetCount === 0
                  ? 'positive'
                  : budgetHealth.overBudgetCount < budgetHealth.totalBudgets
                    ? 'neutral'
                    : 'negative'
                : 'neutral'
            }
            loading={loading}
          />
        </div>
      </div>

      {/* Main + AI Sidebar */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* Left: main content */}
        <div className="space-y-6 min-w-0">
          {/* Net Worth + Month-over-Month */}
          <div className="grid gap-6 2xl:grid-cols-2">
            <ChartCard
              title="Net Worth Growth"
              icon={<TrendUpSmallIcon />}
              description="Your total wallet balance over time. An upward trend means you're building wealth."
            >
              <NetWorthChart data={netWorthData} loading={loading} />
            </ChartCard>

            <ChartCard
              title="This Month vs Last Month"
              icon={<CompareSmallIcon />}
              description="See how your income, expenses, and savings changed vs last month."
            >
              <MonthOverMonthCard data={incomeExpenseData} loading={loading} />
            </ChartCard>
          </div>

          <ChartCard
            title="Spending by Category"
            icon={<PieSmallIcon />}
            description="A breakdown of where your money went this month."
          >
            <CategoryPieChart
              data={dashboard?.topExpenseCategories ?? []}
              loading={loading}
            />
          </ChartCard>

          {/* Insights — collapsible at bottom */}
          <Collapsible>
            <div className="rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in-0 duration-300 border-t-2 border-t-primary/20">
              <div className="flex items-center justify-between gap-2 mb-0">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <InsightIcon />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Insights</p>
                    <p className="text-xs text-muted-foreground">Personalised tips based on your financial activity</p>
                  </div>
                </div>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <span>Tips</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform [[data-state=open]_&]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-4">
                <FinancialInsights
                  dashboard={dashboard}
                  incomeExpense={incomeExpenseData}
                  loading={loading}
                />
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>

        {/* Right: AI Insights Panel */}
        <div className="xl:sticky xl:top-4 xl:self-start max-h-[65vh] overflow-auto pr-1">
          <AIInsightsPanel
            dashboard={dashboard}
            incomeExpense={incomeExpenseData}
            loading={loading}
          />
        </div>
      </div>

      </div>
    </div>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  caption: string;
  tooltip?: string;
  tone: 'positive' | 'neutral' | 'negative';
  loading?: boolean;
}) {
  const borderClass =
    props.tone === 'positive'
      ? 'border-l-4 border-l-emerald-500'
      : props.tone === 'negative'
        ? 'border-l-4 border-l-rose-500'
        : 'border-l-4 border-l-blue-400';

  return (
    <div className={`rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-300 ${borderClass}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {props.title}
          </p>
          {props.tooltip && <InfoTooltip text={props.tooltip} />}
        </div>
        <div className="mt-2 text-2xl sm:text-3xl font-extrabold leading-none tracking-tight tabular-nums">
          {props.loading ? (
            <Skeleton className="h-8 w-28 rounded-lg" />
          ) : (
            props.value
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {props.caption}
        </p>
      </div>
    </div>
  );
}

function ChartCard(props: {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm animate-in fade-in-0 duration-300 border-t-2 border-t-primary/20">
      <div className="mb-4 flex items-center gap-2.5">
        {props.icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {props.icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold">{props.title}</h2>
          {props.description ? (
            <p className="text-xs text-muted-foreground">{props.description}</p>
          ) : null}
        </div>
      </div>
      {props.children}
    </div>
  );
}

function InsightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  );
}

function TrendUpSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22" />
    </svg>
  );
}

function PieSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
    </svg>
  );
}

function CompareSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

function NetCashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-4-4l4 4 4-4M3 10h18" />
    </svg>
  );
}

function ExpectedInflowIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}
