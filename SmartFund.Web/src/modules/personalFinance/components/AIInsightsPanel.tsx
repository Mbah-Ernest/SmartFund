import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getBudgets,
  getBudgetTracking
} from '../services/personalFinanceApi';
import type {
  PersonalFinanceDashboardDto,
  MonthlyIncomeExpense,
  CategoryAmountRow,
  BudgetDto,
  BudgetTrackingDto
} from '../types/financeTypes';

/* ═══════════════════════════════════════════
   Props
   ═══════════════════════════════════════════ */

type AIInsightsPanelProps = {
  dashboard: PersonalFinanceDashboardDto | null;
  incomeExpense: MonthlyIncomeExpense[];
  loading?: boolean;
};

/* ═══════════════════════════════════════════
   Insight types
   ═══════════════════════════════════════════ */

type InsightSeverity = 'success' | 'warning' | 'danger' | 'info';

type Insight = {
  id: string;
  label: string;
  detail: string;
  severity: InsightSeverity;
};

type BudgetWarning = {
  id: string;
  categoryId: number;
  budgetAmount: number;
  spent: number;
  pct: number;
  over: boolean;
};

/* ═══════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════ */

function fmt(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/* ── Financial health score (0-100) ── */
function computeHealthScore(
  dash: PersonalFinanceDashboardDto,
  ie: MonthlyIncomeExpense[]
): number {
  let score = 50; /* neutral baseline */

  /* savings rate component (0-30 pts) */
  if (dash.monthlyIncome > 0) {
    const rate = (dash.monthlyIncome - dash.monthlyExpenses) / dash.monthlyIncome;
    score += clamp(rate, -0.3, 0.3) * 100; /* ±30 pts */
  }

  /* emergency fund component (0-20 pts) */
  if (dash.monthlyExpenses > 0 && dash.totalBalance > 0) {
    const months = dash.totalBalance / dash.monthlyExpenses;
    score += clamp(months / 6, 0, 1) * 20;
  }

  /* investment component (0-10 pts) */
  if (dash.monthlyIncome > 0 && dash.investmentContributions > 0) {
    const ratio = dash.investmentContributions / dash.monthlyIncome;
    score += clamp(ratio / 0.15, 0, 1) * 10;
  }

  /* trend stability (±10 pts) */
  if (ie.length >= 2) {
    const prev = ie[ie.length - 2];
    const curr = ie[ie.length - 1];
    if (prev.expenses > 0) {
      const delta = (curr.expenses - prev.expenses) / prev.expenses;
      score -= clamp(delta, -0.1, 0.1) * 100; /* spending going up → penalty */
    }
  }

  return Math.round(clamp(score, 0, 100));
}

/* ── Spending alerts: per-category % of income ── */
function deriveSpendingAlerts(dash: PersonalFinanceDashboardDto): Insight[] {
  if (dash.monthlyIncome <= 0 || dash.topExpenseCategories.length === 0) return [];

  const results: Insight[] = [];

  for (const cat of dash.topExpenseCategories) {
    const pct = (cat.amount / dash.monthlyIncome) * 100;
    if (pct >= 30) {
      results.push({
        id: `spend-alert-${cat.categoryId}`,
        label: cat.categoryName,
        detail: `${pct.toFixed(0)}% of income — consider reducing`,
        severity: 'danger'
      });
    } else if (pct >= 15) {
      results.push({
        id: `spend-alert-${cat.categoryId}`,
        label: cat.categoryName,
        detail: `${pct.toFixed(0)}% of income`,
        severity: 'warning'
      });
    } else {
      results.push({
        id: `spend-alert-${cat.categoryId}`,
        label: cat.categoryName,
        detail: `${pct.toFixed(0)}% of income`,
        severity: 'success'
      });
    }
  }

  return results;
}

/* ── Investment suggestion ── */
function deriveInvestmentSuggestion(dash: PersonalFinanceDashboardDto): Insight | null {
  if (dash.monthlyIncome <= 0) return null;
  const surplus = dash.monthlyIncome - dash.monthlyExpenses - dash.investmentContributions;
  if (surplus > 0) {
    /* Suggest investing 50% of remaining surplus */
    const suggestion = Math.round(surplus * 0.5);
    if (suggestion >= 1000) {
      return {
        id: 'invest-suggestion',
        label: 'Investment Opportunity',
        detail: `You can invest ${fmt(suggestion)} more this month`,
        severity: 'info'
      };
    }
  }
  if (dash.investmentContributions > 0 && surplus <= 0) {
    return {
      id: 'invest-maxed',
      label: 'Fully Allocated',
      detail: `All surplus is invested. Well done!`,
      severity: 'success'
    };
  }
  return null;
}

/* ── Key metrics ── */
function deriveKeyMetrics(dash: PersonalFinanceDashboardDto) {
  const savingsRate =
    dash.monthlyIncome > 0
      ? ((dash.monthlyIncome - dash.monthlyExpenses) / dash.monthlyIncome) * 100
      : 0;
  const emergencyMonths =
    dash.monthlyExpenses > 0 ? dash.totalBalance / dash.monthlyExpenses : 0;
  const investRate =
    dash.monthlyIncome > 0
      ? (dash.investmentContributions / dash.monthlyIncome) * 100
      : 0;
  return { savingsRate, emergencyMonths, investRate };
}

/* ═══════════════════════════════════════════
   Severity styling
   ═══════════════════════════════════════════ */

const SEV_BG: Record<InsightSeverity, string> = {
  success: 'bg-emerald-50 ring-emerald-100',
  warning: 'bg-amber-50 ring-amber-100',
  danger: 'bg-rose-50 ring-rose-100',
  info: 'bg-blue-50 ring-blue-100'
};

const SEV_DOT: Record<InsightSeverity, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-blue-400'
};

