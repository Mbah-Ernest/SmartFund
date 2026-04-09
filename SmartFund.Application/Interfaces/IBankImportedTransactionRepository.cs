using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface IBankImportedTransactionRepository
    {
        Task<BankImportedTransaction?> GetByIdAsync(long id, CancellationToken ct);
        Task<BankImportedTransaction?> GetByMonoTransactionIdAsync(string monoTransactionId, long connectedBankAccountId, CancellationToken ct);
        Task<BankImportedTransaction?> GetByHashAsync(string hash, CancellationToken ct);
        Task<List<BankImportedTransaction>> ListByStatusAsync(BankImportStatus status, CancellationToken ct);
        Task<List<BankImportedTransaction>> ListNeedsReviewAsync(int page, int pageSize, long userId, long? accountId, CancellationToken ct);
        Task<int> CountNeedsReviewAsync(long userId, CancellationToken ct);

        /// <summary>Returns NeedsReview + PairedTransfer items for the inbox view (paginated).</summary>
        Task<List<BankImportedTransaction>> ListInboxAsync(int page, int pageSize, long userId, long? accountId, CancellationToken ct);

        /// <summary>Finds unresolved imports from OTHER accounts that could be the opposite side of a transfer.</summary>
        Task<List<BankImportedTransaction>> FindPotentialPairsAsync(
            long excludeAccountId, long amountKobo, string oppositeDirection,
            DateTime transactionDateUtc, int windowDays, CancellationToken ct);

        Task<List<BankImportedTransaction>> ListByAccountAsync(long accountId, CancellationToken ct);
        Task DeleteByAccountAsync(long accountId, CancellationToken ct);
        Task AddAsync(BankImportedTransaction tx, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);

        /// <summary>Hard-deletes every row — used by the personal finance reset operation.</summary>
        Task DeleteAllAsync(CancellationToken ct);
    }
}
