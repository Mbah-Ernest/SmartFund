using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IInvestorRepository
    {
        Task AddAsync(Investor investor, CancellationToken ct);
        Task<Investor?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<Investor>> ListAsync(CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
