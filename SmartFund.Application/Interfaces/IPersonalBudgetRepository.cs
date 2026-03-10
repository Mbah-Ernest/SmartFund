using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalBudgetRepository
    {
        Task<Budget?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<Budget>> ListAsync(CancellationToken ct);
        Task<Budget?> GetByCategoryAsync(long categoryId, BudgetPeriod period, CancellationToken ct);
        Task AddAsync(Budget budget, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
