import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import DashboardCharts from '../components/DashboardCharts';
import { getDeals } from '../api/dealsApi';
import { api } from '../api/axios';
import { toApiClientError } from '../api/apiError';
import type { DealDto, InsuranceBufferReportDto } from '../types/api';

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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 2
  }).format(amount);
}

function formatPercent(ratio: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(ratio);
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const [dealCount, setDealCount] = useState<number>(0);
  const [deals, setDeals] = useState<DealDto[]>([]);
  const [trancheCount, setTrancheCount] = useState<number>(0);
  const [insurance, setInsurance] = useState<InsuranceBufferReportDto | null>(
    null
  );
  const [exposureRows, setExposureRows] = useState<InvestorExposureRowDto[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingPayoutRowDto[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dealsRes, insuranceRes, exposureRes, upcomingRes] = await Promise.all([
        getDeals(),
        api.get<InsuranceBufferReportDto>('/reports/insurance-buffer'),
        api.get<InvestorExposureRowDto[]>('/reports/investor-exposure'),
        api.get<UpcomingPayoutRowDto[]>('/reports/upcoming-payouts', {
          params: { daysAhead: 30 }
        })
      ]);

      setDeals(dealsRes);
      setDealCount(dealsRes.length);
      setInsurance(insuranceRes.data);
      setExposureRows(exposureRes.data);

      const totalTranches = exposureRes.data.reduce(
        (sum, r) => sum + (r.trancheCount ?? 0),
        0
      );
      setTrancheCount(totalTranches);

      setUpcoming(upcomingRes.data);
      setLastUpdatedAt(new Date());
    } catch (e) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await load();
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [load]);

  const totalInvestorFunds = insurance?.totalExposure ?? 0;
  const insuranceReserve = insurance?.totalInsuranceReserve ?? 0;
  const insuranceCoverageRatio = insurance?.coverageRatio ?? 0;

  const upcomingTotalPayable = useMemo(() => {
    return upcoming.reduce((sum, r) => sum + (r.totalPayable ?? 0), 0);
  }, [upcoming]);

  const upcomingPreview = useMemo(() => upcoming.slice(0, 5), [upcoming]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Summary of key portfolio metrics
              {lastUpdatedAt
                ? ` (last updated ${lastUpdatedAt.toLocaleString()}).`
                : '.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total Investor Funds"
          value={formatCurrency(totalInvestorFunds)}
          caption="Total principal exposure"
          loading={loading}
        />

        <StatCard
          title="Total Deals"
          value={dealCount.toLocaleString()}
          caption="Created in the system"
          loading={loading}
        />

        <StatCard
          title="Active Tranches"
          value={trancheCount.toLocaleString()}
          caption="Total tranches across investors"
          loading={loading}
        />

        <StatCard
          title="Insurance Coverage"
          value={formatPercent(insuranceCoverageRatio)}
          caption={`Reserve: ${formatCurrency(insuranceReserve)}`}
          loading={loading}
        />

        <StatCard
          title="Upcoming Payouts"
          value={formatCurrency(upcomingTotalPayable)}
          caption={`${upcoming.length.toLocaleString()} tranche(s) in next 30 days`}
          loading={loading}
        />
      </div>

      <DashboardCharts
        loading={loading}
        exposureRows={exposureRows}
        upcomingRows={upcoming}
        insurance={insurance}
        deals={deals}
        formatCurrency={formatCurrency}
        formatPercent={formatPercent}
      />

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Upcoming payouts (next 30 days)
          </h2>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Tranche</th>
                <th className="px-4 py-3">Investor</th>
                <th className="px-4 py-3">Maturity</th>
                <th className="px-4 py-3 text-right">Total payable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : upcomingPreview.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-slate-500" colSpan={4}>
                    No upcoming payouts found.
                  </td>
                </tr>
              ) : (
                upcomingPreview.map(row => (
                  <tr key={row.trancheId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-50">
                      {row.trancheCode}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {row.investorName}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {new Date(row.maturityDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900 dark:text-slate-50">
                      {formatCurrency(row.totalPayable)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
          Values are based on API reports and may change as tranches are funded or
          paid out.
        </div>
      </section>
    </div>
  );
}
