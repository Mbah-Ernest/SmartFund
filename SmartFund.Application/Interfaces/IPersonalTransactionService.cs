using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalTransactionService
    {
        Task<long> RecordIncomeAsync(
            long userId,
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct);

        Task<long> RecordExpenseAsync(
            long userId,
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct);

        Task<long> RecordTransferAsync(
            long userId,
            long sourceWalletId,
            long destinationWalletId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct);

        Task DeleteTransactionAsync(long userId, long transactionId, CancellationToken ct);

        Task<long> EditTransactionAsync(
            long userId,
            long transactionId,
            long categoryId,
            decimal amount,
            DateTime date,
            string? description,
            CancellationToken ct);
    }
}
