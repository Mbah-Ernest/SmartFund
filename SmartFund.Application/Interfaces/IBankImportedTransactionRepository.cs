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
        Task<List<BankImportedTransaction>> ListNeedsReviewAsync(int page, int pageSize, long? accountId, CancellationToken ct);
        Task<int> CountNeedsReviewAsync(CancellationToken ct);
        Task<List<BankImportedTransaction>> ListByAccountAsync(long accountId, CancellationToken ct);
        Task AddAsync(BankImportedTransaction tx, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
