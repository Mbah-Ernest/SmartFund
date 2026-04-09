using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class NullPersonalBudgetRepository : IPersonalBudgetRepository
{
    public Task<Budget?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<Budget?>(null);
    public Task<Budget?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) => Task.FromResult<Budget?>(null);
    public Task<List<Budget>> ListAsync(CancellationToken ct) => Task.FromResult(new List<Budget>());
    public Task<List<Budget>> ListByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<Budget>());
    public Task<Budget?> GetByCategoryAsync(long categoryId, BudgetPeriod period, CancellationToken ct) => Task.FromResult<Budget?>(null);
    public Task<Budget?> GetByCategoryForUserAsync(long userId, long categoryId, BudgetPeriod period, CancellationToken ct) => Task.FromResult<Budget?>(null);
    public Task AddAsync(Budget budget, CancellationToken ct) => Task.CompletedTask;
    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}

internal sealed class NullPersonalBudgetTrackingRepository : IPersonalBudgetTrackingRepository
{
    public Task<BudgetTracking?> GetAsync(long budgetId, int year, int month, CancellationToken ct) => Task.FromResult<BudgetTracking?>(null);
    public Task<List<BudgetTracking>> ListByBudgetIdAsync(long budgetId, CancellationToken ct) => Task.FromResult(new List<BudgetTracking>());
    public Task AddAsync(BudgetTracking tracking, CancellationToken ct) => Task.CompletedTask;
    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