const SEV_TEXT: Record<InsightSeverity, string> = {
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
  info: 'text-blue-700'
};

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

function HealthMeter({ score, loading }: { score: number; loading?: boolean }) {
  const colour =
    score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-amber-500' : 'text-rose-500';
  const ringColour =
    score >= 70 ? 'stroke-emerald-400' : score >= 40 ? 'stroke-amber-400' : 'stroke-rose-400';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Fair' : 'Needs Attention';
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
          />
          {!loading && (
            <circle
              cx="50" cy="50" r="40"
              fill="none"
              className={ringColour}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s ease-out' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {loading ? (
            <div className="h-6 w-10 animate-pulse rounded bg-slate-100" />
          ) : (
            <>
              <span className={`text-2xl font-extrabold tabular-nums ${colour}`}>
                {score}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">/ 100</span>
            </>
          )}
        </div>
      </div>
      <span className={`text-xs font-bold ${loading ? 'text-slate-400' : colour}`}>
        {loading ? 'Calculating…' : label}
      </span>
    </div>
  );
}

function MetricRow(props: {
  label: string;
  value: string;
  severity: InsightSeverity;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs font-medium text-slate-500">{props.label}</span>
      {props.loading ? (
        <div className="relative h-3.5 w-16 overflow-hidden rounded bg-slate-100">
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </div>
      ) : (
        <span className={`text-xs font-bold tabular-nums ${SEV_TEXT[props.severity]}`}>
          {props.value}
        </span>
      )}
    </div>
  );
}

function InsightCard(props: { insight: Insight; index: number }) {
  const { insight: ins, index } = props;
  return (
    <div
      className={`animate-fade-in-up flex items-start gap-2.5 rounded-xl px-3 py-2.5 ring-1 transition-all duration-200 hover:shadow-sm ${SEV_BG[ins.severity]}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEV_DOT[ins.severity]}`} />
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-700 truncate">{ins.label}</p>
        <p className={`text-[11px] font-medium leading-snug ${SEV_TEXT[ins.severity]}`}>
          {ins.detail}
        </p>
      </div>
    </div>
  );
}

