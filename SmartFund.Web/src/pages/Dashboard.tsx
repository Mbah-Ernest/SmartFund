import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../components/StatCard';
import DashboardCharts from '../components/DashboardCharts';
import InfoTooltip from '../modules/personalFinance/components/InfoTooltip';
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
            <h1 className="text-[26px] font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Investment Dashboard
            </h1>
            {lastUpdatedAt ? (
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Last updated {lastUpdatedAt.toLocaleString()}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:shadow-none"
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-rose-50/60 px-5 py-4 shadow-sm dark:border-rose-900/50 dark:from-rose-950/30 dark:to-rose-950/20">
          <span className="text-rose-500">⚠</span>
          <div>
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Something went wrong</p>
            <p className="mt-0.5 text-sm text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Total Investor Funds"
          value={formatCurrency(totalInvestorFunds)}
          caption="Total principal exposure"
          description="The total amount of money all investors have put into active tranches. This is how much capital the fund is managing."
          loading={loading}
        />

        <StatCard
          title="Total Deals"
          value={dealCount.toLocaleString()}
          caption="Created in the system"
          description="A deal is a loan or investment opportunity. Deals group related tranches together — think of them as 'projects' investors fund."
          loading={loading}
        />

        <StatCard
          title="Active Tranches"
          value={trancheCount.toLocaleString()}
          caption="Total tranches across investors"
          description="A tranche is a single funded slice of a deal. Each investor's money goes into a tranche with its own terms (rate, dates, etc)."
          loading={loading}
        />

        <StatCard
          title="Insurance Coverage"
          value={formatPercent(insuranceCoverageRatio)}
          caption={`Reserve: ${formatCurrency(insuranceReserve)}`}
          description="Insurance coverage is the safety net. It shows what % of total investor exposure is backed by insurance reserves. 100% = fully protected."
          loading={loading}
        />

        <StatCard
          title="Upcoming Payouts"
          value={formatCurrency(upcomingTotalPayable)}
          caption={`${upcoming.length.toLocaleString()} tranche(s) in next 30 days`}
          description="Money the fund needs to pay back to investors in the next 30 days — principal + interest on maturing tranches."
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

      <section className="rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(59,130,246,0.04)] ring-1 ring-slate-200/60 dark:bg-slate-900 dark:ring-slate-800">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Upcoming Payouts (next 30 days)
            </h2>
            <InfoTooltip text="These are tranches that will mature soon. When a tranche matures, the fund pays the investor back their principal + earned interest." />
          </div>
          <p className="mt-0.5 text-xs text-slate-400">Tranches maturing soon — principal + interest owed to investors</p>
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
