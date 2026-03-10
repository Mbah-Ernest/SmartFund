using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Persistence.DbContext;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PersonalBudgetTrackingRepository : IPersonalBudgetTrackingRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalBudgetTrackingRepository(SmartFundDbContext db) => _db = db;

        public Task<BudgetTracking?> GetAsync(long budgetId, int year, int month, CancellationToken ct) =>
            _db.Set<BudgetTracking>().FirstOrDefaultAsync(x => x.BudgetId == budgetId && x.Year == year && x.Month == month, ct);

        public Task<List<BudgetTracking>> ListByBudgetIdAsync(long budgetId, CancellationToken ct) =>
            _db.Set<BudgetTracking>()
                .Where(x => x.BudgetId == budgetId)
                .OrderByDescending(x => x.Year)
                .ThenByDescending(x => x.Month)
                .ToListAsync(ct);

        public Task AddAsync(BudgetTracking tracking, CancellationToken ct) =>
            _db.Set<BudgetTracking>().AddAsync(tracking, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
