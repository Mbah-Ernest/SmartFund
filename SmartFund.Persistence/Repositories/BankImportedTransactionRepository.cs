using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class BankImportedTransactionRepository : IBankImportedTransactionRepository
    {
        private readonly SmartFundDbContext _db;

        public BankImportedTransactionRepository(SmartFundDbContext db) => _db = db;

        public Task<BankImportedTransaction?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.BankImportedTransactions.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<BankImportedTransaction?> GetByMonoTransactionIdAsync(
            string monoTransactionId, long connectedBankAccountId, CancellationToken ct) =>
            _db.BankImportedTransactions.FirstOrDefaultAsync(
                x => x.MonoTransactionId == monoTransactionId
                     && x.ConnectedBankAccountId == connectedBankAccountId, ct);

        public Task<BankImportedTransaction?> GetByHashAsync(string hash, CancellationToken ct) =>
            _db.BankImportedTransactions.FirstOrDefaultAsync(x => x.IdempotencyHash == hash, ct);

        public Task<List<BankImportedTransaction>> ListByStatusAsync(BankImportStatus status, CancellationToken ct) =>
            _db.BankImportedTransactions
                .Where(x => x.Status == status)
                .OrderByDescending(x => x.TransactionDateUtc)
                .ToListAsync(ct);

        public Task<List<BankImportedTransaction>> ListNeedsReviewAsync(
            int page, int pageSize, long? accountId, CancellationToken ct)
        {
            var query = _db.BankImportedTransactions
                .Where(x => x.Status == BankImportStatus.NeedsReview);

            if (accountId.HasValue)
                query = query.Where(x => x.ConnectedBankAccountId == accountId.Value);

            return query
                .OrderByDescending(x => x.TransactionDateUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);
        }

        public Task<int> CountNeedsReviewAsync(CancellationToken ct) =>
            _db.BankImportedTransactions.CountAsync(x => x.Status == BankImportStatus.NeedsReview, ct);

        public Task<List<BankImportedTransaction>> ListByAccountAsync(long accountId, CancellationToken ct) =>
            _db.BankImportedTransactions
                .Where(x => x.ConnectedBankAccountId == accountId)
                .OrderByDescending(x => x.TransactionDateUtc)
                .ToListAsync(ct);

        public Task AddAsync(BankImportedTransaction tx, CancellationToken ct) =>
            _db.BankImportedTransactions.AddAsync(tx, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);

        public Task DeleteAllAsync(CancellationToken ct) =>
            _db.BankImportedTransactions.ExecuteDeleteAsync(ct);
    }
}
