using System;
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

        public Task RemoveAsync(PersonalTransaction tx, CancellationToken ct)
        {
            _db.PersonalTransactions.Remove(tx);
            return Task.CompletedTask;
        }

        public Task<List<PersonalTransaction>> ListByLedgerTransactionIdAsync(long ledgerTransactionId, CancellationToken ct) =>
            _db.PersonalTransactions.Where(t => t.LedgerTransactionId == ledgerTransactionId).ToListAsync(ct);

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

        public Task<List<PersonalTransaction>> ListByDateRangeAsync(DateTime from, DateTime to, CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.Date >= from.Date && t.Date <= to.Date)
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.Id)
                .ToListAsync(ct);

        public Task<List<PersonalTransaction>> ListRecentAsync(int take, CancellationToken ct) =>
            _db.PersonalTransactions
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.Id)
                .Take(take <= 0 ? 20 : take)
                .ToListAsync(ct);

        public Task<List<PersonalTransaction>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.Id)
                .ToListAsync(ct);

        public Task<List<PersonalTransaction>> ListByUserAndDateRangeAsync(long userId, DateTime from, DateTime to, CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.UserId == userId && t.Date >= from.Date && t.Date <= to.Date)
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.Id)
                .ToListAsync(ct);

        public Task<List<PersonalTransaction>> ListRecentByUserAsync(long userId, int take, CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ThenByDescending(t => t.Id)
                .Take(take <= 0 ? 20 : take)
                .ToListAsync(ct);

        public Task<List<PersonalTransaction>> ListBankDerivedByUserAsync(long userId, CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.UserId == userId && t.SourceBankImportedTransactionId != null)
                .ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);

        public Task<List<PersonalTransaction>> ListBankDerivedAsync(CancellationToken ct) =>
            _db.PersonalTransactions
                .Where(t => t.SourceBankImportedTransactionId != null)
                .ToListAsync(ct);
    }
}
