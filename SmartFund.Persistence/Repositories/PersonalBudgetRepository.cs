using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;
using SmartFund.Persistence.DbContext;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PersonalBudgetRepository : IPersonalBudgetRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalBudgetRepository(SmartFundDbContext db) => _db = db;

        public Task<Budget?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Set<Budget>().FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<Budget?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) =>
            _db.Set<Budget>().FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

        public Task<List<Budget>> ListAsync(CancellationToken ct) =>
            _db.Set<Budget>()
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task<List<Budget>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.Set<Budget>()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task<Budget?> GetByCategoryAsync(long categoryId, BudgetPeriod period, CancellationToken ct) =>
            _db.Set<Budget>().FirstOrDefaultAsync(x => x.CategoryId == categoryId && x.Period == period, ct);

        public Task<Budget?> GetByCategoryForUserAsync(long userId, long categoryId, BudgetPeriod period, CancellationToken ct) =>
            _db.Set<Budget>().FirstOrDefaultAsync(x => x.UserId == userId && x.CategoryId == categoryId && x.Period == period, ct);

        public Task AddAsync(Budget budget, CancellationToken ct) =>
            _db.Set<Budget>().AddAsync(budget, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
