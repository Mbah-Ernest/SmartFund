using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IInsuranceWalletRepository
    {
        Task<InsuranceWallet?> GetGlobalAsync(CancellationToken ct);
        Task<InsuranceWallet?> GetByDealIdAsync(long dealId, CancellationToken ct);
        Task AddAsync(InsuranceWallet wallet, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
