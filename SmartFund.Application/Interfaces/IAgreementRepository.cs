using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IAgreementRepository
    {
        Task<int?> GetLatestVersionAsync(long trancheId, CancellationToken ct);
        Task AddAsync(Agreement agreement, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
