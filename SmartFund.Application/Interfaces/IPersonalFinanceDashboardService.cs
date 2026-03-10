using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Reporting.PersonalFinance;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalFinanceDashboardService
    {
        Task<PersonalFinanceDashboardDto> GetAsync(DateTime utcNow, CancellationToken ct);
    }
}
