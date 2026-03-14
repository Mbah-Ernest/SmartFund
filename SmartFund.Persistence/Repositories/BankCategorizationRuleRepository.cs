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
    public sealed class BankCategorizationRuleRepository : IBankCategorizationRuleRepository
    {
        private readonly SmartFundDbContext _db;

        public BankCategorizationRuleRepository(SmartFundDbContext db) => _db = db;

        public Task<BankCategorizationRule?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.BankCategorizationRules.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<BankCategorizationRule>> ListActiveAsync(CancellationToken ct) =>
            _db.BankCategorizationRules
                .Where(x => x.IsActive)
                .OrderBy(x => x.Priority)
                .ToListAsync(ct);

        public Task<List<BankCategorizationRule>> ListAllAsync(CancellationToken ct) =>
            _db.BankCategorizationRules
                .OrderBy(x => x.Priority)
                .ThenBy(x => x.Id)
                .ToListAsync(ct);

        public Task AddAsync(BankCategorizationRule rule, CancellationToken ct) =>
            _db.BankCategorizationRules.AddAsync(rule, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
