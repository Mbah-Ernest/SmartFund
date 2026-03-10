import { useCallback, useEffect, useMemo, useState } from 'react';
import BalanceCard from '../components/BalanceCard';
import CategoryPieChart from '../components/CategoryPieChart';
import NetWorthChart from '../components/NetWorthChart';
import CashFlowChart from '../components/CashFlowChart';
import InvestmentContributionChart from '../components/InvestmentContributionChart';
import RecentTransactions from '../components/RecentTransactions';
import FinancialInsights from '../components/FinancialInsights';
import AIInsightsPanel from '../components/AIInsightsPanel';
import InvestFromPersonalFundsModal from '../components/InvestFromPersonalFundsModal';
import {
  getDashboard,
  getCashFlow,
  getWalletBalances,
  getMonthlyIncome,
  getMonthlyExpenses,
  getBudgets,
  getBudgetTracking
} from '../services/personalFinanceApi';
import type {
  PersonalFinanceDashboardDto,
  CashFlowRow,
  MonthlyIncomeExpense,
  NetWorthPoint,
  InvestmentContributionPoint,
  MonthlyCategoryAmountRow
} from '../types/financeTypes';

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

function buildInvestmentContributions(
  cashflow: CashFlowRow[]
): InvestmentContributionPoint[] {
  /* Outflows are expenses / contributions. Group by month. */
  const map = new Map<string, number>();
  for (const row of cashflow) {
    if (row.outflow > 0) {
      const key = monthKey(row.year, row.month);
      map.set(key, (map.get(key) ?? 0) + row.outflow);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ month: monthLabel(key), amount }));
}

