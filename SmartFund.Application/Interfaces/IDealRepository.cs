using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IDealRepository
    {
        Task AddAsync(Deal deal, CancellationToken ct);
        Task<Deal?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<Deal>> ListAsync(CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
