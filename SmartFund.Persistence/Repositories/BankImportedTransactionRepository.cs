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
            int page, int pageSize, long userId, long? accountId, CancellationToken ct)
        {
            var userAccountIds = _db.ConnectedBankAccounts
                .Where(a => a.UserId == userId)
                .Select(a => a.Id);

            var query = _db.BankImportedTransactions
                .Where(x => x.Status == BankImportStatus.NeedsReview
                         && userAccountIds.Contains(x.ConnectedBankAccountId));

            if (accountId.HasValue)
                query = query.Where(x => x.ConnectedBankAccountId == accountId.Value);

            return query
                .OrderByDescending(x => x.TransactionDateUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);
        }

        public Task<int> CountNeedsReviewAsync(long userId, CancellationToken ct)
        {
            var userAccountIds = _db.ConnectedBankAccounts
                .Where(a => a.UserId == userId)
                .Select(a => a.Id);

            return _db.BankImportedTransactions
                .CountAsync(x => x.Status == BankImportStatus.NeedsReview
                              && userAccountIds.Contains(x.ConnectedBankAccountId), ct);
        }

        public Task<List<BankImportedTransaction>> ListInboxAsync(
            int page, int pageSize, long userId, long? accountId, CancellationToken ct)
        {
            var userAccountIds = _db.ConnectedBankAccounts
                .Where(a => a.UserId == userId)
                .Select(a => a.Id);

            var query = _db.BankImportedTransactions
                .Where(x => x.Status == BankImportStatus.NeedsReview
                         || x.Status == BankImportStatus.PairedTransfer)
                .Where(x => userAccountIds.Contains(x.ConnectedBankAccountId));

            if (accountId.HasValue)
                query = query.Where(x => x.ConnectedBankAccountId == accountId.Value);

            return query
                .OrderByDescending(x => x.TransactionDateUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);
        }

        public Task<List<BankImportedTransaction>> FindPotentialPairsAsync(
            long excludeAccountId, long amountKobo, string oppositeDirection,
            DateTime transactionDateUtc, int windowDays, CancellationToken ct)
        {
            var from = transactionDateUtc.AddDays(-windowDays);
            var to = transactionDateUtc.AddDays(windowDays);

            return _db.BankImportedTransactions
                .Where(x => x.ConnectedBankAccountId != excludeAccountId
                         && x.AmountKobo == amountKobo
                         && x.Direction == oppositeDirection
                         && x.TransactionDateUtc >= from
                         && x.TransactionDateUtc <= to
                         && x.Status == BankImportStatus.NeedsReview
                         && x.TransferPairImportId == null)
                .OrderByDescending(x => x.TransactionDateUtc)
                .ToListAsync(ct);
        }

        public Task<List<BankImportedTransaction>> ListByAccountAsync(long accountId, CancellationToken ct) =>
            _db.BankImportedTransactions
                .Where(x => x.ConnectedBankAccountId == accountId)
                .OrderByDescending(x => x.TransactionDateUtc)
                .ToListAsync(ct);

        public Task DeleteByAccountAsync(long accountId, CancellationToken ct) =>
            _db.BankImportedTransactions
                .Where(x => x.ConnectedBankAccountId == accountId)
                .ExecuteDeleteAsync(ct);

        public Task AddAsync(BankImportedTransaction tx, CancellationToken ct) =>
            _db.BankImportedTransactions.AddAsync(tx, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);

        public Task DeleteAllAsync(CancellationToken ct) =>
            _db.BankImportedTransactions.ExecuteDeleteAsync(ct);
    }
}
