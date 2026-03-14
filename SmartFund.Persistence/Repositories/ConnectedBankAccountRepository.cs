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
    public sealed class ConnectedBankAccountRepository : IConnectedBankAccountRepository
    {
        private readonly SmartFundDbContext _db;

        public ConnectedBankAccountRepository(SmartFundDbContext db) => _db = db;

        public Task<List<ConnectedBankAccount>> ListAsync(CancellationToken ct) =>
            _db.ConnectedBankAccounts.OrderBy(x => x.ConnectedAtUtc).ToListAsync(ct);

        public Task<ConnectedBankAccount?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.ConnectedBankAccounts.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<ConnectedBankAccount?> GetByMonoAccountIdAsync(string monoAccountId, CancellationToken ct) =>
            _db.ConnectedBankAccounts.FirstOrDefaultAsync(x => x.MonoAccountId == monoAccountId, ct);

        public Task<int> CountAsync(CancellationToken ct) =>
            _db.ConnectedBankAccounts.CountAsync(ct);

        public Task AddAsync(ConnectedBankAccount account, CancellationToken ct) =>
            _db.ConnectedBankAccounts.AddAsync(account, ct).AsTask();

        public Task RemoveAsync(ConnectedBankAccount account, CancellationToken ct)
        {
            _db.ConnectedBankAccounts.Remove(account);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
