using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalWalletService
    {
        Task<PersonalWallet> CreateWalletAsync(long userId, string name, string currency, CancellationToken ct);
        Task<PersonalWallet?> GetWalletAsync(long walletId, CancellationToken ct);
        Task<PersonalWallet?> GetWalletForUserAsync(long walletId, long userId, CancellationToken ct);
        Task<List<PersonalWallet>> GetAllWalletsAsync(CancellationToken ct);
        Task<List<PersonalWallet>> GetAllWalletsByUserAsync(long userId, CancellationToken ct);
        Task<decimal> GetWalletBalanceAsync(long walletId, CancellationToken ct);
        Task SetOpeningBalanceAsync(long walletId, long userId, decimal amount, DateTime date, CancellationToken ct);
    }
}
