using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Reporting;
using SmartFund.Domain.Services;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Reporting
{
    public sealed class ReportingService : IReportingService
    {
        private readonly SmartFundDbContext _db;

        public ReportingService(SmartFundDbContext db) => _db = db;

        public async Task<List<InvestorExposureRow>> GetInvestorExposureAsync(CancellationToken ct)
        {
            return await (from t in _db.Tranches
                          join i in _db.Investors on t.InvestorId equals i.Id
                          group t by new { i.Id, i.FullName, i.Email }
                into g
                          orderby g.Key.FullName
                          select new InvestorExposureRow(
                              g.Key.Id,
                              g.Key.FullName,
                              g.Key.Email,
                              g.Count(),
                              g.Sum(x => x.Principal)))
                .ToListAsync(ct);
        }

        public async Task<List<UpcomingPayoutRow>> GetUpcomingPayoutsAsync(DateTime utcNow, int daysAhead, CancellationToken ct)
        {
            if (daysAhead <= 0) daysAhead = 30;

            var start = utcNow.Date;
            var end = utcNow.Date.AddDays(daysAhead);

            var rows = await (from t in _db.Tranches
                              join i in _db.Investors on t.InvestorId equals i.Id
                              where t.MaturityDate >= start && t.MaturityDate <= end
                              orderby t.MaturityDate
                              select new
                              {
                                  t.Id,
                                  t.TrancheCode,
                                  t.InvestorId,
                                  InvestorName = i.FullName,
                                  t.MaturityDate,
                                  t.Principal,
                                  t.RoiRate,
                                  t.RoiType,
                                  t.StartDate
                              })
                .ToListAsync(ct);

            var engine = RoiCalculationEngine.Default();

            return rows.Select(r =>
            {
                var calc = engine.Calculate(
                    principal: r.Principal,
                    rate: r.RoiRate,
                    startDate: r.StartDate,
                    maturityDate: r.MaturityDate,
                    roiType: r.RoiType);

                return new UpcomingPayoutRow(
                    TrancheId: r.Id,
                    TrancheCode: r.TrancheCode,
                    InvestorId: r.InvestorId,
                    InvestorName: r.InvestorName,
                    MaturityDate: r.MaturityDate,
                    Principal: r.Principal,
                    InterestAmount: calc.InterestAmount,
                    TotalPayable: calc.TotalPayable);
            }).ToList();
        }

        public async Task<InsuranceBufferReport> GetInsuranceBufferAsync(CancellationToken ct)
        {
            var exposure = await _db.Tranches.SumAsync(x => (decimal?)x.Principal, ct) ?? 0m;
            var reserve = await _db.InsuranceWallets.SumAsync(x => (decimal?)x.Balance, ct) ?? 0m;

            var ratio = exposure <= 0m ? 0m : decimal.Round(reserve / exposure, 6);

            return new InsuranceBufferReport(
                TotalExposure: exposure,
                TotalInsuranceReserve: reserve,
                CoverageRatio: ratio);
        }
    }
}
