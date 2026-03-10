using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class LedgerAccountRepository : ILedgerAccountRepository
    {
        private readonly SmartFundDbContext _db;
        public LedgerAccountRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(LedgerAccount account, CancellationToken ct) =>
            _db.LedgerAccounts.AddAsync(account, ct).AsTask();

        public Task<LedgerAccount?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.LedgerAccounts.FirstOrDefaultAsync(a => a.Id == id, ct);

        public Task<List<LedgerAccount>> ListAsync(CancellationToken ct) =>
            _db.LedgerAccounts.OrderBy(a => a.Type).ThenBy(a => a.Name).ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
    }
}