function BudgetWarningRow(props: { warning: BudgetWarning }) {
  const { warning: w } = props;
  const barPct = clamp(w.pct, 0, 100);
  const barColour = w.over
    ? 'bg-gradient-to-r from-rose-400 to-rose-500'
    : w.pct >= 80
      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
      : 'bg-gradient-to-r from-blue-400 to-blue-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">
          Category #{w.categoryId}
        </span>
        <span className={`text-[11px] font-bold tabular-nums ${w.over ? 'text-rose-600' : w.pct >= 80 ? 'text-amber-600' : 'text-slate-500'}`}>
          {fmt(w.spent)} / {fmt(w.budgetAmount)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColour}`}
          style={{ width: `${barPct}%` }}
        />
      </div>
    </div>
  );
}

function SectionTitle(props: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-1 pt-2">
      <span className="text-sm select-none">{props.icon}</span>
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {props.title}
      </h3>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════ */

export default function AIInsightsPanel({
  dashboard,
  incomeExpense,
  loading
}: AIInsightsPanelProps) {
  /* ── Budget data (loaded independently) ── */
  const [budgets, setBudgets] = useState<BudgetDto[]>([]);
  const [budgetTracking, setBudgetTracking] = useState<Map<number, BudgetTrackingDto[]>>(new Map());
  const [budgetsLoading, setBudgetsLoading] = useState(true);

  const loadBudgets = useCallback(async () => {
    setBudgetsLoading(true);
    try {
      const list = await getBudgets();
      setBudgets(list);
      const entries = await Promise.all(
        list.map(async (b) => {
          try {
            const tracking = await getBudgetTracking(b.id);
            return [b.id, tracking] as const;
          } catch {
            return [b.id, [] as BudgetTrackingDto[]] as const;
          }
        })
      );
      setBudgetTracking(new Map(entries));
    } catch {
      /* silently degrade — budget warnings just won't show */
    } finally {
      setBudgetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  /* ── Computed insights ── */
  const healthScore = useMemo(
    () => (dashboard ? computeHealthScore(dashboard, incomeExpense) : 0),
    [dashboard, incomeExpense]
  );

  const spendingAlerts = useMemo(
    () => (dashboard ? deriveSpendingAlerts(dashboard) : []),
    [dashboard]
  );

  const investSuggestion = useMemo(
    () => (dashboard ? deriveInvestmentSuggestion(dashboard) : null),
    [dashboard]
  );

  const metrics = useMemo(
    () =>
      dashboard
        ? deriveKeyMetrics(dashboard)
        : { savingsRate: 0, emergencyMonths: 0, investRate: 0 },
    [dashboard]
  );

  const budgetWarnings = useMemo<BudgetWarning[]>(() => {
    if (budgets.length === 0) return [];
    return budgets
      .map((b) => {
        const rows = budgetTracking.get(b.id) ?? [];
        const latest = rows.length > 0 ? rows[rows.length - 1] : null;
        const spent = latest?.spentAmount ?? 0;
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
        return {
          id: `bw-${b.id}`,
          categoryId: b.categoryId,
          budgetAmount: b.amount,
          spent,
          pct,
          over: latest?.isOverBudget ?? false
        };
      })
      .filter((w) => w.pct >= 50)
      .sort((a, b) => b.pct - a.pct);
  }, [budgets, budgetTracking]);

  const isLoading = loading || !dashboard;

  /* ── Skeleton ── */
  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60">
        <div className="flex items-center gap-2 mb-5">
          <div className="h-7 w-7 rounded-lg bg-slate-100 animate-pulse" />
          <div className="h-3.5 w-24 rounded bg-slate-100 animate-pulse" />
        </div>
        <div className="flex justify-center py-4">
          <HealthMeter score={0} loading />
        </div>
        <div className="mt-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="relative h-10 overflow-hidden rounded-xl bg-slate-50">
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-50 to-violet-100/60 text-violet-500 shadow-sm ring-1 ring-violet-100/80">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800">AI Insights</h2>
          <p className="text-[11px] text-slate-400">Smart analysis of your finances</p>
        </div>
      </div>

      <div className="space-y-1 px-5 py-4">
        {/* ── Health Score ── */}
        <SectionTitle icon="🫀" title="Financial Health" />
        <div className="flex justify-center py-2">
          <HealthMeter score={healthScore} />
        </div>

        {/* ── Key Metrics ── */}
        <div className="divide-y divide-slate-100 rounded-xl bg-slate-50/60 px-3 py-1">
          <MetricRow
            label="Savings Rate"
            value={`${metrics.savingsRate.toFixed(0)}%`}
            severity={metrics.savingsRate >= 20 ? 'success' : metrics.savingsRate > 0 ? 'warning' : 'danger'}
          />
          <MetricRow
            label="Emergency Fund"
            value={`${metrics.emergencyMonths.toFixed(1)} months`}
            severity={metrics.emergencyMonths >= 6 ? 'success' : metrics.emergencyMonths >= 3 ? 'warning' : 'danger'}
          />
          <MetricRow
            label="Invest Rate"
            value={`${metrics.investRate.toFixed(0)}%`}
            severity={metrics.investRate >= 10 ? 'success' : metrics.investRate > 0 ? 'info' : 'warning'}
          />
        </div>

        {/* ── Spending Alerts ── */}
        {spendingAlerts.length > 0 && (
          <>
            <SectionTitle icon="🔍" title="Spending Breakdown" />
            <div className="space-y-1.5">
              {spendingAlerts.map((a, i) => (
                <InsightCard key={a.id} insight={a} index={i} />
              ))}
            </div>
          </>
        )}

        {/* ── Budget Warnings ── */}
        {!budgetsLoading && budgetWarnings.length > 0 && (
          <>
            <SectionTitle icon="🚨" title="Budget Alerts" />
            <div className="space-y-2.5 rounded-xl bg-slate-50/60 px-3 py-2.5">
              {budgetWarnings.map((w) => (
                <BudgetWarningRow key={w.id} warning={w} />
              ))}
            </div>
          </>
        )}

        {!budgetsLoading && budgetWarnings.length === 0 && budgets.length > 0 && (
          <>
            <SectionTitle icon="✅" title="Budget Status" />
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50/60 px-3 py-2.5 ring-1 ring-emerald-100">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-[11px] font-semibold text-emerald-700">All budgets on track</p>
            </div>
          </>
        )}

        {/* ── Investment Suggestion ── */}
        {investSuggestion && (
          <>
            <SectionTitle icon="💰" title="Investment Tip" />
            <InsightCard insight={investSuggestion} index={0} />
          </>
        )}

        {/* ── Quick Summary ── */}
        <SectionTitle icon="📊" title="Monthly Summary" />
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30 px-3 py-3 ring-1 ring-slate-100">
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-4">
            <MiniStat label="Income" value={fmt(dashboard.monthlyIncome)} positive />
            <MiniStat label="Expenses" value={fmt(dashboard.monthlyExpenses)} />
            <MiniStat
              label="Savings"
              value={fmt(dashboard.monthlyIncome - dashboard.monthlyExpenses)}
              positive={dashboard.monthlyIncome >= dashboard.monthlyExpenses}
            />
            <MiniStat label="Invested" value={fmt(dashboard.investmentContributions)} positive />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {props.label}
      </p>
      <p className={`text-sm font-bold tabular-nums ${props.positive ? 'text-slate-800' : 'text-slate-600'}`}>
        {props.value}
      </p>
    </div>
  );
}
