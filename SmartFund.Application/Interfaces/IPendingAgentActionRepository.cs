using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Agent;

namespace SmartFund.Application.Interfaces
{
    public interface IPendingAgentActionRepository
    {
        Task<PendingAgentAction?> GetByIdAsync(Guid id, CancellationToken ct);
        Task AddAsync(PendingAgentAction action, CancellationToken ct);
        Task DeleteAsync(PendingAgentAction action, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
