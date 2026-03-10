using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalWalletService
    {
        Task<PersonalWallet> CreateWalletAsync(string name, string currency, CancellationToken ct);
        Task<PersonalWallet?> GetWalletAsync(long walletId, CancellationToken ct);
        Task<List<PersonalWallet>> GetAllWalletsAsync(CancellationToken ct);
        Task<decimal> GetWalletBalanceAsync(long walletId, CancellationToken ct);
    }
}
