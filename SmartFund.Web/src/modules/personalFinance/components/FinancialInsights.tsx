import { useMemo } from 'react';
import type {
  PersonalFinanceDashboardDto,
  MonthlyIncomeExpense,
  CategoryAmountRow,
  FinancialInsight
} from '../types/financeTypes';

type FinancialInsightsProps = {
  dashboard: PersonalFinanceDashboardDto | null;
  incomeExpense: MonthlyIncomeExpense[];
  loading?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0
  }).format(n);
}

function pctChange(prev: number, curr: number): number | null {
  if (prev === 0) return curr > 0 ? 100 : null;
  return ((curr - prev) / prev) * 100;
}

function deriveInsights(
  dash: PersonalFinanceDashboardDto,
  ie: MonthlyIncomeExpense[]
): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const len = ie.length;

  /* ── Expense month-over-month ── */
  if (len >= 2) {
    const prev = ie[len - 2];
    const curr = ie[len - 1];
    const expChange = pctChange(prev.expenses, curr.expenses);
    if (expChange !== null) {
      if (expChange < 0) {
        insights.push({
          id: 'exp-down',
          icon: 'trending-down',
          message: `You spent ${Math.abs(expChange).toFixed(0)}% less this month compared to ${prev.month}.`,
          sentiment: 'positive'
        });
      } else if (expChange > 5) {
        insights.push({
          id: 'exp-up',
          icon: 'trending-up',
          message: `Your spending increased by ${expChange.toFixed(0)}% since ${prev.month}.`,
          sentiment: 'negative'
        });
      }
    }

    const incChange = pctChange(prev.income, curr.income);
    if (incChange !== null && incChange > 0) {
      insights.push({
        id: 'inc-up',
        icon: 'trending-up',
        message: `Income grew ${incChange.toFixed(0)}% from ${prev.month} to ${curr.month}.`,
        sentiment: 'positive'
      });
    }
  }

  /* ── Savings rate ── */
  if (dash.monthlyIncome > 0) {
    const savings = dash.monthlyIncome - dash.monthlyExpenses;
    const rate = (savings / dash.monthlyIncome) * 100;
    if (rate >= 20) {
      insights.push({
        id: 'savings-good',
        icon: 'star',
        message: `Great job! You're saving ${rate.toFixed(0)}% of your income this month.`,
        sentiment: 'positive'
      });
    } else if (rate > 0) {
      insights.push({
        id: 'savings-ok',
        icon: 'info',
        message: `You're saving ${rate.toFixed(0)}% of your income — aim for 20%+ for a healthy buffer.`,
        sentiment: 'neutral'
      });
    } else {
      insights.push({
        id: 'savings-neg',
        icon: 'alert',
        message: `You're spending more than you earn this month. Consider cutting discretionary costs.`,
        sentiment: 'negative'
      });
    }
  }

  /* ── Investment contributions ── */
  if (dash.investmentContributions > 0) {
    if (len >= 2) {
      const prevIncome = ie[len - 2].income;
      const currContrib = dash.investmentContributions;
      if (prevIncome > 0) {
        const ratio = (currContrib / prevIncome) * 100;
        insights.push({
          id: 'invest-ratio',
          icon: 'trending-up',
          message: `Your investment contributions represent ${ratio.toFixed(0)}% of last month's income.`,
          sentiment: ratio >= 10 ? 'positive' : 'neutral'
        });
      }
    } else {
      insights.push({
        id: 'invest-active',
        icon: 'star',
        message: `You've invested ${formatCurrency(dash.investmentContributions)} this month — keep it up!`,
        sentiment: 'positive'
      });
    }
  }

  /* ── Top expense category ── */
  if (dash.topExpenseCategories.length > 0) {
    const top: CategoryAmountRow = dash.topExpenseCategories.reduce(
      (a, b) => (b.amount > a.amount ? b : a),
      dash.topExpenseCategories[0]
    );
    insights.push({
      id: 'top-cat',
      icon: 'info',
      message: `${top.categoryName} is your highest spending category at ${formatCurrency(top.amount)}.`,
      sentiment: 'neutral'
    });
  }

  /* ── Balance check ── */
  if (dash.totalBalance > 0) {
    const monthsCovered =
      dash.monthlyExpenses > 0
        ? dash.totalBalance / dash.monthlyExpenses
        : 0;
    if (monthsCovered >= 6) {
      insights.push({
        id: 'emergency',
        icon: 'star',
        message: `Your balance covers ~${monthsCovered.toFixed(0)} months of expenses — solid emergency fund!`,
        sentiment: 'positive'
      });
    } else if (monthsCovered >= 3) {
      insights.push({
        id: 'emergency-ok',
        icon: 'info',
        message: `Your balance covers ~${monthsCovered.toFixed(0)} months of expenses. Aim for 6 months.`,
        sentiment: 'neutral'
      });
    }
  }

  return insights;
}

const ICON_MAP: Record<FinancialInsight['icon'], string> = {
  'trending-down': '📉',
  'trending-up': '📈',
  alert: '⚠️',
  info: '💡',
  star: '⭐'
};

const SENTIMENT_STYLES: Record<FinancialInsight['sentiment'], string> = {
  positive: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/50 dark:bg-emerald-950/30',
  negative: 'border-rose-200 bg-rose-50/60 dark:border-rose-800/50 dark:bg-rose-950/30',
  neutral: 'border-blue-200 bg-blue-50/60 dark:border-blue-800/50 dark:bg-blue-950/30'
};

const SENTIMENT_TEXT: Record<FinancialInsight['sentiment'], string> = {
  positive: 'text-emerald-800 dark:text-emerald-200',
  negative: 'text-rose-800 dark:text-rose-200',
  neutral: 'text-blue-800 dark:text-blue-200'
};

export default function FinancialInsights({
  dashboard,
  incomeExpense,
  loading
}: FinancialInsightsProps) {
  const insights = useMemo(() => {
    if (!dashboard) return [];
    return deriveInsights(dashboard, incomeExpense);
  }, [dashboard, incomeExpense]);

  if (loading) {
    return (
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="relative h-12 overflow-hidden rounded-xl bg-slate-100/80 dark:bg-slate-800/60">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-slate-700/60" style={{ animationDelay: `${i * 200}ms` }} />
          </div>
        ))}
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/40 px-4 py-3 dark:border-blue-900/40 dark:bg-blue-950/20">
        <span className="text-base select-none">✨</span>
        <p className="text-sm font-medium text-blue-700/80 dark:text-blue-300/80">Add more transactions to unlock personalised insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {insights.map((ins, idx) => (
        <div
          key={ins.id}
          className={`animate-fade-in-up flex items-start gap-3 rounded-xl border px-4 py-3.5 transition-all duration-300 hover:shadow-sm ${SENTIMENT_STYLES[ins.sentiment]}`}
          style={{ animationDelay: `${idx * 80}ms` }}
        >
          <span className="mt-0.5 text-base leading-none select-none">
            {ICON_MAP[ins.icon]}
          </span>
          <p className={`text-[13px] font-semibold leading-snug ${SENTIMENT_TEXT[ins.sentiment]}`}>
            {ins.message}
          </p>
        </div>
      ))}
    </div>
  );
}
