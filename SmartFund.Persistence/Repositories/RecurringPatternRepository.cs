using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class RecurringPatternRepository : IRecurringPatternRepository
    {
        private readonly SmartFundDbContext _db;
        public RecurringPatternRepository(SmartFundDbContext db) => _db = db;

        public Task<List<RecurringPattern>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.RecurringPatterns.Where(x => x.UserId == userId).ToListAsync(ct);

        public Task<RecurringPattern?> FindByUserAndDescriptionAsync(long userId, string description, CancellationToken ct) =>
            _db.RecurringPatterns.FirstOrDefaultAsync(pattern => pattern.UserId == userId && pattern.Description == description, ct);

        public Task AddAsync(RecurringPattern pattern, CancellationToken ct) =>
            _db.RecurringPatterns.AddAsync(pattern, ct).AsTask();

        public Task DeleteAllForUserAsync(long userId, CancellationToken ct) =>
            _db.RecurringPatterns.Where(x => x.UserId == userId).ExecuteDeleteAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
    }
}
