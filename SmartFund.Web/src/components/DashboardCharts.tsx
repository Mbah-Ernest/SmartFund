import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import type { ReactNode } from 'react';
import InfoTooltip from '../modules/personalFinance/components/InfoTooltip';

type InsuranceBufferReportDto = {
  totalExposure: number;
  totalInsuranceReserve: number;
  coverageRatio: number;
};

type InvestorExposureRowDto = {
  investorId: number;
  fullName: string;
  email: string;
  trancheCount: number;
  totalPrincipal: number;
};

type UpcomingPayoutRowDto = {
  trancheId: number;
  trancheCode: string;
  investorId: number;
  investorName: string;
  maturityDate: string;
  principal: number;
  interestAmount: number;
  totalPayable: number;
};

type DealDto = {
  id: number;
  status: number;
};

type DashboardChartsProps = {
  loading: boolean;
  exposureRows: InvestorExposureRowDto[];
  upcomingRows: UpcomingPayoutRowDto[];
  insurance: InsuranceBufferReportDto | null;
  deals: DealDto[];
  formatCurrency: (amount: number) => string;
  formatPercent: (ratio: number) => string;
};

const COLORS = {
  primary: '#0f172a',
  blue: '#2563eb',
  sky: '#0ea5e9',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  slate200: '#e2e8f0',
  slate500: '#64748b'
};

function cardShell(title: string, subtitle: string, tooltip: string, children: ReactNode) {
  return (
    <div className="group rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 transition-shadow duration-300 hover:shadow-[0_4px_20px_rgba(59,130,246,0.08)] dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
            <InfoTooltip text={tooltip} />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function shortName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return fullName;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

export default function DashboardCharts({
  loading,
  exposureRows,
  upcomingRows,
  insurance,
  deals,
  formatCurrency,
  formatPercent
}: DashboardChartsProps) {
  const exposureSeries = [...exposureRows]
    .sort((a, b) => (b.totalPrincipal ?? 0) - (a.totalPrincipal ?? 0))
    .slice(0, 8)
    .map(r => ({
      name: shortName(r.fullName),
      amount: r.totalPrincipal ?? 0
    }));

  const payoutsByDate = (() => {
    const map = new Map<string, number>();
    for (const row of upcomingRows) {
      const key = new Date(row.maturityDate).toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + (row.totalPayable ?? 0));
    }

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([iso, total]) => ({
        date: new Date(iso).toLocaleDateString(undefined, {
          day: '2-digit',
          month: 'short'
        }),
        total
      }));
  })();

  const exposure = insurance?.totalExposure ?? 0;
  const reserve = insurance?.totalInsuranceReserve ?? 0;
  const uncovered = Math.max(exposure - reserve, 0);

  const coveragePie = [
    { name: 'Reserve', value: reserve },
    { name: 'Uncovered', value: uncovered }
  ].filter(x => x.value > 0);

  const activeDeals = deals.filter(d => d.status === 1).length;
  const closedDeals = deals.filter(d => d.status === 2).length;

  const dealPie = [
    { name: 'Active', value: activeDeals },
    { name: 'Closed', value: closedDeals }
  ].filter(x => x.value > 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {cardShell(
        'Exposure by Investor',
        'Top 8 investors by principal invested',
        'This chart shows which investors have the most money in the fund. Taller bars = more capital at risk. Helps you spot concentration risk — if one investor dominates, the fund is over-reliant on them.',
        <>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading…
              </div>
            ) : exposureSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No exposure data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exposureSeries} margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate200} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: COLORS.slate500, fontSize: 12 }}
                    interval={0}
                    angle={-15}
                    height={48}
                  />
                  <YAxis
                    tick={{ fill: COLORS.slate500, fontSize: 12 }}
                    tickFormatter={v => `${Math.round(Number(v) / 1_000_000)}M`}
                  />
                  <Tooltip
                    formatter={(value: unknown) =>
                      formatCurrency(Number(value ?? 0))
                    }
                  />
                  <Bar dataKey="amount" fill={COLORS.blue} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {cardShell(
        'Upcoming Payouts',
        'Next 30 days',
        'This area chart shows how much money needs to be paid out to investors over the next 30 days as their tranches mature. Peaks = busy payout days — make sure there is enough liquidity.',
        <>
          <div className="h-56">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading…
              </div>
            ) : payoutsByDate.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                No upcoming payouts.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payoutsByDate} margin={{ left: 8, right: 8 }}>
                  <defs>
                    <linearGradient id="payoutsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.emerald} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={COLORS.emerald} stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.slate200} />
                  <XAxis dataKey="date" tick={{ fill: COLORS.slate500, fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: COLORS.slate500, fontSize: 12 }}
                    tickFormatter={v => `${Math.round(Number(v) / 1_000_000)}M`}
                  />
                  <Tooltip
                    formatter={(value: unknown) =>
                      formatCurrency(Number(value ?? 0))
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={COLORS.emerald}
                    strokeWidth={2}
                    fill="url(#payoutsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {cardShell(
        'Insurance & Deals',
        `Coverage: ${formatPercent(insurance?.coverageRatio ?? 0)}`,
        'Insurance reserves act as a safety net. The donut chart shows how much investor exposure is covered. The small chart shows how many deals are active vs closed.',
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-40">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Loading…
                </div>
              ) : coveragePie.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No insurance data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={coveragePie}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={62}
                      paddingAngle={2}
                    >
                      {coveragePie.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={idx === 0 ? COLORS.sky : COLORS.slate200}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) =>
                        formatCurrency(Number(value ?? 0))
                      }
                    />
                    <Legend verticalAlign="bottom" height={24} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="space-y-2">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Exposure
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatCurrency(exposure)}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Reserve
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  {formatCurrency(reserve)}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Deals
                </div>

                <div className="mt-2 h-20">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Loading…
                    </div>
                  ) : dealPie.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      No deals.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={dealPie}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={22}
                          outerRadius={34}
                          paddingAngle={2}
                        >
                          {dealPie.map((d, idx) => (
                            <Cell
                              key={d.name}
                              fill={idx === 0 ? COLORS.amber : COLORS.rose}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {activeDeals} active · {closedDeals} closed
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
