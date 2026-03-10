using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface ILedgerAccountRepository
    {
        Task AddAsync(LedgerAccount account, CancellationToken ct);
        Task<LedgerAccount?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<LedgerAccount>> ListAsync(CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}