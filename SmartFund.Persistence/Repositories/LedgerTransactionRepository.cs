using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;
using System.Collections.Generic;
using System.Linq;
using SmartFund.Domain.Enums;

namespace SmartFund.Persistence.Repositories
{
    public sealed class LedgerTransactionRepository : ILedgerTransactionRepository
    {
        private readonly SmartFundDbContext _db;

        public LedgerTransactionRepository(SmartFundDbContext db) => _db = db;

        public Task<LedgerTransaction?> GetAsync(long id, CancellationToken ct) =>
            _db.LedgerTransactions.Include(x => x.Entries).FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<LedgerTransaction>> ListAsync(CancellationToken ct) =>
            _db.LedgerTransactions
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task AddAsync(LedgerTransaction tx, CancellationToken ct) =>
            _db.LedgerTransactions.AddAsync(tx, ct).AsTask();

        public Task RemoveAsync(LedgerTransaction tx, CancellationToken ct)
        {
            _db.LedgerTransactions.Remove(tx);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);

        public async Task<decimal> GetPostedBalanceForAccountAsync(long accountId, CancellationToken ct)
        {
            // Balance = Debits - Credits for the specified account (draft + posted transactions).
            var entries = _db.LedgerTransactions
                .Where(t => t.Status == TransactionStatus.Draft || t.Status == TransactionStatus.Posted)
                .SelectMany(t => t.Entries)
                .Where(e => e.AccountId == accountId);

            var debit = await entries.SumAsync(e => (decimal?)e.Debit.Amount, ct) ?? 0m;
            var credit = await entries.SumAsync(e => (decimal?)e.Credit.Amount, ct) ?? 0m;

            return debit - credit;
        }

        public async Task<decimal> GetPostedNetForAccountAsync(
            long accountId,
            ReferenceType referenceType,
            long referenceId,
            CancellationToken ct)
        {
            // Net = Credits - Debits for the specified account, scoped to posted transactions with the given reference.
            var entries = _db.LedgerTransactions
                .Where(t =>
                    t.Status == TransactionStatus.Posted &&
                    t.ReferenceType == referenceType &&
                    t.ReferenceId == referenceId)
                .SelectMany(t => t.Entries)
                .Where(e => e.AccountId == accountId);

            var credit = await entries.SumAsync(e => (decimal?)e.Credit.Amount, ct) ?? 0m;
            var debit = await entries.SumAsync(e => (decimal?)e.Debit.Amount, ct) ?? 0m;

            return credit - debit;
        }
    }
}