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
    public sealed class PersonalTransactionRepository : IPersonalTransactionRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalTransactionRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(PersonalTransaction tx, CancellationToken ct) =>
            _db.PersonalTransactions.AddAsync(tx, ct).AsTask();

        public Task<PersonalTransaction?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.PersonalTransactions.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<PersonalTransaction>> ListByWalletIdAsync(long walletId, CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(x => x.WalletId == walletId)
                .OrderByDescending(x => x.Date)
                .ThenByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task<List<PersonalTransaction>> ListAllAsync(CancellationToken ct) =>
            _db.PersonalTransactions
                .OrderByDescending(x => x.Date)
                .ThenByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);

        public Task<List<PersonalTransaction>> ListBankDerivedAsync(CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.SourceBankImportedTransactionId != null)
                .ToListAsync(ct);
    }
}
