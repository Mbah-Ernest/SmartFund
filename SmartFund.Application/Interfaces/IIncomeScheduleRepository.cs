using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IIncomeScheduleRepository
    {
        Task<IncomeScheduleItem?> GetByIdAsync(long id, CancellationToken ct);
        Task<IncomeScheduleItem?> GetByIdForUserAsync(long id, long userId, CancellationToken ct);
        Task<List<IncomeScheduleItem>> ListByUserAsync(long userId, CancellationToken ct);
        Task<List<IncomeScheduleItem>> ListActiveByUserAsync(long userId, CancellationToken ct);
        Task AddAsync(IncomeScheduleItem item, CancellationToken ct);
        Task RemoveAsync(IncomeScheduleItem item, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
