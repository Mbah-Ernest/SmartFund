using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalTransactionService
    {
        Task<long> RecordIncomeAsync(
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct);

        Task<long> RecordExpenseAsync(
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct);

        Task<long> RecordTransferAsync(
            long sourceWalletId,
            long destinationWalletId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct);
    }
}
