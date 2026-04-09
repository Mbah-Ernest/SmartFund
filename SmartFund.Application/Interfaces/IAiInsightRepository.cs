using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IAiInsightRepository
    {
        Task<AiInsight?> GetLatestForUserAsync(long userId, CancellationToken ct);
        Task UpsertAsync(AiInsight insight, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
