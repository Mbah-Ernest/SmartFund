using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalInvestmentContributionService
    {
        Task<long> ContributeAsync(
            long walletId,
            long trancheId,
            decimal amount,
            string? description,
            CancellationToken ct);
    }
}
