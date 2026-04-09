using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Reporting.PersonalFinance;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalFinanceDashboardService
    {
        Task<PersonalFinanceDashboardDto> GetAsync(long userId, DateTime utcNow, CancellationToken ct);
        Task<CashRunwayDto> GetCashRunwayAsync(long userId, DateTime utcNow, CancellationToken ct);
    }
}
