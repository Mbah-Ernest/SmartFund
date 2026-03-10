using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Reporting;

namespace SmartFund.Application.Interfaces
{
    public interface IReportingService
    {
        Task<List<InvestorExposureRow>> GetInvestorExposureAsync(CancellationToken ct);

        Task<List<UpcomingPayoutRow>> GetUpcomingPayoutsAsync(DateTime utcNow, int daysAhead, CancellationToken ct);

        Task<InsuranceBufferReport> GetInsuranceBufferAsync(CancellationToken ct);
    }
}