export default function PersonalDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investModalOpen, setInvestModalOpen] = useState(false);

  const [dashboard, setDashboard] = useState<PersonalFinanceDashboardDto | null>(null);
  const [cashflow, setCashflow] = useState<CashFlowRow[]>([]);
  const [incomeRows, setIncomeRows] = useState<MonthlyCategoryAmountRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<MonthlyCategoryAmountRow[]>([]);
  const [walletBalances, setWalletBalances] = useState<
    { year: number; month: number; balance: number }[]
  >([]);
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
      const [dash, cf, inc, exp, wb, budgets] = await Promise.all([
        getDashboard(),
        getCashFlow(),
        getMonthlyIncome(),
        getMonthlyExpenses(),
        getWalletBalances(),
        getBudgets()
      ] as const);
      setDashboard(dash);
      setCashflow(cf);
      setIncomeRows(inc);
      setExpenseRows(exp);
      setWalletBalances(wb);

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

  const investData = useMemo(
    () => buildInvestmentContributions(cashflow),
    [cashflow]
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

  const runwayMonths =
    dashboard && dashboard.monthlyExpenses > 0
      ? dashboard.totalBalance / dashboard.monthlyExpenses
      : null;

  return (
    <div className="space-y-8">
      {/* ── Page heading ── */}
      <div className="animate-fade-in-up flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
            Personal Finance
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track your money, spending habits, and net worth at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInvestModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:scale-[0.97]"
          >
            💰 Invest
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="animate-fade-in-up flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-500">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-rose-800">Something went wrong</p>
            <p className="mt-0.5 text-sm text-rose-700">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-2 text-xs font-bold text-rose-600 underline underline-offset-2 transition-colors hover:text-rose-800"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {/* ════════════════════  TOP ROW: KPI Cards  ════════════════════ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          title="Total Balance"
          value={dashboard ? formatCurrency(dashboard.totalBalance) : '—'}
          icon={<WalletIcon />}
          loading={loading}
        />
        <BalanceCard
          title="Monthly Income"
          value={dashboard ? formatCurrency(dashboard.monthlyIncome) : '—'}
          icon={<ArrowUpIcon />}
          trend={
            dashboard && dashboard.monthlyIncome > 0
              ? { value: 'income', positive: true }
              : undefined
          }
          loading={loading}
        />
        <BalanceCard
          title="Monthly Expenses"
          value={dashboard ? formatCurrency(dashboard.monthlyExpenses) : '—'}
          icon={<ArrowDownIcon />}
          trend={
            dashboard && savings < 0
              ? { value: 'over budget', positive: false }
              : undefined
          }
          loading={loading}
        />
        <BalanceCard
          title="Investments"
          value={
            dashboard
              ? formatCurrency(dashboard.investmentContributions)
              : '—'
          }
          subtitle={
            savings >= 0
              ? `${formatCurrency(savings)} saved this month`
              : `${formatCurrency(Math.abs(savings))} over budget`
          }
          icon={<ChartIcon />}
          loading={loading}
        />
      </div>

      {/* ════════════════════  HEALTH SNAPSHOT  ════════════════════ */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Savings rate"
          value={savingsRate === null ? '—' : formatPercent(Math.max(savingsRate, 0))}
          caption="How much of your income you kept this month"
          tone={savingsRate !== null && savingsRate >= 0.2 ? 'positive' : savingsRate !== null && savingsRate > 0 ? 'neutral' : 'negative'}
          loading={loading}
        />
        <MetricCard
          title="Runway"
          value={runwayMonths === null ? '—' : `${runwayMonths.toFixed(1)} months`}
          caption="How long your balance could cover current expenses"
          tone={runwayMonths !== null && runwayMonths >= 6 ? 'positive' : runwayMonths !== null && runwayMonths >= 3 ? 'neutral' : 'negative'}
          loading={loading}
        />
        <MetricCard
          title="Spending vs income"
          value={expenseRatio === null ? '—' : formatPercent(expenseRatio)}
          caption="Lower is better (aim for < 80%)"
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
              ? `Remaining this month: ${formatCurrency(budgetHealth.remainingAmount)}`
              : 'Create budgets to keep spending under control'
          }
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

      {/* ════════════════════  MAIN + AI SIDEBAR  ════════════════════ */}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        {/* ── Left: main content ── */}
        <div className="space-y-8 min-w-0">
          {/* ── Smart Insights ── */}
          <ChartCard title="Insights" icon={<InsightIcon />} description="Personalised tips based on your financial activity">
            <FinancialInsights
              dashboard={dashboard}
              incomeExpense={incomeExpenseData}
              loading={loading}
            />
          </ChartCard>

          {/* ── Net Worth + Cash Flow ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Net Worth Growth" icon={<TrendUpSmallIcon />}>
              <NetWorthChart data={netWorthData} loading={loading} />
            </ChartCard>

            <ChartCard title="Monthly Cash Flow" icon={<BarChartSmallIcon />}>
              <CashFlowChart data={incomeExpenseData} loading={loading} />
            </ChartCard>
          </div>

          {/* ── Investment Contributions ── */}
          <ChartCard title="Investment Contributions" icon={<LayersSmallIcon />} description="How your money flows into investments each month">
            <InvestmentContributionChart data={investData} loading={loading} />
          </ChartCard>

          {/* ── Pie + Recent Transactions ── */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Spending by Category" icon={<PieSmallIcon />}>
              <div className="space-y-4">
                <CategoryPieChart
                  data={dashboard?.topExpenseCategories ?? []}
                  loading={loading}
                />
                <TopCategoryBreakdown
                  rows={dashboard?.topExpenseCategories ?? []}
                  total={dashboard?.monthlyExpenses ?? 0}
                  loading={loading}
                />
              </div>
            </ChartCard>

            <ChartCard title="Recent Transactions" icon={<ListSmallIcon />}>
              <RecentTransactions data={cashflow} loading={loading} />
            </ChartCard>
          </div>
        </div>

        {/* ── Right: AI Insights Panel ── */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <AIInsightsPanel
            dashboard={dashboard}
            incomeExpense={incomeExpenseData}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Invest Modal ── */}
      <InvestFromPersonalFundsModal
        open={investModalOpen}
        onClose={() => setInvestModalOpen(false)}
        onSuccess={load}
      />
    </div>
  );
}

function TopCategoryBreakdown(props: {
  rows: { categoryId: number; categoryName: string; amount: number }[];
  total: number;
  loading?: boolean;
}) {
  if (props.loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-8 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  const total = props.total > 0 ? props.total : props.rows.reduce((s, r) => s + r.amount, 0);

  if (props.rows.length === 0 || total <= 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Top categories (this month)
        </p>
        <p className="text-xs text-slate-400">Total: {formatCurrency(total)}</p>
      </div>

      <ul className="space-y-2">
        {props.rows.slice(0, 5).map((r) => {
          const pct = total > 0 ? (r.amount / total) * 100 : 0;
          return (
            <li key={r.categoryId} className="rounded-xl bg-slate-50/70 px-3 py-2.5 ring-1 ring-slate-200/60 dark:bg-slate-950/40 dark:ring-slate-800">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {r.categoryName}
                </p>
                <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {formatCurrency(r.amount)}
                </p>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <p className="w-12 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
                  {pct.toFixed(0)}%
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MetricCard(props: {
  title: string;
  value: string;
  caption: string;
  tone: 'positive' | 'neutral' | 'negative';
  loading?: boolean;
}) {
  const toneStyles =
    props.tone === 'positive'
      ? 'bg-emerald-50/60 text-emerald-700 ring-emerald-100'
      : props.tone === 'negative'
        ? 'bg-rose-50/60 text-rose-700 ring-rose-100'
        : 'bg-blue-50/60 text-blue-700 ring-blue-100';

  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
            {props.title}
          </p>
          <p className="mt-2 text-[26px] font-extrabold leading-none tracking-tight text-slate-900 tabular-nums">
            {props.loading ? (
              <span className="relative inline-block h-8 w-28 overflow-hidden rounded-lg bg-slate-100">
                <span className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
              </span>
            ) : (
              props.value
            )}
          </p>
          <p className="mt-2 text-[13px] font-medium text-slate-500">
            {props.caption}
          </p>
        </div>
        <div className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${toneStyles}`}>
          {props.tone}
        </div>
      </div>
    </div>
  );
}

/* ── Reusable card wrapper ── */

function ChartCard(props: {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group rounded-2xl bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.08)] dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-5 flex items-center gap-2.5">
        {props.icon ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-500 transition-transform duration-300 group-hover:scale-105">
            {props.icon}
          </div>
        ) : null}
        <div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{props.title}</h2>
          {props.description ? (
            <p className="text-xs text-slate-400">{props.description}</p>
          ) : null}
        </div>
      </div>
      {props.children}
    </div>
  );
}

/* ── Section mini-icons ── */

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

function BarChartSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function LayersSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3" />
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

function ListSmallIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

/* ── Inline SVG icons ── */

function WalletIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}
