using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface ILedgerTransactionRepository
    {
        Task<LedgerTransaction?> GetAsync(long id, CancellationToken ct);
        Task<List<LedgerTransaction>> ListAsync(CancellationToken ct);
        Task AddAsync(LedgerTransaction tx, CancellationToken ct);
        Task RemoveAsync(LedgerTransaction tx, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);

        Task<decimal> GetPostedBalanceForAccountAsync(long accountId, CancellationToken ct);

        Task<decimal> GetPostedNetForAccountAsync(
            long accountId,
            ReferenceType referenceType,
            long referenceId,
            CancellationToken ct);
    }
}