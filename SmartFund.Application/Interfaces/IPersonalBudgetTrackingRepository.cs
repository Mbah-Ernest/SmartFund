using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalBudget.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalBudgetTrackingRepository
    {
        Task<BudgetTracking?> GetAsync(long budgetId, int year, int month, CancellationToken ct);
        Task<List<BudgetTracking>> ListByBudgetIdAsync(long budgetId, CancellationToken ct);
        Task AddAsync(BudgetTracking tracking, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
